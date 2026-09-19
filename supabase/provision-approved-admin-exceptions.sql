-- Owner-approved 18 September 2026. Run once through an authorized database operator.
-- UUIDs were checked against the named accounts before preparing this script.
-- Email is not used for runtime authorization. This does not modify Auth internals.
begin;
do $$
declare
  primary_id constant uuid := '8c14cb89-6a24-4545-a52b-09019e4017f0';
  spygo_id constant uuid := '8c18ef96-59d2-43b2-81a1-0d9dcc5113ce';
  subject uuid;
  approved_ids constant uuid[] := array[
    '8c14cb89-6a24-4545-a52b-09019e4017f0'::uuid,
    '8c18ef96-59d2-43b2-81a1-0d9dcc5113ce'::uuid,
    '584a7868-6854-49ae-8b62-e74518e4040f'::uuid
  ];
begin
  foreach subject in array approved_ids loop
    if not exists(select 1 from auth.users u join private.accounts a on a.user_id=u.id
      where u.id=subject and u.email_confirmed_at is not null and a.status='active'
      and (u.banned_until is null or u.banned_until < now())) then
      raise exception 'Provisioning requires all three verified active accounts';
    end if;
  end loop;
  if not exists(select 1 from private.role_grants where user_id=primary_id and role='admin') then
    raise exception 'Primary account must already be Admin';
  end if;
  if exists(select 1 from private.access_policy where primary_admin <> primary_id) then
    raise exception 'Refusing to replace an existing primary Admin';
  end if;
  insert into private.access_policy(primary_admin) values(primary_id) on conflict do nothing;
  if found then
    insert into private.access_audit(subject_id,actor_id,action,reason)
      values(primary_id,primary_id,'primary_admin_designated','Owner approved James as primary Admin in Codex on 2026-09-18; executed through controlled provisioning.');
  end if;
  insert into private.role_grants(user_id,role) values(spygo_id,'admin') on conflict do nothing;
  if found then
    insert into private.access_audit(subject_id,actor_id,action,reason)
      values(spygo_id,primary_id,'admin_granted','Owner explicitly approved Spygo Admin grant in Codex on 2026-09-18; executed through controlled provisioning.');
  end if;
  foreach subject in array approved_ids loop
    if not exists(select 1 from private.role_grants where user_id=subject and role='admin') then
      raise exception 'Exception target must already be Admin';
    end if;
    insert into private.privileged_mfa_exceptions(user_id,reason,authorized_by)
      values(subject,'Owner approved indefinite UUID-scoped Admin MFA exception in Codex on 2026-09-18.',primary_id)
      on conflict do nothing;
    if found then
      insert into private.access_audit(subject_id,actor_id,action,reason)
        values(subject,primary_id,'mfa_exception_granted','Owner approved UUID-scoped Admin exception; controlled provisioning, not an authenticated browser action.');
    end if;
  end loop;
end $$;
commit;
