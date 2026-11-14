-- PhoneFuturist Lab Early Access allowlist.
-- Admins can pre-authorize emails before those users create an account.
-- Public Lab browsing remains separate; build access is checked at request time.

create table private.lab_early_access_emails (
  email text primary key
    check (
      length(email) between 3 and 254
      and email = lower(trim(email))
      and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    ),
  active boolean not null default true,
  added_by uuid not null references auth.users(id),
  added_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table private.lab_early_access_emails enable row level security;
revoke all on private.lab_early_access_emails from public, anon, authenticated;

create or replace function private.lab_early_access_status()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'allowed',
      auth.uid() is not null
      and (
        private.has_capability('admin')
        or exists (
          select 1
          from auth.users u
          join private.lab_early_access_emails e
            on e.email = lower(trim(u.email))
          where u.id = auth.uid()
            and e.active
        )
      ),
    'admin', auth.uid() is not null and private.has_capability('admin')
  );
$$;

revoke all on function private.lab_early_access_status()
from public, anon, authenticated;
grant execute on function private.lab_early_access_status()
to authenticated;

create or replace function public.lab_early_access_status()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select private.lab_early_access_status();
$$;

revoke all on function public.lab_early_access_status()
from public, anon, authenticated;
grant execute on function public.lab_early_access_status()
to authenticated;

create or replace function private.lab_early_access_manage(
  p_email text default null,
  p_revoke boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized text;
begin
  if auth.uid() is null or not private.has_capability('admin') then
    raise exception 'STUDIO_FORBIDDEN' using errcode='42501';
  end if;

  if p_email is not null then
    normalized := lower(trim(p_email));

    if length(normalized) not between 3 and 254
      or normalized !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    then
      raise exception 'STUDIO_INVALID: Enter a valid email address.';
    end if;

    if coalesce(p_revoke, false) then
      update private.lab_early_access_emails
      set active = false, updated_at = now()
      where email = normalized;
    else
      insert into private.lab_early_access_emails(email, active, added_by)
      values(normalized, true, auth.uid())
      on conflict(email) do update
      set active = true,
          added_by = excluded.added_by,
          updated_at = now();
    end if;
  end if;

  return jsonb_build_object(
    'members',
    coalesce((
      select jsonb_agg(row_data order by row_data.active desc, row_data.updated_at desc)
      from (
        select
          e.email,
          e.active,
          e.added_at,
          e.updated_at,
          exists (
            select 1 from auth.users u
            where lower(trim(u.email)) = e.email
          ) as has_account
        from private.lab_early_access_emails e
      ) row_data
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function private.lab_early_access_manage(text, boolean)
from public, anon, authenticated;
grant execute on function private.lab_early_access_manage(text, boolean)
to authenticated;

create or replace function public.lab_early_access_manage(
  p_email text default null,
  p_revoke boolean default false
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.lab_early_access_manage(p_email, p_revoke);
$$;

revoke all on function public.lab_early_access_manage(text, boolean)
from public, anon, authenticated;
grant execute on function public.lab_early_access_manage(text, boolean)
to authenticated;
