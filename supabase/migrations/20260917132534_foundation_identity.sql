-- Foundation only. Copied into a CLI-created migration before application.
-- All privileged functions pin search_path and return only caller-scoped data.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create table private.accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'suspended', 'banned')),
  created_at timestamptz not null default now()
);
create table private.role_grants (
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('writer', 'editor', 'publisher', 'admin', 'moderator')),
  granted_at timestamptz not null default now(),
  primary key (user_id, role)
);
create table private.access_audit (
  id bigint generated always as identity primary key,
  subject_id uuid,
  actor_id uuid,
  action text not null,
  reason text not null check (length(reason) between 1 and 2000),
  recorded_at timestamptz not null default now()
);
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table private.accounts enable row level security;
alter table private.role_grants enable row level security;
alter table private.access_audit enable row level security;
alter table public.profiles enable row level security;
revoke all on all tables in schema private from public, anon, authenticated;
revoke all on public.profiles from public, anon, authenticated;

create function private.initialize_account() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into private.accounts(user_id) values (new.id);
  insert into public.profiles(user_id) values (new.id);
  return new;
end;
$$;
revoke all on function private.initialize_account() from public, anon, authenticated;
create trigger phonefuturist_new_account after insert on auth.users
for each row execute function private.initialize_account();

-- Existing Auth accounts receive reader foundations only, never staff grants.
insert into private.accounts(user_id) select id from auth.users on conflict do nothing;
insert into public.profiles(user_id) select id from auth.users on conflict do nothing;

create function private.current_access() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'active', coalesce((
      select a.status = 'active' and (u.banned_until is null or u.banned_until < now())
      and exists (select 1 from auth.sessions s where s.user_id = u.id and s.id::text = (auth.jwt()->>'session_id'))
      from private.accounts a join auth.users u on u.id = a.user_id where a.user_id = auth.uid()
    ), false),
    'verified', exists(select 1 from auth.users u where u.id = auth.uid() and u.email_confirmed_at is not null),
    'roles', coalesce((select jsonb_agg(r.role order by r.role) from private.role_grants r where r.user_id = auth.uid()), '[]'::jsonb),
    'mfa_required', exists(select 1 from private.role_grants r where r.user_id = auth.uid() and r.role in ('admin', 'publisher'))
      or exists(select 1 from auth.mfa_factors f where f.user_id = auth.uid() and f.status = 'verified'),
    'aal', case when auth.jwt()->>'aal' = 'aal2' and exists (
      select 1 from auth.mfa_factors f where f.user_id = auth.uid() and f.status = 'verified'
    ) then 'aal2' else 'aal1' end
  );
$$;
revoke all on function private.current_access() from public, anon, authenticated;
grant execute on function private.current_access() to authenticated;

create function public.foundation_access() returns jsonb
language sql stable security invoker set search_path = '' as $$
  select private.current_access();
$$;
revoke all on function public.foundation_access() from public, anon, authenticated;
grant execute on function public.foundation_access() to authenticated;

-- Used by future controlled domain operations; no future domain tables here.
create function private.has_capability(required_role text) returns boolean
language sql stable security invoker set search_path = '' as $$
  select (a->>'active')::boolean and (a->>'verified')::boolean
    and (a->'roles' ? required_role)
    and (not (a->>'mfa_required')::boolean or a->>'aal' = 'aal2')
  from (select private.current_access() as a) state;
$$;
revoke all on function private.has_capability(text) from public, anon, authenticated;
grant execute on function private.has_capability(text) to authenticated;

grant select on public.profiles to authenticated;
create policy own_active_profile on public.profiles for select to authenticated
using (user_id = (select auth.uid()) and ((select private.current_access())->>'active')::boolean);

-- No public write policies, storage buckets, staff assignment endpoints, or seeded content.
-- Role/status changes are restricted to controlled administrative provisioning until M1.
