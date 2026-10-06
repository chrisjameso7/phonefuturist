-- Interactive Leaks community foundations.
-- User-owned simulations and reusable processor profiles.
-- Public rows remain readable, writes stay owner-scoped.

create table public.simulation_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  component_kind text not null check (component_kind in ('processor')),
  component_key text not null check (char_length(component_key) between 1 and 120),
  visibility text not null default 'private' check (visibility in ('private', 'unlisted', 'public')),
  profile_kind text not null default 'custom' check (profile_kind in ('official', 'evidence_backed', 'community', 'speculative', 'experimental', 'custom')),
  assumptions jsonb not null default '{}'::jsonb,
  forked_from uuid references public.simulation_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.simulations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  device_key text not null check (char_length(device_key) between 1 and 160),
  visibility text not null default 'private' check (visibility in ('private', 'unlisted', 'public')),
  configuration_source text not null check (configuration_source in ('likely', 'worst', 'custom')),
  processor_key text,
  processor_profile_id uuid references public.simulation_profiles(id) on delete set null,
  state jsonb not null default '{}'::jsonb,
  result_snapshot jsonb,
  forked_from uuid references public.simulations(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index simulation_profiles_owner_updated_idx on public.simulation_profiles(owner_id, updated_at desc);
create index simulations_owner_updated_idx on public.simulations(owner_id, updated_at desc);
create index simulations_public_updated_idx on public.simulations(updated_at desc) where visibility = 'public';
create index simulation_profiles_public_updated_idx on public.simulation_profiles(updated_at desc) where visibility = 'public';

alter table public.simulation_profiles enable row level security;
alter table public.simulations enable row level security;

revoke all on public.simulation_profiles from public, anon, authenticated;
revoke all on public.simulations from public, anon, authenticated;
grant select, insert, update, delete on public.simulation_profiles to authenticated;
grant select, insert, update, delete on public.simulations to authenticated;
grant select on public.simulation_profiles to anon;
grant select on public.simulations to anon;

create policy simulation_profiles_read on public.simulation_profiles
for select
using (
  visibility = 'public'
  or owner_id = (select auth.uid())
  or visibility = 'unlisted'
);

create policy simulation_profiles_insert on public.simulation_profiles
for insert to authenticated
with check (
  owner_id = (select auth.uid())
  and ((select private.current_access())->>'active')::boolean
  and ((select private.current_access())->>'verified')::boolean
);

create policy simulation_profiles_update on public.simulation_profiles
for update to authenticated
using (owner_id = (select auth.uid()))
with check (
  owner_id = (select auth.uid())
  and ((select private.current_access())->>'active')::boolean
  and ((select private.current_access())->>'verified')::boolean
);

create policy simulation_profiles_delete on public.simulation_profiles
for delete to authenticated
using (owner_id = (select auth.uid()));

create policy simulations_read on public.simulations
for select
using (
  visibility = 'public'
  or owner_id = (select auth.uid())
  or visibility = 'unlisted'
);

create policy simulations_insert on public.simulations
for insert to authenticated
with check (
  owner_id = (select auth.uid())
  and ((select private.current_access())->>'active')::boolean
  and ((select private.current_access())->>'verified')::boolean
);

create policy simulations_update on public.simulations
for update to authenticated
using (owner_id = (select auth.uid()))
with check (
  owner_id = (select auth.uid())
  and ((select private.current_access())->>'active')::boolean
  and ((select private.current_access())->>'verified')::boolean
);

create policy simulations_delete on public.simulations
for delete to authenticated
using (owner_id = (select auth.uid()));

create function private.touch_simulation_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function private.touch_simulation_updated_at() from public, anon, authenticated;

create trigger touch_simulation_profiles_updated_at
before update on public.simulation_profiles
for each row execute function private.touch_simulation_updated_at();

create trigger touch_simulations_updated_at
before update on public.simulations
for each row execute function private.touch_simulation_updated_at();
