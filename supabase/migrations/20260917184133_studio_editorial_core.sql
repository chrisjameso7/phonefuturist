-- Native Studio core. Tables are private; all reads/writes go through scoped RPCs.
create table private.articles (
 id uuid primary key default gen_random_uuid(),
 creator_id uuid not null references auth.users(id),
 version integer not null default 0,
 current_revision integer not null default 0,
 state text not null default 'draft' check (state in ('draft','submitted','changes_requested','approved','published')),
 public_revision integer,
 canonical_path text unique,
 published_at timestamptz,
 withdrawn boolean not null default false,
 withdrawal_note text,
 updated_at timestamptz not null default now(),
 created_at timestamptz not null default now()
);
create table private.article_revisions (
 article_id uuid not null references private.articles(id), revision integer not null,
 created_by uuid not null references auth.users(id), created_at timestamptz not null default now(),
 payload jsonb not null, primary key(article_id, revision)
);
alter table private.articles add constraint public_revision_exists foreign key(id,public_revision) references private.article_revisions(article_id,revision);
create table private.article_events (
 id bigint generated always as identity primary key,
 article_id uuid not null references private.articles(id), revision integer not null,
 actor_id uuid not null references auth.users(id), action text not null,
 message text not null default '', recorded_at timestamptz not null default now()
);
create index articles_creator_updated on private.articles(creator_id,updated_at desc);
create index articles_updated on private.articles(updated_at desc);
create index article_events_article on private.article_events(article_id,id desc);
alter table private.articles enable row level security;
alter table private.article_revisions enable row level security;
alter table private.article_events enable row level security;
revoke all on private.articles,private.article_revisions,private.article_events from public,anon,authenticated;
revoke all on sequence private.article_events_id_seq from public,anon,authenticated;

create function private.editorial_can(capability text) returns boolean
language sql stable security invoker set search_path='' as $$
 select private.has_capability('admin') or private.has_capability(capability);
$$;
revoke all on function private.editorial_can(text) from public,anon,authenticated;

create function private.validate_article(p jsonb, submitting boolean) returns void
language plpgsql set search_path='' as $$
declare b jsonb; s jsonb;
begin
 if p is null or jsonb_typeof(p)<>'object' or octet_length(p::text)>262144
 or p->>'schemaVersion' is distinct from '1'
 or coalesce(length(trim(p->>'title')),0) not between 1 and 180
 or coalesce(length(p->>'summary'),0)>500
 or coalesce(length(p->>'byline'),0)>160
 or coalesce(p->>'section','') not in ('news','reports','leaks','analysis')
 or coalesce(p->>'slug','') !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or length(p->>'slug')>120
 or jsonb_typeof(p->'blocks') is distinct from 'array'
 or jsonb_typeof(p->'sources') is distinct from 'array'
 or coalesce(length(p->>'privateNotes'),0)>12000
 or coalesce(p->>'changeKind','') not in ('initial','minor','update','correction')
 or coalesce(length(p->>'correctionNote'),0)>2000 then
   raise exception 'STUDIO_INVALID: Check the article fields.';
 end if;
 if jsonb_array_length(p->'blocks')>100 or jsonb_array_length(p->'sources')>30 then
   raise exception 'STUDIO_INVALID: Too many blocks or sources.';
 end if;
 for b in select value from jsonb_array_elements(p->'blocks') loop
   if jsonb_typeof(b)<>'object' or coalesce(b->>'type','') not in ('paragraph','heading','quote','list','link')
   or jsonb_typeof(b->'text') is distinct from 'string' or length(b->>'text')>10000
   or (b->>'type'='link' and (coalesce(b->>'url','') !~ '^https://[^[:space:]<>]+$' or length(b->>'url')>2048)) then
     raise exception 'STUDIO_INVALID: Invalid content block.';
   end if;
 end loop;
 for s in select value from jsonb_array_elements(p->'sources') loop
   if jsonb_typeof(s)<>'object' or coalesce(length(trim(s->>'label')),0) not between 1 and 200
   or coalesce(s->>'url','') !~ '^https://[^[:space:]<>]+$' or length(s->>'url')>2048
   or coalesce(length(s->>'note'),0)>1000 then
     raise exception 'STUDIO_INVALID: Sources need a label and HTTPS URL.';
   end if;
 end loop;
 if submitting and (jsonb_array_length(p->'blocks')=0 or jsonb_array_length(p->'sources')=0
 or coalesce(length(trim(p->>'byline')),0)=0 or coalesce(length(trim(p->>'summary')),0)=0
 or not exists(select 1 from jsonb_array_elements(p->'blocks') as content_block(value) where length(trim(content_block.value->>'text'))>0)) then
   raise exception 'STUDIO_INVALID: Submission needs a byline, summary, body and at least one public source.';
 end if;
 if submitting and p->>'changeKind'='correction' and coalesce(length(trim(p->>'correctionNote')),0)<10 then
   raise exception 'STUDIO_INVALID: A material correction needs a public correction note.';
 end if;
end;
$$;
revoke all on function private.validate_article(jsonb,boolean) from public,anon,authenticated;

create function private.studio_command(p_article uuid,p_expected_version integer,p_action text,p_payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare a private.articles; r private.article_revisions; reason text; new_id uuid;
begin
 if not (private.editorial_can('writer') or private.editorial_can('editor') or private.editorial_can('publisher')) then
   raise exception 'STUDIO_FORBIDDEN: Verified staff access and required MFA are necessary.' using errcode='42501';
 end if;
 if p_action='create' then
   if not (private.editorial_can('writer') or private.editorial_can('editor')) then raise exception 'STUDIO_FORBIDDEN' using errcode='42501'; end if;
   perform private.validate_article(p_payload,false);
   insert into private.articles(creator_id,version,current_revision) values(auth.uid(),1,1) returning id into new_id;
   insert into private.article_revisions values(new_id,1,auth.uid(),now(),p_payload);
   insert into private.article_events(article_id,revision,actor_id,action) values(new_id,1,auth.uid(),'created');
   return jsonb_build_object('id',new_id,'version',1);
 end if;
 select * into a from private.articles where id=p_article for update;
 if not found or not (private.editorial_can('editor') or private.editorial_can('publisher') or (a.creator_id=auth.uid() and private.editorial_can('writer'))) then
   raise exception 'STUDIO_FORBIDDEN' using errcode='42501';
 end if;
 if a.version is distinct from p_expected_version then raise exception 'STUDIO_CONFLICT: This article changed. Reload before continuing.' using errcode='40001'; end if;
 select * into r from private.article_revisions where article_id=a.id and revision=a.current_revision;
 reason:=coalesce(p_payload->>'reason','');
 if length(reason)>2000 then raise exception 'STUDIO_INVALID: Note is too long.'; end if;
 if p_action='save' then
   if not(private.editorial_can('editor') or (a.creator_id=auth.uid() and private.editorial_can('writer'))) then raise exception 'STUDIO_FORBIDDEN' using errcode='42501'; end if;
   perform private.validate_article(p_payload,false);
   insert into private.article_revisions values(a.id,a.current_revision+1,auth.uid(),now(),p_payload);
   update private.articles set current_revision=current_revision+1,state='draft' where id=a.id;
 elsif p_action='submit' then
   if not(private.editorial_can('editor') or (a.creator_id=auth.uid() and private.editorial_can('writer'))) then raise exception 'STUDIO_FORBIDDEN' using errcode='42501'; end if;
   if a.state not in ('draft','changes_requested') then raise exception 'STUDIO_INVALID: Only a draft or requested revision can be submitted.'; end if;
   perform private.validate_article(r.payload,true);
   update private.articles set state='submitted' where id=a.id;
 elsif p_action in ('approve','request_changes') then
   if not private.editorial_can('editor') then raise exception 'STUDIO_FORBIDDEN' using errcode='42501'; end if;
   if a.state not in ('submitted','approved') then raise exception 'STUDIO_INVALID: Submit the revision before review.'; end if;
   if p_action='approve' then
     if a.creator_id=auth.uid() or exists(select 1 from private.article_revisions where article_id=a.id and created_by=auth.uid()) then raise exception 'STUDIO_SELF_APPROVAL: Another editor must approve this revision.' using errcode='42501'; end if;
     perform private.validate_article(r.payload,true);
     update private.articles set state='approved' where id=a.id;
   else
     if length(trim(reason))<5 then raise exception 'STUDIO_INVALID: Explain the changes requested.'; end if;
     update private.articles set state='changes_requested' where id=a.id;
   end if;
 elsif p_action in ('publish','override_publish') then
   if not private.editorial_can('publisher') then raise exception 'STUDIO_FORBIDDEN' using errcode='42501'; end if;
   if p_action='override_publish' then
     if not private.has_capability('admin') then raise exception 'STUDIO_FORBIDDEN' using errcode='42501'; end if;
     if length(trim(reason))<20 then raise exception 'STUDIO_INVALID: Explain the emergency override in at least 20 characters.'; end if;
   elsif a.state<>'approved' then raise exception 'STUDIO_INVALID: Publish only an approved revision.';
   end if;
   perform private.validate_article(r.payload,true);
   if a.public_revision is not null and r.payload->>'changeKind'='initial' then raise exception 'STUDIO_INVALID: Classify changes to an already published article.'; end if;
   update private.articles set public_revision=current_revision,
     canonical_path=coalesce(canonical_path,'/'||(r.payload->>'section')||'/'||(r.payload->>'slug')),
     published_at=coalesce(published_at,now()),withdrawn=false,withdrawal_note=null,state='published' where id=a.id;
 elsif p_action='withdraw' then
   if not private.editorial_can('publisher') then raise exception 'STUDIO_FORBIDDEN' using errcode='42501'; end if;
   if a.public_revision is null or length(trim(reason))<10 then raise exception 'STUDIO_INVALID: A published article and public withdrawal notice are required.'; end if;
   update private.articles set withdrawn=true,withdrawal_note=reason where id=a.id;
 else raise exception 'STUDIO_INVALID: Unknown action.';
 end if;
 update private.articles set version=version+1,updated_at=now() where id=a.id returning * into a;
 insert into private.article_events(article_id,revision,actor_id,action,message) values(a.id,a.current_revision,auth.uid(),p_action,reason);
 return jsonb_build_object('id',a.id,'version',a.version,'path',a.canonical_path);
end;
$$;
revoke all on function private.studio_command(uuid,integer,text,jsonb) from public,anon,authenticated;
grant execute on function private.studio_command(uuid,integer,text,jsonb) to authenticated;
create function public.studio_command(p_article uuid,p_expected_version integer,p_action text,p_payload jsonb) returns jsonb
language sql security invoker set search_path='' as $$ select private.studio_command(p_article,p_expected_version,p_action,p_payload); $$;
revoke all on function public.studio_command(uuid,integer,text,jsonb) from public,anon,authenticated;
grant execute on function public.studio_command(uuid,integer,text,jsonb) to authenticated;

create function private.studio_read(p_article uuid default null,p_offset integer default 0) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb; a private.articles;
begin
 if not (private.editorial_can('writer') or private.editorial_can('editor') or private.editorial_can('publisher')) then raise exception 'STUDIO_FORBIDDEN' using errcode='42501'; end if;
 if p_article is null then
   select coalesce(jsonb_agg(row),'[]'::jsonb) into result from (
     select a.id,a.version,a.current_revision,a.state,a.public_revision,a.canonical_path,a.withdrawn,a.updated_at,
       r.payload->>'title' as title,r.payload->>'section' as section
     from private.articles a join private.article_revisions r on r.article_id=a.id and r.revision=a.current_revision
     where a.creator_id=auth.uid() or private.editorial_can('editor') or private.editorial_can('publisher')
     order by a.updated_at desc,a.id limit 30 offset greatest(0,least(coalesce(p_offset,0),100000))
   ) row;
 else
   select * into a from private.articles where id=p_article;
   if not found or not (a.creator_id=auth.uid() or private.editorial_can('editor') or private.editorial_can('publisher')) then raise exception 'STUDIO_FORBIDDEN' using errcode='42501'; end if;
   select to_jsonb(a)||jsonb_build_object('payload',r.payload,'revision_author',r.created_by,
      'events',(select coalesce(jsonb_agg(e order by e.id desc),'[]'::jsonb) from (select revision,action,message,recorded_at,id from private.article_events where article_id=a.id order by id desc limit 50) e),
      'revisions',(select coalesce(jsonb_agg(h order by h.revision desc),'[]'::jsonb) from (select revision,created_at,payload->>'title' as title from private.article_revisions where article_id=a.id order by revision desc limit 50) h))
    into result from private.article_revisions r where r.article_id=a.id and r.revision=a.current_revision;
 end if;
 return result;
end;
$$;
revoke all on function private.studio_read(uuid,integer) from public,anon,authenticated;
grant execute on function private.studio_read(uuid,integer) to authenticated;
create function public.studio_read(p_article uuid default null,p_offset integer default 0) returns jsonb
language sql stable security invoker set search_path='' as $$ select private.studio_read(p_article,p_offset); $$;
revoke all on function public.studio_read(uuid,integer) from public,anon,authenticated;
grant execute on function public.studio_read(uuid,integer) to authenticated;

-- Anonymous reads return an explicit publication projection, never whole private rows.
create function private.public_articles(p_path text default null,p_offset integer default 0,p_section text default null) returns jsonb
language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(row),'[]'::jsonb) from (
  select a.id,a.canonical_path,a.published_at,r.created_at as updated_at,a.withdrawn,a.withdrawal_note,
    r.payload->>'title' as title,r.payload->>'byline' as byline,r.payload->>'section' as section,
    case when a.withdrawn then '' else r.payload->>'summary' end as summary,
    case when a.withdrawn or p_path is null then '[]'::jsonb else
      (select coalesce(jsonb_agg(jsonb_build_object('type',b->>'type','text',b->>'text','url',b->>'url')),'[]'::jsonb) from jsonb_array_elements(r.payload->'blocks') b) end as blocks,
    case when a.withdrawn or p_path is null then '[]'::jsonb else
      (select coalesce(jsonb_agg(jsonb_build_object('label',s->>'label','url',s->>'url','note',s->>'note')),'[]'::jsonb) from jsonb_array_elements(r.payload->'sources') s) end as sources,
    case when a.withdrawn then '' else r.payload->>'correctionNote' end as correction_note
   from private.articles a join private.article_revisions r on r.article_id=a.id and r.revision=a.public_revision
   where a.published_at is not null and (p_path is null or a.canonical_path=p_path) and (p_section is null or r.payload->>'section'=p_section)
   order by a.published_at desc,a.id limit 30 offset greatest(0,least(coalesce(p_offset,0),100000))
 ) row;
$$;
revoke all on function private.public_articles(text,integer,text) from public,anon,authenticated;
grant usage on schema private to anon;
grant execute on function private.public_articles(text,integer,text) to anon,authenticated;
create function public.public_articles(p_path text default null,p_offset integer default 0,p_section text default null) returns jsonb
language sql stable security invoker set search_path='' as $$ select private.public_articles(p_path,p_offset,p_section); $$;
revoke all on function public.public_articles(text,integer,text) from public,anon,authenticated;
grant execute on function public.public_articles(text,integer,text) to anon,authenticated;

