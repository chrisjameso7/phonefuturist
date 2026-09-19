-- Approved narrow Admin exception policy. Provisioning is separate from schema.
create table private.access_policy (
  singleton boolean primary key default true check (singleton),
  primary_admin uuid not null references auth.users(id)
);
create table private.privileged_mfa_exceptions (
  user_id uuid primary key references auth.users(id),
  scope text not null default 'admin' check (scope = 'admin'),
  reason text not null check (length(trim(reason)) between 10 and 2000),
  authorized_by uuid not null references auth.users(id),
  granted_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  revoked_by uuid references auth.users(id),
  revocation_reason text,
  check ((revoked_at is null and revoked_by is null and revocation_reason is null)
    or (revoked_at is not null and revoked_by is not null and length(trim(revocation_reason)) between 10 and 2000))
);
alter table private.access_policy enable row level security;
alter table private.privileged_mfa_exceptions enable row level security;
revoke all on private.access_policy, private.privileged_mfa_exceptions from public, anon, authenticated;

create function private.admin_mfa_exception_active() returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from private.privileged_mfa_exceptions e
    join private.role_grants r on r.user_id = e.user_id and r.role = 'admin'
    where e.user_id = auth.uid() and e.revoked_at is null
      and (e.expires_at is null or e.expires_at > now())
  );
$$;
revoke all on function private.admin_mfa_exception_active() from public, anon, authenticated;
grant execute on function private.admin_mfa_exception_active() to authenticated;

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
    'mfa_required', not private.admin_mfa_exception_active() and (exists(select 1 from private.role_grants r where r.user_id = auth.uid() and r.role in ('admin', 'publisher'))
      or exists(select 1 from auth.mfa_factors f where f.user_id = auth.uid() and f.status = 'verified')),
    'aal', case when auth.jwt()->>'aal' = 'aal2' and exists (
      select 1 from auth.mfa_factors f where f.user_id = auth.uid() and f.status = 'verified'
    ) then 'aal2' else 'aal1' end
  );
$$;
revoke all on function private.current_access() from public, anon, authenticated;
grant execute on function private.current_access() to authenticated;


create function private.manage_mfa_exceptions(p_target uuid default null, p_reason text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not private.has_capability('admin')
     or not exists(select 1 from private.access_policy p where p.primary_admin = auth.uid()) then
    raise exception 'Primary administrator access required' using errcode = '42501';
  end if;
  if p_target is not null then
    if p_reason is null or length(trim(p_reason)) not between 10 and 2000 then
      raise exception 'A revocation reason of 10–2000 characters is required';
    end if;
    update private.privileged_mfa_exceptions e
      set revoked_at = now(), revoked_by = auth.uid(), revocation_reason = trim(p_reason)
      where e.user_id = p_target and e.revoked_at is null;
    if found then
      insert into private.access_audit(subject_id, actor_id, action, reason)
      values (p_target, auth.uid(), 'mfa_exception_revoked', trim(p_reason));
    end if;
  end if;
  return coalesce((select jsonb_agg(jsonb_build_object(
    'user_id', e.user_id, 'email', u.email, 'granted_at', e.granted_at,
    'expires_at', e.expires_at, 'revoked_at', e.revoked_at, 'reason', e.reason
  ) order by e.granted_at, e.user_id) from private.privileged_mfa_exceptions e
  join auth.users u on u.id = e.user_id), '[]'::jsonb);
end;
$$;
revoke all on function private.manage_mfa_exceptions(uuid,text) from public, anon, authenticated;
grant execute on function private.manage_mfa_exceptions(uuid,text) to authenticated;
create function public.manage_mfa_exceptions(target uuid default null, reason text default null) returns jsonb
language sql security invoker set search_path = '' as $$
  select private.manage_mfa_exceptions(target, reason);
$$;
revoke all on function public.manage_mfa_exceptions(uuid,text) from public, anon, authenticated;
grant execute on function public.manage_mfa_exceptions(uuid,text) to authenticated;

