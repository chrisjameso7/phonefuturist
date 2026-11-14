-- PhoneFuturist Interactive Leaks beta feedback
-- Schema draft. Apply through the connected Supabase project,
-- run advisors, then generate a tracked migration.

create table if not exists public.simulator_feedback (
  id uuid primary key,
  reference text not null unique,
  created_at timestamptz not null default now(),
  user_id uuid null references auth.users(id) on delete set null,

  category text not null check (
    category in (
      'wrong-result',
      'broken',
      'feature-request',
      'confusing',
      'other'
    )
  ),

  message text not null check (
    char_length(message) between 1 and 4000
  ),

  expected_behavior text null check (
    expected_behavior is null or
    char_length(expected_behavior) <= 4000
  ),

  simulator_mode text not null check (
    simulator_mode in ('simple', 'advanced')
  ),

  simulator_version text null,
  engine_version text null,
  corpus_version text null,

  simulation_snapshot jsonb not null,

  status text not null default 'new' check (
    status in (
      'new',
      'reviewing',
      'planned',
      'fixed',
      'wont_fix'
    )
  )
);

alter table public.simulator_feedback
  enable row level security;

revoke all on table public.simulator_feedback
  from anon, authenticated;

grant insert on table public.simulator_feedback
  to anon, authenticated;

grant select on table public.simulator_feedback
  to authenticated;

drop policy if exists
  "Anonymous users can submit beta feedback"
  on public.simulator_feedback;

create policy
  "Anonymous users can submit beta feedback"
  on public.simulator_feedback
  for insert
  to anon
  with check (user_id is null);

drop policy if exists
  "Authenticated users can submit own beta feedback"
  on public.simulator_feedback;

create policy
  "Authenticated users can submit own beta feedback"
  on public.simulator_feedback
  for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
  );

drop policy if exists
  "Authenticated users can read own beta feedback"
  on public.simulator_feedback;

create policy
  "Authenticated users can read own beta feedback"
  on public.simulator_feedback
  for select
  to authenticated
  using (
    (select auth.uid()) = user_id
  );

create index if not exists
  simulator_feedback_created_at_idx
  on public.simulator_feedback
  (created_at desc);

create index if not exists
  simulator_feedback_status_idx
  on public.simulator_feedback
  (status, created_at desc);
