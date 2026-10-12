-- Public creator identity for Interactive Leaks.
-- Separate from account/private profile data so community pages never expose email or auth metadata.

create table public.creator_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  handle text not null unique check (handle ~ '^[a-z0-9_]{3,24}$'),
  display_name text not null check (char_length(display_name) between 1 and 60),
  bio text not null default '' check (char_length(bio) <= 240),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.creator_profiles enable row level security;
revoke all on public.creator_profiles from public, anon, authenticated;
grant select on public.creator_profiles to anon, authenticated;
grant insert, update, delete on public.creator_profiles to authenticated;

create policy creator_profiles_read on public.creator_profiles
for select using (true);

create policy creator_profiles_insert on public.creator_profiles
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and ((select private.current_access())->>'active')::boolean
  and ((select private.current_access())->>'verified')::boolean
);

create policy creator_profiles_update on public.creator_profiles
for update to authenticated
using (user_id = (select auth.uid()))
with check (
  user_id = (select auth.uid())
  and ((select private.current_access())->>'active')::boolean
  and ((select private.current_access())->>'verified')::boolean
);

create policy creator_profiles_delete on public.creator_profiles
for delete to authenticated
using (user_id = (select auth.uid()));

create trigger touch_creator_profiles_updated_at
before update on public.creator_profiles
for each row execute function private.touch_simulation_updated_at();
