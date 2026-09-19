-- PhoneFuturist Intelligence foundation.
-- Authoritative device intelligence is private.
-- Public access will be exposed later through explicit projections/RPCs.
--
-- Important separation:
--   claims = sourced editorial assertions
--   simulations = deterministic calculations derived from claims
-- Calculated simulation output does not belong in these evidence tables.


-- =========================================================
-- DEVICES
-- =========================================================

create table private.devices (
  id uuid primary key default gen_random_uuid(),

  brand text not null
    check (length(trim(brand)) between 1 and 120),

  name text not null
    check (length(trim(name)) between 1 and 180),

  slug text not null unique
    check (
      slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
      and length(slug) <= 180
    ),

  category text not null
    check (
      category in (
        'smartphone',
        'tablet',
        'laptop',
        'wearable',
        'audio',
        'chip',
        'display',
        'other'
      )
    ),

  lifecycle text not null default 'unreleased'
    check (
      lifecycle in (
        'rumored',
        'unreleased',
        'announced',
        'released',
        'cancelled'
      )
    ),

  announced_at timestamptz,
  released_at timestamptz,

  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


-- =========================================================
-- COMPONENTS / PROPERTIES
-- =========================================================
--
-- Components are intentionally flexible.
--
-- Examples:
--   display
--   battery
--   main_camera
--   telephoto_camera
--   soc
--   cooling
--   chassis
--
-- A component can also represent a logical specification
-- group rather than a literal removable physical component.

create table private.device_components (
  id uuid primary key default gen_random_uuid(),

  device_id uuid not null
    references private.devices(id)
    on delete cascade,

  key text not null
    check (
      key ~ '^[a-z0-9]+(_[a-z0-9]+)*$'
      and length(key) <= 120
    ),

  label text not null
    check (length(trim(label)) between 1 and 180),

  sort_order integer not null default 0,

  created_at timestamptz not null default now(),

  unique (device_id, key),

  -- Required so device_claims can enforce that a component
  -- actually belongs to the same device as the claim.
  unique (id, device_id)
);


-- =========================================================
-- INTELLIGENCE SOURCES
-- =========================================================
--
-- Sources are first-class records because one source may
-- support multiple claims across a device.

create table private.intelligence_sources (
  id uuid primary key default gen_random_uuid(),

  label text not null
    check (length(trim(label)) between 1 and 240),

  url text
    check (
      url is null
      or (
        url ~ '^https://[^[:space:]<>]+$'
        and length(url) <= 2048
      )
    ),

  source_type text not null
    check (
      source_type in (
        'official',
        'regulatory',
        'publication',
        'leaker',
        'supply_chain',
        'benchmark',
        'database',
        'social',
        'other'
      )
    ),

  published_at timestamptz,

  notes text not null default ''
    check (length(notes) <= 4000),

  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


-- =========================================================
-- DEVICE CLAIMS
-- =========================================================
--
-- A claim is an editorial assertion about one property.
--
-- Examples:
--   display.diagonal = 6.9 inch
--   battery.typical_capacity = 5800 mAh
--   chassis.width = 77.4 mm
--
-- value_json allows numbers, strings, ranges, booleans,
-- dimensions and other structured values without turning
-- the database into hundreds of device-specific columns.

create table private.device_claims (
  id uuid primary key default gen_random_uuid(),

  device_id uuid not null
    references private.devices(id)
    on delete cascade,

  component_id uuid,

  property_key text not null
    check (
      property_key ~ '^[a-z0-9]+(\.[a-z0-9_]+)*$'
      and length(property_key) <= 180
    ),

  value_json jsonb not null
    check (
      jsonb_typeof(value_json) is not null
      and octet_length(value_json::text) <= 16384
    ),

  unit text
    check (
      unit is null
      or length(unit) <= 40
    ),

  provenance text not null
    check (
      provenance in (
        'confirmed',
        'reported',
        'estimated'
      )
    ),

  confidence text not null
    check (
      confidence in (
        'low',
        'medium',
        'high'
      )
    ),

  confidence_reason text not null default ''
    check (length(confidence_reason) <= 2000),

  status text not null default 'active'
    check (
      status in (
        'active',
        'superseded',
        'disputed',
        'retracted'
      )
    ),

  valid_from timestamptz not null default now(),
  valid_until timestamptz,

  supersedes_claim_id uuid
    references private.device_claims(id),

  private_notes text not null default ''
    check (length(private_notes) <= 8000),

  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Prevent a claim for one device from referencing a
  -- component belonging to a different device.
  foreign key (component_id, device_id)
    references private.device_components(id, device_id)
    on delete cascade,

  check (
    valid_until is null
    or valid_until >= valid_from
  ),

  check (
    supersedes_claim_id is null
    or supersedes_claim_id <> id
  )
);


-- =========================================================
-- CLAIM ↔ EVIDENCE
-- =========================================================

create table private.claim_evidence (
  claim_id uuid not null
    references private.device_claims(id)
    on delete cascade,

  source_id uuid not null
    references private.intelligence_sources(id)
    on delete restrict,

  relationship text not null default 'supports'
    check (
      relationship in (
        'supports',
        'contradicts',
        'context'
      )
    ),

  note text not null default ''
    check (length(note) <= 2000),

  created_at timestamptz not null default now(),

  primary key (claim_id, source_id, relationship)
);


-- =========================================================
-- INTELLIGENCE AUDIT HISTORY
-- =========================================================

create table private.intelligence_events (
  id bigint generated always as identity primary key,

  device_id uuid
    references private.devices(id)
    on delete cascade,

  claim_id uuid
    references private.device_claims(id)
    on delete cascade,

  actor_id uuid not null
    references auth.users(id),

  action text not null
    check (length(action) between 1 and 100),

  message text not null default ''
    check (length(message) <= 4000),

  recorded_at timestamptz not null default now()
);


-- =========================================================
-- INDEXES
-- =========================================================

create index devices_updated
  on private.devices(updated_at desc);

create index device_components_device
  on private.device_components(device_id, sort_order, key);

create index intelligence_sources_updated
  on private.intelligence_sources(updated_at desc);

create index device_claims_device
  on private.device_claims(device_id, updated_at desc);

create index device_claims_property
  on private.device_claims(device_id, property_key, status);

create index device_claims_component
  on private.device_claims(component_id, status);

create index claim_evidence_source
  on private.claim_evidence(source_id);

create index intelligence_events_device
  on private.intelligence_events(device_id, id desc);

create index intelligence_events_claim
  on private.intelligence_events(claim_id, id desc);


-- =========================================================
-- SECURITY
-- =========================================================

alter table private.devices enable row level security;
alter table private.device_components enable row level security;
alter table private.intelligence_sources enable row level security;
alter table private.device_claims enable row level security;
alter table private.claim_evidence enable row level security;
alter table private.intelligence_events enable row level security;

revoke all on
  private.devices,
  private.device_components,
  private.intelligence_sources,
  private.device_claims,
  private.claim_evidence,
  private.intelligence_events
from public, anon, authenticated;

revoke all on sequence
  private.intelligence_events_id_seq
from public, anon, authenticated;


-- =========================================================
-- INTELLIGENCE CAPABILITY
-- =========================================================
--
-- For V1:
--   writers can contribute intelligence
--   editors/publishers can manage intelligence
--   admins inherit authority through the existing capability
--   architecture.
--
-- More granular intelligence roles can be introduced later
-- without changing the evidence model.

create function private.intelligence_can_write()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select
    private.has_capability('writer')
    or private.has_capability('editor')
    or private.has_capability('publisher')
    or private.has_capability('admin');
$$;

revoke all on function private.intelligence_can_write()
from public, anon, authenticated;

grant execute on function private.intelligence_can_write()
to authenticated;


-- =========================================================
-- IMPORTANT
-- =========================================================
--
-- No anonymous/public intelligence RPC is created here.
-- No client has direct table access.
-- No simulation output is persisted here.
-- No user-created scenarios are persisted here.
--
-- Public projections, Studio commands and deterministic
-- simulation functions are separate milestones.