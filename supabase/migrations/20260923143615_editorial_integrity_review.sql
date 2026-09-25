-- Reconcile the approved direct-publication policy with repository replay.
create function private.editorial_https(value text) returns boolean
language sql immutable set search_path='' as $$
  select coalesce(value ~ '^https://[^[:space:]<>/@:]+(:[0-9]+)?([/?#][^[:space:]<>]*)?$' and length(value)<=2048,false);
$$;
revoke all on function private.editorial_https(text) from public,anon,authenticated;
create function private.validate_inline(parts jsonb) returns void
language plpgsql set search_path='' as $$
declare part jsonb; key text;
begin
  if jsonb_typeof(parts) is distinct from 'array' or jsonb_array_length(parts)>2000 then raise exception 'STUDIO_INVALID: Invalid formatted text.'; end if;
  for part in select value from jsonb_array_elements(parts) loop
    if jsonb_typeof(part)<>'object' or jsonb_typeof(part->'text') is distinct from 'string' or length(part->>'text')>10000 then raise exception 'STUDIO_INVALID: Invalid formatted text.'; end if;
    foreach key in array array['bold','italic','strike','code'] loop
      if part ? key and jsonb_typeof(part->key)<>'boolean' then raise exception 'STUDIO_INVALID: Invalid text mark.'; end if;
    end loop;
    if part ? 'href' and not private.editorial_https(part->>'href') then raise exception 'STUDIO_INVALID: Links must use HTTPS without credentials.'; end if;
    if exists(select 1 from jsonb_object_keys(part) k where k not in ('text','bold','italic','strike','code','href')) then raise exception 'STUDIO_INVALID: Unsupported formatted text field.'; end if;
  end loop;
end;
$$;
revoke all on function private.validate_inline(jsonb) from public,anon,authenticated;
alter table private.article_events add column previous_state jsonb, add column new_state jsonb;
create or replace function private.validate_article(p jsonb, submitting boolean)
returns void
language plpgsql
set search_path=''
as $$
declare
  b jsonb;
  s jsonb;
  block_type text;
  item jsonb;
  field text;
begin
  if p is null
    or jsonb_typeof(p) <> 'object'
    or octet_length(p::text) > 2097152
    or p->>'schemaVersion' is distinct from '1'
    or coalesce(length(trim(p->>'title')), 0) not between 1 and 180
    or coalesce(length(p->>'summary'), 0) > 500
    or coalesce(length(p->>'byline'), 0) > 160
    or coalesce(p->>'section', '') not in ('news', 'reports', 'leaks', 'analysis')
    or coalesce(p->>'slug', '') !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    or length(p->>'slug') > 120
    or jsonb_typeof(p->'blocks') is distinct from 'array'
    or jsonb_typeof(p->'sources') is distinct from 'array'
    or coalesce(length(p->>'privateNotes'), 0) > 12000
    or coalesce(p->>'changeKind', '') not in ('initial', 'minor', 'update', 'correction')
    or coalesce(length(p->>'correctionNote'), 0) > 2000
  then
    raise exception 'STUDIO_INVALID: Check the article fields.';
  end if;

  if jsonb_array_length(p->'blocks') > 500 then
    raise exception 'STUDIO_INVALID: Article content exceeds the 500-block limit.';
  end if;

  if jsonb_array_length(p->'sources') > 30 then
    raise exception 'STUDIO_INVALID: Article exceeds the 30-source limit.';
  end if;

  for b in
    select value
    from jsonb_array_elements(p->'blocks')
  loop
    if jsonb_typeof(b) <> 'object' then
      raise exception 'STUDIO_INVALID: Invalid content block.';
    end if;

    block_type := coalesce(b->>'type', '');

    if block_type not in (
      'paragraph',
      'heading',
      'quote',
      'list',
      'link',
      'image'
    ) then
      raise exception 'STUDIO_INVALID: Unsupported content block type.';
    end if;

    if b ? 'inline' then perform private.validate_inline(b->'inline'); end if;
    if b ? 'items' then
      if jsonb_typeof(b->'items') <> 'array' or jsonb_array_length(b->'items')>500 then raise exception 'STUDIO_INVALID: Invalid list items.'; end if;
      for item in select value from jsonb_array_elements(b->'items') loop perform private.validate_inline(item); end loop;
    end if;
    if b ? 'level' and b->>'level' not in ('2','3') then raise exception 'STUDIO_INVALID: Invalid heading level.'; end if;
    if b ? 'ordered' and jsonb_typeof(b->'ordered')<>'boolean' then raise exception 'STUDIO_INVALID: Invalid list style.'; end if;
    if block_type = 'image' then
      foreach field in array array['alt','caption','credit','sourceName','sourceUrl','rightsNote','ownership'] loop
        if b ? field and (jsonb_typeof(b->field)<>'string' or length(b->>field)>2048) then raise exception 'STUDIO_INVALID: Invalid image metadata.'; end if;
      end loop;
      if coalesce(b->>'sourceUrl','')<>'' and not private.editorial_https(b->>'sourceUrl') then raise exception 'STUDIO_INVALID: Image source needs an HTTPS URL.'; end if;
      if coalesce(b->>'ownership','') not in ('','external','phonefuturist') then raise exception 'STUDIO_INVALID: Invalid image ownership designation.'; end if;
      if submitting and (length(trim(coalesce(b->>'alt','')))=0 or
        (coalesce(b->>'ownership','')<>'phonefuturist' and length(trim(concat(b->>'credit',b->>'sourceName',b->>'sourceUrl',b->>'rightsNote')))=0)) then
        raise exception 'STUDIO_INVALID: Images need alt text and a credit, source or rights record before publication or review.';
      end if;
      if not private.editorial_https(b->>'url')
        or length(b->>'url') > 2048
        or coalesce(length(b->>'alt'), 0) > 1000
        or coalesce(length(b->>'caption'), 0) > 2000
      then
        raise exception 'STUDIO_INVALID: Invalid image block.';
      end if;
    else
      if jsonb_typeof(b->'text') is distinct from 'string'
        or length(b->>'text') > 10000
      then
        raise exception 'STUDIO_INVALID: Invalid content block.';
      end if;

      if block_type = 'link'
        and (
          coalesce(b->>'url', '') !~ '^https\://[^[:space:]<>]+$'
          or length(b->>'url') > 2048
        )
      then
        raise exception 'STUDIO_INVALID: Invalid link block.';
      end if;
    end if;
  end loop;

  for s in
    select value
    from jsonb_array_elements(p->'sources')
  loop
    if jsonb_typeof(s) <> 'object'
      or coalesce(length(trim(s->>'label')), 0) not between 1 and 200
      or not private.editorial_https(s->>'url')
      or length(s->>'url') > 2048
      or coalesce(length(s->>'note'), 0) > 1000
    then
      raise exception 'STUDIO_INVALID: Sources need a label and HTTPS URL.';
    end if;
  end loop;

  if submitting
    and (
      jsonb_array_length(p->'blocks') = 0
      or coalesce(length(trim(p->>'byline')), 0) = 0
      or coalesce(length(trim(p->>'summary')), 0) = 0
      or not exists (
        select 1
        from jsonb_array_elements(p->'blocks') as content_block(value)
        where
          (
            content_block.value->>'type' = 'image'
            and length(trim(coalesce(content_block.value->>'url', ''))) > 0
          )
          or length(trim(coalesce(content_block.value->>'text', ''))) > 0
      )
    )
  then
    raise exception 'STUDIO_INVALID: Submission needs a byline, summary and body.';
  end if;

  if submitting
    and p->>'changeKind' in ('correction','update')
    and coalesce(length(trim(p->>'correctionNote')), 0) < 10
  then
    raise exception 'STUDIO_INVALID: A material correction or update needs a public note.';
  end if;
end;
$$;

revoke all on function private.validate_article(jsonb, boolean)
from public, anon, authenticated;
create or replace function private.studio_command(p_article uuid,p_expected_version integer,p_action text,p_payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare a private.articles; r private.article_revisions; reason text; new_id uuid; before_state jsonb; oversight boolean;
begin
 oversight:=private.editorial_can('editor') or private.editorial_can('publisher');
 if not (private.editorial_can('writer') or oversight) then raise exception 'STUDIO_FORBIDDEN' using errcode='42501'; end if;
 if p_action='create' then
   perform private.validate_article(p_payload,false);
   insert into private.articles(creator_id,version,current_revision) values(auth.uid(),1,1) returning id into new_id;
   insert into private.article_revisions values(new_id,1,auth.uid(),now(),p_payload);
   insert into private.article_events(article_id,revision,actor_id,action,new_state)
     values(new_id,1,auth.uid(),'created',jsonb_build_object('state','draft','current_revision',1,'public_revision',null,'withdrawn',false));
   return jsonb_build_object('id',new_id,'version',1);
 end if;
 select * into a from private.articles where id=p_article for update;
 if not found or not (oversight or (a.creator_id=auth.uid() and private.editorial_can('writer'))) then raise exception 'STUDIO_FORBIDDEN' using errcode='42501'; end if;
 if a.version is distinct from p_expected_version then raise exception 'STUDIO_CONFLICT: This article changed. Reload before continuing.' using errcode='40001'; end if;
 before_state:=jsonb_build_object('state',a.state,'current_revision',a.current_revision,'public_revision',a.public_revision,'withdrawn',a.withdrawn);
 select * into r from private.article_revisions where article_id=a.id and revision=a.current_revision;
 reason:=coalesce(p_payload->>'reason','');
 if length(reason)>2000 then raise exception 'STUDIO_INVALID: Note is too long.'; end if;
 if p_action='save' then
   perform private.validate_article(p_payload,false);
   insert into private.article_revisions values(a.id,a.current_revision+1,auth.uid(),now(),p_payload);
   update private.articles set current_revision=current_revision+1,state='draft' where id=a.id;
 elsif p_action='submit' then
   if a.state not in ('draft','changes_requested') then raise exception 'STUDIO_INVALID: Only drafts can request review.'; end if;
   perform private.validate_article(r.payload,true);
   update private.articles set state='submitted' where id=a.id;
 elsif p_action in ('approve','request_changes') then
   if not oversight then raise exception 'STUDIO_FORBIDDEN' using errcode='42501'; end if;
   if a.state not in ('submitted','approved') then raise exception 'STUDIO_INVALID: Request review before recording a review decision.'; end if;
   if p_action='approve' then
     if a.creator_id=auth.uid() or exists(select 1 from private.article_revisions where article_id=a.id and created_by=auth.uid()) then raise exception 'STUDIO_SELF_APPROVAL: Another editor must approve this revision.' using errcode='42501'; end if;
     perform private.validate_article(r.payload,true);
     update private.articles set state='approved' where id=a.id;
   else
     if length(trim(reason))<5 then raise exception 'STUDIO_INVALID: Explain the changes requested.'; end if;
     update private.articles set state='changes_requested' where id=a.id;
   end if;
 elsif p_action='publish' then
   if a.public_revision=a.current_revision and not a.withdrawn then return jsonb_build_object('id',a.id,'version',a.version,'path',a.canonical_path); end if;
   perform private.validate_article(r.payload,true);
   if a.public_revision is not null and r.payload->>'changeKind'='initial' then raise exception 'STUDIO_INVALID: Classify changes to an already published article.'; end if;
   update private.articles set public_revision=current_revision,
     canonical_path=coalesce(canonical_path,'/'||(r.payload->>'section')||'/'||(r.payload->>'slug')),
     published_at=coalesce(published_at,now()),withdrawn=false,withdrawal_note=null,state='published' where id=a.id;
 elsif p_action='withdraw' then
   if a.public_revision is null or length(trim(reason))<10 then raise exception 'STUDIO_INVALID: A published article and public withdrawal notice are required.'; end if;
   update private.articles set withdrawn=true,withdrawal_note=reason where id=a.id;
 else raise exception 'STUDIO_INVALID: Unknown action.';
 end if;
 update private.articles set version=version+1,updated_at=now() where id=a.id returning * into a;
 insert into private.article_events(article_id,revision,actor_id,action,message,previous_state,new_state)
 values(a.id,a.current_revision,auth.uid(),p_action,reason,before_state,jsonb_build_object('state',a.state,'current_revision',a.current_revision,'public_revision',a.public_revision,'withdrawn',a.withdrawn));
 return jsonb_build_object('id',a.id,'version',a.version,'path',a.canonical_path);
end;
$$;
revoke all on function private.studio_command(uuid,integer,text,jsonb) from public,anon,authenticated;
grant execute on function private.studio_command(uuid,integer,text,jsonb) to authenticated;

-- Caller-scoped boolean helper; exposes no rows and retains all current_access checks.
grant execute on function private.editorial_can(text) to authenticated;

-- Restrictive policies remain effective even if a permissive policy exists in a dashboard.
create policy editorial_upload_boundary on storage.objects as restrictive for insert to authenticated
with check (bucket_id<>'article-media' or (
 (select private.editorial_can('writer') or private.editorial_can('editor') or private.editorial_can('publisher'))
 and split_part(name,'/',1)='articles' and split_part(name,'/',2)=(select auth.uid())::text
));
create policy editorial_upload_staff on storage.objects for insert to authenticated
with check (bucket_id='article-media' and
 (select private.editorial_can('writer') or private.editorial_can('editor') or private.editorial_can('publisher'))
 and split_part(name,'/',1)='articles' and split_part(name,'/',2)=(select auth.uid())::text);
create policy editorial_no_overwrite on storage.objects as restrictive for update to authenticated
using (bucket_id<>'article-media') with check(bucket_id<>'article-media');
create policy editorial_no_client_delete on storage.objects as restrictive for delete to authenticated
using (bucket_id<>'article-media');
-- Existing public URLs remain functional. Limit bucket listing to editorial staff.
create policy editorial_no_public_listing on storage.objects as restrictive for select to anon using(bucket_id<>'article-media');
create policy editorial_staff_listing on storage.objects as restrictive for select to authenticated
using(bucket_id<>'article-media' or (select private.editorial_can('writer') or private.editorial_can('editor') or private.editorial_can('publisher')));


-- Project only supported public text fields, including for legacy revisions written before validation.
create function private.public_inline(parts jsonb) returns jsonb
language sql immutable set search_path='' as $$
 select case when jsonb_typeof(parts)='array' then (
   select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
     'text',part->>'text',
     'bold',case when part->'bold'='true'::jsonb then true end,
     'italic',case when part->'italic'='true'::jsonb then true end,
     'strike',case when part->'strike'='true'::jsonb then true end,
     'code',case when part->'code'='true'::jsonb then true end,
     'href',case when private.editorial_https(part->>'href') then part->>'href' end
   ))),'[]'::jsonb) from jsonb_array_elements(parts) part
   where jsonb_typeof(part)='object' and jsonb_typeof(part->'text')='string'
 ) end;
$$;
revoke all on function private.public_inline(jsonb) from public,anon,authenticated;

create or replace function private.public_articles(p_path text default null,p_offset integer default 0,p_section text default null) returns jsonb
language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(row),'[]'::jsonb) from (
  select a.id,a.canonical_path,a.published_at,r.created_at as updated_at,a.withdrawn,a.withdrawal_note,
    r.payload->>'title' as title,r.payload->>'byline' as byline,r.payload->>'section' as section,
    case when a.withdrawn then '' else r.payload->>'summary' end as summary,
    case when a.withdrawn or p_path is null then '[]'::jsonb else
      (select coalesce(jsonb_agg(jsonb_build_object('type',b->>'type','text',b->>'text','url',b->>'url','alt',b->>'alt','caption',b->>'caption','credit',b->>'credit','sourceName',b->>'sourceName','sourceUrl',b->>'sourceUrl','rightsNote',b->>'rightsNote','ownership',b->>'ownership','inline',private.public_inline(b->'inline'),'items',case when jsonb_typeof(b->'items')='array' then (select jsonb_agg(private.public_inline(item)) from jsonb_array_elements(b->'items') item where jsonb_typeof(item)='array') end,'level',b->'level','ordered',b->'ordered')),'[]'::jsonb) from jsonb_array_elements(r.payload->'blocks') b) end as blocks,
    case when a.withdrawn or p_path is null then '[]'::jsonb else
      (select coalesce(jsonb_agg(jsonb_build_object('label',s->>'label','url',s->>'url','note',s->>'note')),'[]'::jsonb) from jsonb_array_elements(r.payload->'sources') s) end as sources,
    case when a.withdrawn then '' else r.payload->>'correctionNote' end as correction_note,
    case when a.withdrawn or p_path is null then '[]'::jsonb else (
      select coalesce(jsonb_agg(note order by note.recorded_at),'[]'::jsonb) from (
        select distinct e.revision,e.recorded_at,nr.payload->>'correctionNote' as message
        from private.article_events e join private.article_revisions nr on nr.article_id=e.article_id and nr.revision=e.revision
        where e.article_id=a.id and e.action in ('publish','override_publish') and length(trim(coalesce(nr.payload->>'correctionNote','')))>0
      ) note
    ) end as public_notes
   from private.articles a join private.article_revisions r on r.article_id=a.id and r.revision=a.public_revision
   where a.published_at is not null and (p_path is null or a.canonical_path=p_path) and (p_section is null or r.payload->>'section'=p_section)
   order by a.published_at desc,a.id limit 30 offset greatest(0,least(coalesce(p_offset,0),100000))
 ) row;
$$;
revoke all on function private.public_articles(text,integer,text) from public,anon,authenticated;
grant usage on schema private to anon;
grant execute on function private.public_articles(text,integer,text) to anon,authenticated;
create or replace function public.public_articles(p_path text default null,p_offset integer default 0,p_section text default null) returns jsonb
language sql stable security invoker set search_path='' as $$ select private.public_articles(p_path,p_offset,p_section); $$;
revoke all on function public.public_articles(text,integer,text) from public,anon,authenticated;
grant execute on function public.public_articles(text,integer,text) to anon,authenticated;


