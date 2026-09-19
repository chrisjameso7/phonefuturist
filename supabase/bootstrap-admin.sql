-- Run manually as the project owner in Supabase SQL Editor, never as an app RPC.
-- Confirm the Auth user UUID before replacing the placeholder. Not a migration.
-- This grants only Admin; it never confirms email or bypasses MFA.
do $bootstrap$
declare
  target_id uuid := 'REPLACE_WITH_CONFIRMED_AUTH_USER_UUID'::uuid;
  is_verified boolean;
  is_active boolean;
  granted_count integer;
begin
  select u.email_confirmed_at is not null,
         a.status = 'active' and (u.banned_until is null or u.banned_until < now())
    into is_verified, is_active
    from auth.users u join private.accounts a on a.user_id = u.id
    where u.id = target_id for update of u, a;
  if not found or not coalesce(is_verified and is_active, false) then
    raise exception 'Bootstrap requires the confirmed, verified, active account.';
  end if;
  insert into private.role_grants(user_id, role) values (target_id, 'admin')
    on conflict do nothing;
  get diagnostics granted_count = row_count;
  if granted_count = 1 then
    insert into private.access_audit(subject_id, actor_id, action, reason)
      values (target_id, null, 'admin_bootstrap',
        'Project owner granted initial Admin to the explicitly confirmed account. TOTP remains mandatory for privileged access.');
  end if;
end;
$bootstrap$;
