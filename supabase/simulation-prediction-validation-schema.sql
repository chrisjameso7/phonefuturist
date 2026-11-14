-- PhoneFuturist Interactive Leaks prediction validation
-- Schema draft. Apply through the connected Supabase project,
-- run security/performance advisors, then generate a tracked migration.
--
-- Security model:
-- - authenticated users may append and read their own immutable predictions
-- - normal users cannot update or delete historical predictions
-- - editorial/admin staff may read predictions for resolution
-- - only staff may append reality snapshots
-- - reality snapshots are also immutable through the Data API

create table if not exists public.simulation_predictions (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  device_name text not null
    check (char_length(device_name) between 1 and 180),

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

  simulator_version text
    check (
      simulator_version is null
      or char_length(simulator_version) <= 80
    ),

  prediction_snapshot jsonb not null
    check (
      jsonb_typeof(prediction_snapshot) = 'object'
      and octet_length(prediction_snapshot::text) <= 160000
    ),

  created_at timestamptz not null default now()
);

create index if not exists
  simulation_predictions_user_created_idx
  on public.simulation_predictions(user_id, created_at desc);

create index if not exists
  simulation_predictions_device_created_idx
  on public.simulation_predictions(device_name, created_at desc);

alter table public.simulation_predictions
  enable row level security;

revoke all on public.simulation_predictions
  from public, anon, authenticated;

grant insert, select on public.simulation_predictions
  to authenticated;

drop policy if exists
  simulation_predictions_insert_own
  on public.simulation_predictions;

create policy simulation_predictions_insert_own
on public.simulation_predictions
for insert
to authenticated
with check (
  user_id = (select auth.uid())
);

drop policy if exists
  simulation_predictions_read_own_or_staff
  on public.simulation_predictions;

create policy simulation_predictions_read_own_or_staff
on public.simulation_predictions
for select
to authenticated
using (
  user_id = (select auth.uid())
  or private.has_capability('admin')
  or private.has_capability('publisher')
  or private.has_capability('editor')
);

create table if not exists public.simulation_reality_snapshots (
  id uuid primary key,
  prediction_id uuid not null
    references public.simulation_predictions(id)
    on delete cascade,
  resolved_by uuid not null
    references auth.users(id)
    on delete restrict,

  reality_snapshot jsonb not null
    check (
      jsonb_typeof(reality_snapshot) = 'object'
      and octet_length(reality_snapshot::text) <= 160000
    ),

  created_at timestamptz not null default now()
);

create index if not exists
  simulation_reality_prediction_created_idx
  on public.simulation_reality_snapshots(prediction_id, created_at desc);

alter table public.simulation_reality_snapshots
  enable row level security;

revoke all on public.simulation_reality_snapshots
  from public, anon, authenticated;

grant insert, select on public.simulation_reality_snapshots
  to authenticated;

drop policy if exists
  simulation_reality_read_owner_or_staff
  on public.simulation_reality_snapshots;

create policy simulation_reality_read_owner_or_staff
on public.simulation_reality_snapshots
for select
to authenticated
using (
  exists (
    select 1
    from public.simulation_predictions p
    where p.id = prediction_id
      and p.user_id = (select auth.uid())
  )
  or private.has_capability('admin')
  or private.has_capability('publisher')
  or private.has_capability('editor')
);

drop policy if exists
  simulation_reality_insert_staff
  on public.simulation_reality_snapshots;

create policy simulation_reality_insert_staff
on public.simulation_reality_snapshots
for insert
to authenticated
with check (
  resolved_by = (select auth.uid())
  and (
    private.has_capability('admin')
    or private.has_capability('publisher')
    or private.has_capability('editor')
  )
);

-- Deliberately no UPDATE or DELETE grants/policies for authenticated users.
-- Historical prediction and reality rows are append-only through the Data API.
