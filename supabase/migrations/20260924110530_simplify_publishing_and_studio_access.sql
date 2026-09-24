-- Accepted 2026-09-24: optional editorial metadata, direct publication, non-Admin Studio roles at AAL1.
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
    raise exception 'STUDIO_INVALID: Add article content before publishing.';
  end if;

end;
$$;

revoke all on function private.validate_article(jsonb, boolean)
from public, anon, authenticated;
create or replace function private.studio_command(p_article uuid,p_expected_version integer,p_action text,p_payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare a private.articles; r private.article_revisions; reason text; new_id uuid; before_state jsonb; oversight boolean; result jsonb;
begin
 oversight:=private.editorial_can('editor') or private.editorial_can('publisher');
 if not (private.editorial_can('writer') or oversight) then raise exception 'STUDIO_FORBIDDEN' using errcode='42501'; end if;
 if p_action='save_publish' then
   if p_article is null then
     result:=private.studio_command(null,null,'create',p_payload);
   else
     result:=private.studio_command(p_article,p_expected_version,'save',p_payload);
   end if;
   return private.studio_command((result->>'id')::uuid,(result->>'version')::integer,'publish','{}'::jsonb);
 end if;
 if p_action in ('create','save') then
   if coalesce(trim(p_payload->>'slug'),'')='' then
     p_payload:=jsonb_set(p_payload,'{slug}',to_jsonb(coalesce(nullif(left(trim(both '-' from regexp_replace(lower(p_payload->>'title'),'[^a-z0-9]+','-','g')),80),''),'article')||'-'||left(gen_random_uuid()::text,8)));
   end if;
 end if;
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

create or replace function private.current_access() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'active', coalesce((
      select a.status = 'active' and (u.banned_until is null or u.banned_until < now())
      and exists (select 1 from auth.sessions s where s.user_id = u.id and s.id::text = (auth.jwt()->>'session_id'))
      from private.accounts a join auth.users u on u.id = a.user_id where a.user_id = auth.uid()
    ), false),
    'verified', exists(select 1 from auth.users u where u.id = auth.uid() and u.email_confirmed_at is not null),
    'roles', coalesce((select jsonb_agg(r.role order by r.role) from private.role_grants r where r.user_id = auth.uid()), '[]'::jsonb),
    'mfa_exception', private.admin_mfa_exception_active(),
    'can_manage_mfa_exceptions', auth.uid() = (select primary_admin from private.access_policy where singleton),
    'mfa_required', not private.admin_mfa_exception_active() and (exists(select 1 from private.role_grants r where r.user_id = auth.uid() and r.role = 'admin')
      or (not exists(select 1 from private.role_grants r where r.user_id=auth.uid() and r.role in ('writer','editor','publisher')) and exists(select 1 from auth.mfa_factors f where f.user_id = auth.uid() and f.status = 'verified'))),
    'aal', case when auth.jwt()->>'aal' = 'aal2' and exists (
      select 1 from auth.mfa_factors f where f.user_id = auth.uid() and f.status = 'verified'
    ) then 'aal2' else 'aal1' end
  );
$$;
revoke all on function private.current_access() from public, anon, authenticated;
grant execute on function private.current_access() to authenticated;



-- Primary administrator only. Email resolves the target; authorization uses immutable UUIDs.
create function private.studio_access(p_email text default null,p_role text default null,p_revoke boolean default false) returns jsonb
language plpgsql security definer set search_path='' as $$
declare target uuid; changed integer;
begin
 if auth.uid() is null or not private.has_capability('admin') or not exists(select 1 from private.access_policy where primary_admin=auth.uid()) then
   raise exception 'STUDIO_FORBIDDEN' using errcode='42501';
 end if;
 if p_email is not null then
   if p_role is null or p_role not in ('writer','editor','publisher') or length(p_email)>320 or p_revoke is null then raise exception 'STUDIO_INVALID: Choose Writer, Editor or Publisher.'; end if;
   select id into target from auth.users where lower(email)=lower(trim(p_email));
   if target is null then raise exception 'STUDIO_INVALID: This person needs to create a PhoneFuturist account first.'; end if;
   if exists(select 1 from private.role_grants where user_id=target and role='admin') then raise exception 'STUDIO_INVALID: This account already has Admin access. Admin roles are managed separately.'; end if;
   if p_revoke then
     delete from private.role_grants where user_id=target and role=p_role;
   else
     insert into private.role_grants(user_id,role) values(target,p_role) on conflict do nothing;
   end if;
   get diagnostics changed=row_count;
   if changed>0 then
     insert into private.access_audit(subject_id,actor_id,action,reason) values(target,auth.uid(),case when p_revoke then 'studio_role_revoked' else 'studio_role_granted' end,p_role);
   end if;
 end if;
 return jsonb_build_object('members',coalesce((select jsonb_agg(member order by member.email,member.role) from (
   select r.user_id,u.email,r.role,r.granted_at,u.email_confirmed_at is not null as verified from private.role_grants r join auth.users u on u.id=r.user_id where r.role in ('writer','editor','publisher','admin')
 ) member),'[]'::jsonb),'activity',coalesce((select jsonb_agg(event order by event.recorded_at desc) from (
   select a.subject_id,u.email,a.actor_id,a.action,a.reason as role,a.recorded_at from private.access_audit a left join auth.users u on u.id=a.subject_id where a.action in ('studio_role_granted','studio_role_revoked') order by a.id desc limit 50
 ) event),'[]'::jsonb));
end;
$$;
revoke all on function private.studio_access(text,text,boolean) from public,anon,authenticated;
grant execute on function private.studio_access(text,text,boolean) to authenticated;
create function public.studio_access(p_email text default null,p_role text default null,p_revoke boolean default false) returns jsonb
language sql security invoker set search_path='' as $$ select private.studio_access(p_email,p_role,p_revoke); $$;
revoke all on function public.studio_access(text,text,boolean) from public,anon,authenticated;
grant execute on function public.studio_access(text,text,boolean) to authenticated;
