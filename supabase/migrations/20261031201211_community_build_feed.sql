-- Isolated build-focused community storage; existing schemas/policies are unchanged.
create table public.community_posts (
 id uuid primary key default gen_random_uuid(),
 author_id uuid not null references public.creator_profiles(user_id) on delete cascade,
 simulation_id uuid not null references public.simulations(id) on delete cascade,
 caption text not null default '' check(char_length(caption)<=1000),
 created_at timestamptz not null default now()
);
create index community_posts_latest on public.community_posts(created_at desc,id desc);
create index community_posts_author on public.community_posts(author_id,created_at desc);
create index community_posts_build on public.community_posts(simulation_id);
create table public.community_replies (
 id uuid primary key default gen_random_uuid(),
 post_id uuid not null references public.community_posts(id) on delete cascade,
 author_id uuid not null references public.creator_profiles(user_id) on delete cascade,
 body text not null check(char_length(btrim(body)) between 1 and 600),
 created_at timestamptz not null default now()
);
create index community_replies_post on public.community_replies(post_id,created_at,id);
create index community_replies_author on public.community_replies(author_id,created_at desc);
create table public.community_likes (
 post_id uuid not null references public.community_posts(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(), primary key(post_id,user_id)
);
create index community_likes_user on public.community_likes(user_id);
create table public.community_follows (
 follower_id uuid not null references auth.users(id) on delete cascade,
 following_id uuid not null references public.creator_profiles(user_id) on delete cascade,
 created_at timestamptz not null default now(), primary key(follower_id,following_id),
 check(follower_id<>following_id)
);
create index community_follows_target on public.community_follows(following_id);
alter table public.community_posts enable row level security;
alter table public.community_replies enable row level security;
alter table public.community_likes enable row level security;
alter table public.community_follows enable row level security;
revoke all on public.community_posts,public.community_replies,public.community_likes,public.community_follows from public,anon,authenticated;
grant select on public.community_posts,public.community_replies,public.community_likes,public.community_follows to anon,authenticated;
grant insert(author_id,simulation_id,caption),delete on public.community_posts to authenticated;
grant insert(post_id,author_id,body),delete on public.community_replies to authenticated;
grant insert(post_id,user_id),delete on public.community_likes to authenticated;
grant insert(follower_id,following_id),delete on public.community_follows to authenticated;
create policy community_post_read on public.community_posts for select to anon,authenticated using(exists(select 1 from public.simulations s where s.id=simulation_id and s.visibility='public'));
create policy community_post_create on public.community_posts for insert to authenticated with check(
 author_id=(select auth.uid()) and ((select private.current_access())->>'active')::boolean and ((select private.current_access())->>'verified')::boolean
 and exists(select 1 from public.simulations s where s.id=simulation_id and s.owner_id=(select auth.uid()) and s.visibility='public'));
create policy community_post_delete on public.community_posts for delete to authenticated using(author_id=(select auth.uid()) or private.has_capability('admin'));
create policy community_reply_read on public.community_replies for select to anon,authenticated using(exists(select 1 from public.community_posts p where p.id=post_id));
create policy community_reply_create on public.community_replies for insert to authenticated with check(author_id=(select auth.uid()) and ((select private.current_access())->>'active')::boolean and ((select private.current_access())->>'verified')::boolean and exists(select 1 from public.community_posts p where p.id=post_id));
create policy community_reply_delete on public.community_replies for delete to authenticated using(author_id=(select auth.uid()) or private.has_capability('admin'));
create policy community_like_read on public.community_likes for select to anon,authenticated using(exists(select 1 from public.community_posts p where p.id=post_id));
create policy community_like_create on public.community_likes for insert to authenticated with check(user_id=(select auth.uid()) and ((select private.current_access())->>'active')::boolean and ((select private.current_access())->>'verified')::boolean and exists(select 1 from public.community_posts p where p.id=post_id));
create policy community_like_delete on public.community_likes for delete to authenticated using(user_id=(select auth.uid()));
create policy community_follow_read on public.community_follows for select to anon,authenticated using(true);
create policy community_follow_create on public.community_follows for insert to authenticated with check(follower_id=(select auth.uid()) and ((select private.current_access())->>'active')::boolean and ((select private.current_access())->>'verified')::boolean);
create policy community_follow_delete on public.community_follows for delete to authenticated using(follower_id=(select auth.uid()));
-- Bounds apply to direct Data API writes too. Per-author lock prevents concurrent bypass.
create function private.community_write_limit() returns trigger language plpgsql set search_path='' as $$
declare total integer;
begin
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(TG_TABLE_NAME||new.author_id::text));
 if TG_TABLE_NAME='community_posts' then
  select count(*) into total from public.community_posts where author_id=new.author_id and created_at>now()-interval '1 hour';
  if total>=10 then raise exception 'Posting limit reached. Please try later.' using errcode='P0001'; end if;
 else
  select count(*) into total from public.community_replies where author_id=new.author_id and created_at>now()-interval '1 minute';
  if total>=5 then raise exception 'Reply limit reached. Please try later.' using errcode='P0001'; end if;
 end if;
 return new;
end; $$;
revoke all on function private.community_write_limit() from public,anon,authenticated;
create trigger community_post_rate before insert on public.community_posts for each row execute function private.community_write_limit();
create trigger community_reply_rate before insert on public.community_replies for each row execute function private.community_write_limit();

create function public.community_people(p_ids uuid[]) returns jsonb language sql stable security invoker set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',c.user_id,'handle',c.handle,'name',c.display_name,'avatar',c.avatar_url,
 'role',case c.verification_badge when 'gold' then 'admin' when 'green' then 'writer' else case when exists(select 1 from public.user_badges b where b.user_id=c.user_id and b.badge_name='Pro') then 'pro' else 'user' end end,
 'followers',(select count(*) from public.community_follows f where f.following_id=c.user_id),
 'following',(select count(*) from public.community_follows f where f.follower_id=c.user_id),
 'followed',exists(select 1 from public.community_follows f where f.following_id=c.user_id and f.follower_id=auth.uid()))),'[]'::jsonb)
 from public.creator_profiles c where c.user_id=any(p_ids[1:50]);
$$;
create function public.community_feed(p_before timestamptz default null,p_before_id uuid default null) returns jsonb language sql stable security invoker set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'author_id',p.author_id,'caption',p.caption,'created_at',p.created_at,
 'build',jsonb_build_object('id',s.id,'name',s.name,'device',s.device_key,'processor',s.processor_key,'state',s.state,'results',s.result_snapshot),
 'likes',(select count(*) from public.community_likes l where l.post_id=p.id),
 'liked',exists(select 1 from public.community_likes l where l.post_id=p.id and l.user_id=auth.uid()),
 'replies',(select count(*) from public.community_replies r where r.post_id=p.id),
 'forks',(select count(*) from public.simulations f where f.forked_from=s.id and f.visibility='public')) order by p.created_at desc,p.id desc),'[]'::jsonb)
 from (select * from public.community_posts where p_before is null or (created_at,id)<(p_before,coalesce(p_before_id,'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid)) order by created_at desc,id desc limit 20) p
 join public.simulations s on s.id=p.simulation_id and s.visibility='public';
$$;
revoke all on function public.community_people(uuid[]),public.community_feed(timestamptz,uuid) from public,anon,authenticated;
grant execute on function public.community_people(uuid[]),public.community_feed(timestamptz,uuid) to anon,authenticated;

-- One transaction: a failed Community post never leaves a newly public build behind.
create function public.community_publish(p_build uuid,p_caption text) returns uuid language plpgsql security invoker set search_path='' as $$
declare post uuid;
begin
 if not exists(select 1 from public.simulations where id=p_build and owner_id=auth.uid()) then raise exception 'Build unavailable' using errcode='42501'; end if;
 update public.simulations set visibility='public' where id=p_build and owner_id=auth.uid() and visibility<>'public';
 insert into public.community_posts(author_id,simulation_id,caption) values(auth.uid(),p_build,p_caption) returning id into post;
 return post;
end; $$;
create function public.community_create_post(p_name text,p_state jsonb,p_results jsonb,p_caption text,p_fork uuid default null) returns uuid language plpgsql security invoker set search_path='' as $$
declare build uuid;post uuid;
begin
 if char_length(btrim(p_name)) not between 1 and 120 or jsonb_typeof(p_state)<>'object' or octet_length(p_state::text)>160000 or octet_length(coalesce(p_results::text,''))>160000 then raise exception 'Invalid build' using errcode='22023'; end if;
 if p_fork is not null and not exists(select 1 from public.simulations where id=p_fork and visibility='public') then raise exception 'Source build unavailable' using errcode='42501'; end if;
 insert into public.simulations(owner_id,name,device_key,visibility,configuration_source,state,result_snapshot,forked_from) values(auth.uid(),p_name,'community-concept','public','custom',p_state,p_results,p_fork) returning id into build;
 insert into public.community_posts(author_id,simulation_id,caption) values(auth.uid(),build,p_caption) returning id into post;
 return post;
end; $$;
revoke all on function public.community_publish(uuid,text),public.community_create_post(text,jsonb,jsonb,text,uuid) from public,anon,authenticated;
grant execute on function public.community_publish(uuid,text),public.community_create_post(text,jsonb,jsonb,text,uuid) to authenticated;
