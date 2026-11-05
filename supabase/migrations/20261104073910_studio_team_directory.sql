-- Team publication is independent of account roles and creator-owned profile data.
create table public.team_members (
 id uuid primary key default gen_random_uuid(),
 slug text not null unique check (length(slug) between 3 and 80 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
 user_id uuid references public.creator_profiles(user_id) on delete set null,
 name text not null check (length(trim(name)) between 1 and 120),
 title text not null check (length(trim(title)) between 1 and 120),
 bio text not null default '' check (length(bio)<=6000),
 responsibilities text not null default '' check (length(responsibilities)<=3000),
 interests text not null default '' check (length(interests)<=2000),
 image_url text not null default '' check (length(image_url)<=2000 and (image_url='' or image_url ~ '^https://[^[:space:]@/]+(/[^[:space:]]*)?$')),
 social_links jsonb not null default '[]',
 extra_details jsonb not null default '[]',
 published boolean not null default false,
 sort_order integer not null default 0 check (sort_order between 0 and 10000),
 version integer not null default 1,
 updated_at timestamptz not null default now()
);
alter table public.team_members enable row level security;
create index team_members_public_order on public.team_members(sort_order,name,id) where published;
create index team_members_user on public.team_members(user_id) where user_id is not null;
grant select on public.team_members to anon,authenticated;
grant insert,update,delete on public.team_members to authenticated;
create policy team_public_read on public.team_members for select to anon,authenticated using(published);
create policy team_admin_read on public.team_members for select to authenticated using((select private.has_capability('admin')));
create policy team_admin_insert on public.team_members for insert to authenticated with check((select private.has_capability('admin')));
create policy team_admin_update on public.team_members for update to authenticated using((select private.has_capability('admin'))) with check((select private.has_capability('admin')));
create policy team_admin_delete on public.team_members for delete to authenticated using((select private.has_capability('admin')));

create function private.validate_team_member() returns trigger language plpgsql set search_path='' as $$
declare item jsonb;
begin
 if jsonb_typeof(new.social_links)<>'array' or jsonb_array_length(new.social_links)>12
   or jsonb_typeof(new.extra_details)<>'array' or jsonb_array_length(new.extra_details)>20 then
  raise exception 'Invalid profile details.' using errcode='23514';
 end if;
 for item in select value from jsonb_array_elements(new.social_links) loop
  if jsonb_typeof(item)<>'object' or jsonb_typeof(item->'label') is distinct from 'string'
    or length(trim(item->>'label')) not between 1 and 80
    or jsonb_typeof(item->'url') is distinct from 'string'
    or length(item->>'url')>2000
    or not (item->>'url' ~ '^https://[^[:space:]@/]+(/[^[:space:]]*)?$') then
   raise exception 'Invalid social link.' using errcode='23514';
  end if;
 end loop;
 for item in select value from jsonb_array_elements(new.extra_details) loop
  if jsonb_typeof(item)<>'object' or jsonb_typeof(item->'label') is distinct from 'string'
    or length(trim(item->>'label')) not between 1 and 80
    or jsonb_typeof(item->'value') is distinct from 'string'
    or length(trim(item->>'value')) not between 1 and 2000 then
   raise exception 'Invalid extra detail.' using errcode='23514';
  end if;
 end loop;
 new.version:=case when tg_op='INSERT' then 1 else old.version+1 end;
 new.updated_at:=now();
 return new;
end;
$$;
revoke all on function private.validate_team_member() from public,anon,authenticated;
create trigger team_member_validation before insert or update on public.team_members
 for each row execute function private.validate_team_member();

-- Return only the same public article metadata readers can already access.
create function private.team_articles(p_slug text,p_offset integer default 0) returns jsonb
language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(row),'[]'::jsonb) from (
  select a.id,a.canonical_path,a.published_at,r.payload->>'title' as title,
    r.payload->>'section' as section,r.payload->>'summary' as summary,
    r.payload->>'byline' as byline
  from public.team_members t join private.articles a on a.creator_id=t.user_id
  join private.article_revisions r on r.article_id=a.id and r.revision=a.public_revision
  where t.slug=p_slug and t.published and a.published_at is not null and not a.withdrawn
  order by a.published_at desc,a.id limit 30 offset greatest(0,least(coalesce(p_offset,0),100000))
 ) row;
$$;
revoke all on function private.team_articles(text,integer) from public,anon,authenticated;
grant execute on function private.team_articles(text,integer) to anon,authenticated;
create function public.team_articles(p_slug text,p_offset integer default 0) returns jsonb
language sql stable security invoker set search_path='' as $$select private.team_articles(p_slug,p_offset);$$;
revoke all on function public.team_articles(text,integer) from public,anon,authenticated;
grant execute on function public.team_articles(text,integer) to anon,authenticated;
