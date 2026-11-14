-- Additive Labs integration for the repository's existing foundation.
-- Live foundation, creator identity and storage policies inspected on 2026-10-28.
-- profiles.user_id is the existing identity key. id is a read-only compatibility alias.
alter table public.profiles add column if not exists id uuid generated always as (user_id) stored;
create unique index if not exists lab_profiles_id_unique on public.profiles(id);
alter table public.profiles add column if not exists username text check (username ~ '^[a-z0-9_]{3,24}$');
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

create table public.user_badges (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(id) on delete cascade,
 badge_name text not null check (char_length(badge_name) between 1 and 60),
 assigned_at timestamptz not null default now(),
 unique(user_id,badge_name)
);
create table public.concept_polls (
 id uuid primary key default gen_random_uuid(),
 prediction_topic text not null check (char_length(prediction_topic) between 5 and 300),
 forks text[] not null check (cardinality(forks) between 2 and 4 and array_position(forks,null) is null),
 closes_at timestamptz not null,
 created_at timestamptz not null default now(),
 resolved boolean not null default false,
 winning_fork text,
 resolution_source text,
 check (not resolved or (winning_fork=any(forks) and resolution_source ~ '^https://'))
);
create table public.concept_predictions (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(id) on delete cascade,
 prediction_topic uuid not null references public.concept_polls(id),
 selected_fork text not null,
 locked_in_at timestamptz not null default now(),
 resolved boolean not null default false,
 score_awarded integer not null default 0 check (score_awarded in (0,1)),
 unique(user_id,prediction_topic)
);
-- prediction_topic is the stable poll UUID, not editable question text.
create index concept_predictions_topic on public.concept_predictions(prediction_topic);
create index concept_polls_closes on public.concept_polls(closes_at);
alter table public.user_badges enable row level security;
alter table public.concept_polls enable row level security;
alter table public.concept_predictions enable row level security;
revoke all on public.user_badges,public.concept_polls,public.concept_predictions from public,anon,authenticated;
grant select on public.user_badges to anon,authenticated;
create policy lab_badges_public on public.user_badges for select to anon,authenticated using (true);
grant select on public.concept_predictions to authenticated;
create policy lab_predictions_own on public.concept_predictions for select to authenticated using (user_id=(select auth.uid()));
-- No direct client INSERT/UPDATE on predictions, polls, badges or score columns.
-- RPCs are narrow capabilities: caller identity is validated, never accepted as an argument.

create function private.lab_member() returns boolean language sql stable security invoker set search_path='' as $$
 select coalesce((a->>'active')::boolean,false) and coalesce((a->>'verified')::boolean,false)
 and (not coalesce((a->>'mfa_required')::boolean,false) or a->>'aal'='aal2')
 from (select private.current_access() a) s;
$$;
revoke all on function private.lab_member() from public,anon,authenticated;
grant execute on function private.lab_member() to authenticated;

create function public.lab_sync_profile(p_avatar text default null) returns void
language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid();
begin
 if v_user is null or not private.lab_member() then raise exception 'Verified active account required' using errcode='42501'; end if;
 if p_avatar is not null and (p_avatar not like 'https://ehldokmrgahrlcoyidjy.supabase.co/storage/v1/object/public/avatars/'||v_user::text||'/%') then raise exception 'Avatar must belong to this account'; end if;
 update public.profiles p set username=c.handle,avatar_url=coalesce(p_avatar,c.avatar_url),updated_at=now()
 from public.creator_profiles c where p.user_id=v_user and c.user_id=v_user;
 if p_avatar is not null then
   update public.profiles set avatar_url=p_avatar,updated_at=now() where user_id=v_user;
   update public.creator_profiles set avatar_url=p_avatar where user_id=v_user;
 end if;
end;
$$;
revoke all on function public.lab_sync_profile(text) from public,anon,authenticated;
grant execute on function public.lab_sync_profile(text) to authenticated;

create function public.lab_lock_prediction(p_topic uuid,p_fork text) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_poll public.concept_polls; v_id uuid; v_user uuid:=auth.uid();
begin
 if v_user is null or not private.lab_member() then raise exception 'Verified active account required' using errcode='42501'; end if;
 -- Resolution and voting share this lock, so closing cannot race a late vote.
 select * into v_poll from public.concept_polls where id=p_topic for update;
 if not found or v_poll.resolved or v_poll.closes_at<=clock_timestamp() then raise exception 'Voting is closed'; end if;
 if not (p_fork=any(v_poll.forks)) then raise exception 'Unknown design fork'; end if;
 insert into public.concept_predictions(user_id,prediction_topic,selected_fork)
 values(v_user,p_topic,p_fork) returning id into v_id;
 return v_id;
end;
$$;
revoke all on function public.lab_lock_prediction(uuid,text) from public,anon,authenticated;
grant execute on function public.lab_lock_prediction(uuid,text) to authenticated;

create function public.lab_vault() returns jsonb
language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(row order by row->>'closesAt'),'[]'::jsonb) from (
 select jsonb_build_object('id',p.id,'topic',p.prediction_topic,'forks',p.forks,'closesAt',p.closes_at,'resolved',p.resolved,'winningFork',case when p.resolved then p.winning_fork else null end,'resolutionSource',case when p.resolved then p.resolution_source else null end,
 'selectedFork',(select v.selected_fork from public.concept_predictions v where v.prediction_topic=p.id and v.user_id=auth.uid()),
 'total',case when p.closes_at<=now() or exists(select 1 from public.concept_predictions v where v.prediction_topic=p.id and v.user_id=auth.uid()) then (select count(*) from public.concept_predictions v where v.prediction_topic=p.id) else 0 end,
 'percentages',case when p.closes_at<=now() or exists(select 1 from public.concept_predictions v where v.prediction_topic=p.id and v.user_id=auth.uid()) then
 (select jsonb_agg(case when totals.total=0 then 0 else round(100.0*(select count(*) from public.concept_predictions v where v.prediction_topic=p.id and v.selected_fork=f.fork)/totals.total,1) end order by f.ordinal)
 from unnest(p.forks) with ordinality f(fork,ordinal),lateral(select count(*) total from public.concept_predictions v where v.prediction_topic=p.id) totals)
 else null end) row from (select * from public.concept_polls order by created_at desc limit 50) p) rows;
$$;
revoke all on function public.lab_vault() from public,anon,authenticated;
grant execute on function public.lab_vault() to anon,authenticated;

create function public.lab_create_poll(p_topic text,p_forks text[],p_closes timestamptz) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
 if auth.uid() is null or not (private.has_capability('admin') or private.has_capability('editor') or private.has_capability('publisher')) then raise exception 'Editor access required' using errcode='42501'; end if;
 if p_closes<=now() or cardinality(p_forks) not between 2 and 4 or exists(select 1 from unnest(p_forks) f where char_length(trim(f)) not between 1 and 120) or (select count(distinct f) from unnest(p_forks) f)<>cardinality(p_forks) then raise exception 'Invalid poll'; end if;
 insert into public.concept_polls(prediction_topic,forks,closes_at) values(trim(p_topic),p_forks,p_closes) returning id into v_id;
 return v_id;
end;
$$;
revoke all on function public.lab_create_poll(text,text[],timestamptz) from public,anon,authenticated;
grant execute on function public.lab_create_poll(text,text[],timestamptz) to authenticated;

create function public.lab_resolve_poll(p_topic uuid,p_winner text,p_source text) returns void
language plpgsql security definer set search_path='' as $$
declare v_poll public.concept_polls;
begin
 if auth.uid() is null or not (private.has_capability('admin') or private.has_capability('editor') or private.has_capability('publisher')) then raise exception 'Editor access required' using errcode='42501'; end if;
 select * into v_poll from public.concept_polls where id=p_topic for update;
 if not found or v_poll.resolved or v_poll.closes_at>now() then raise exception 'Poll must be closed and unresolved'; end if;
 if not (p_winner=any(v_poll.forks)) or p_source is null or p_source !~ '^https://' then raise exception 'Winning fork and HTTPS source required'; end if;
 -- Serialize badge counts across different polls being resolved concurrently.
 perform pg_advisory_xact_lock(71028001);
 update public.concept_polls set resolved=true,winning_fork=p_winner,resolution_source=p_source where id=p_topic;
 update public.concept_predictions set resolved=true,score_awarded=case when selected_fork=p_winner then 1 else 0 end where prediction_topic=p_topic;
 insert into public.user_badges(user_id,badge_name)
 select user_id,'Industry Oracle' from public.concept_predictions where resolved group by user_id having sum(score_awarded)>=10
 on conflict(user_id,badge_name) do nothing;
end;
$$;
revoke all on function public.lab_resolve_poll(uuid,text,text) from public,anon,authenticated;
grant execute on function public.lab_resolve_poll(uuid,text,text) to authenticated;

-- Existing creator identity is mirrored, not replaced or made public through profiles.
create function private.lab_mirror_creator() returns trigger language plpgsql security definer set search_path='' as $$
begin update public.profiles set username=new.handle,avatar_url=new.avatar_url,updated_at=now() where user_id=new.user_id; return new; end;
$$;
revoke all on function private.lab_mirror_creator() from public,anon,authenticated;
create trigger lab_mirror_creator after insert or update on public.creator_profiles for each row execute function private.lab_mirror_creator();
update public.profiles p set username=c.handle,avatar_url=c.avatar_url,updated_at=now() from public.creator_profiles c where c.user_id=p.user_id;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('avatars','avatars',true,2097152,array['image/jpeg','image/png','image/webp'])
on conflict(id) do nothing;
-- Refuse to silently alter an existing bucket's privacy or upload restrictions.
do $$ begin if not exists(select 1 from storage.buckets where id='avatars' and public and file_size_limit<=2097152 and allowed_mime_types<@array['image/jpeg','image/png','image/webp']::text[]) then raise exception 'Existing avatars bucket requires review'; end if; end $$;
create policy lab_avatar_insert on storage.objects for insert to authenticated with check(bucket_id='avatars' and (storage.foldername(name))[1]=(select auth.uid())::text and (select private.lab_member()));
create policy lab_avatar_read_own on storage.objects for select to authenticated using(bucket_id='avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy lab_avatar_delete_own on storage.objects for delete to authenticated using(bucket_id='avatars' and (storage.foldername(name))[1]=(select auth.uid())::text and (select private.lab_member()));
-- Uploads use fresh immutable names; no overwrite policy is necessary.
-- Bound the avatars namespace even if unrelated buckets have permissive policies.
create policy lab_avatar_insert_boundary on storage.objects as restrictive for insert to authenticated
with check(bucket_id<>'avatars' or ((storage.foldername(name))[1]=(select auth.uid())::text and (select private.lab_member())));
create policy lab_avatar_select_boundary on storage.objects as restrictive for select to authenticated
using(bucket_id<>'avatars' or (storage.foldername(name))[1]=(select auth.uid())::text);
create policy lab_avatar_delete_boundary on storage.objects as restrictive for delete to authenticated
using(bucket_id<>'avatars' or ((storage.foldername(name))[1]=(select auth.uid())::text and (select private.lab_member())));
create policy lab_avatar_no_overwrite on storage.objects as restrictive for update to authenticated
using(bucket_id<>'avatars') with check(bucket_id<>'avatars');
