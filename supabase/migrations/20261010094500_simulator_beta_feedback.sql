-- Interactive Leaks beta feedback log.
-- Public beta users may submit reports, but reports are not enumerable by users.
-- Editorial/admin staff can review and triage them through authenticated tools.

create table public.simulator_feedback (
  id uuid primary key,
  reference text not null unique
    check (reference ~ '^PF-BETA-[A-Z0-9]{8}$'),
  user_id uuid references auth.users(id) on delete set null,

  category text not null
    check (
      category in (
        'wrong-result',
        'broken',
        'feature-request',
        'confusing',
        'other'
      )
    ),

  message text not null
    check (char_length(message) between 1 and 4000),

  expected_behavior text
    check (
      expected_behavior is null
      or char_length(expected_behavior) <= 4000
    ),

  simulator_mode text not null
    check (simulator_mode in ('simple', 'advanced')),

  simulator_version text
    check (
      simulator_version is null
      or char_length(simulator_version) <= 80
    ),

  engine_version text
    check (
      engine_version is null
      or char_length(engine_version) <= 80
    ),

  corpus_version text
    check (
      corpus_version is null
      or char_length(corpus_version) <= 120
    ),

  simulation_snapshot jsonb not null
    check (
      octet_length(simulation_snapshot::text) <= 120000
    ),

  status text not null default 'new'
    check (
      status in (
        'new',
        'reviewing',
        'planned',
        'fixed',
        'wont_fix'
      )
    ),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index simulator_feedback_status_created_idx
  on public.simulator_feedback(status, created_at desc);

create index simulator_feedback_user_created_idx
  on public.simulator_feedback(user_id, created_at desc)
  where user_id is not null;

alter table public.simulator_feedback
  enable row level security;

revoke all on public.simulator_feedback
  from public, anon, authenticated;

grant insert on public.simulator_feedback
  to anon, authenticated;

grant select, update on public.simulator_feedback
  to authenticated;

create policy simulator_feedback_submit_anon
on public.simulator_feedback
for insert
to anon
with check (
  user_id is null
  and status = 'new'
);

create policy simulator_feedback_submit_authenticated
on public.simulator_feedback
for insert
to authenticated
with check (
  status = 'new'
  and (
    user_id is null
    or user_id = (select auth.uid())
  )
);

create policy simulator_feedback_staff_read
on public.simulator_feedback
for select
to authenticated
using (
  private.has_capability('admin')
  or private.has_capability('publisher')
  or private.has_capability('editor')
);

create policy simulator_feedback_staff_update
on public.simulator_feedback
for update
to authenticated
using (
  private.has_capability('admin')
  or private.has_capability('publisher')
  or private.has_capability('editor')
)
with check (
  private.has_capability('admin')
  or private.has_capability('publisher')
  or private.has_capability('editor')
);

create function private.touch_simulator_feedback_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all
on function private.touch_simulator_feedback_updated_at()
from public, anon, authenticated;

create trigger touch_simulator_feedback_updated_at
before update on public.simulator_feedback
for each row
execute function private.touch_simulator_feedback_updated_at();
