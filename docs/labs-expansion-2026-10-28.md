# Labs expansion — 28 October 2026

## Frontend

The `/labs` hub contains BOM economics, the Canvas thermal simulator, the blind concept vault, the PWM waveform comparator and a link to the existing Interactive Leaks workspace. Existing simulator URLs remain valid. Desktop and mobile navigation link to Labs.

- BOM uses explicitly illustrative USD procurement assumptions; margins exclude tax, R&D, distribution, warranty and marketing. PNG exports contain the selected hardware and calculated values.
- Thermal scenarios reuse the existing two-node engine without editing its algorithms or calibration data. Cooling-to-engine mappings are illustrative. Canvas charts show a 15-minute timeline, with replay, scrubbing, throttle warnings and reduced-motion handling. FPS is a performance-equivalent estimate.
- PWM compares idealized square-wave timing, duty cycle and DC luminance on a static 8 ms window. It never flashes the display and does not claim to measure eye strain or determine a safe frequency.

## Supabase

Project: `ehldokmrgahrlcoyidjy`.

Applied and verified migration versions:

- `20261028145547` — lab_ecosystem_expansion
- `20261028145825` — lab_initial_concept_poll

The existing private `profiles.user_id` identity key is preserved. A generated `id` alias supports new references, with username/avatar fields mirrored from creator identity. The public `avatars` bucket accepts JPEG, PNG and WebP up to 2 MiB. Existing `profile-images` storage remains unchanged.

Avatar uploads use the authenticated session, signature validation and fresh user-owned paths. Failed profile attachment removes the newly uploaded object. Restrictive policies protect the avatars namespace even if other buckets have permissive policies. Users cannot overwrite another user's avatar or directly write scores or badges.

Predictions are immutable and unique per user and poll. `prediction_topic` stores the poll UUID, with its display question in `concept_polls`. The vault returns community percentages only after voting or closure. Authorized verified editors/publishers/admins create and resolve polls at `/studio/labs`. Resolution requires a closed poll and an HTTPS source. Ten correct resolutions award Industry Oracle once; this is a community achievement and never grants staff privileges. Role grants and existing authentication policies were not modified.

A single hypothetical folding-hinge poll closes at midnight on 28 November 2026, Africa/Lagos. No votes or community consensus were seeded.

The Security Advisor reports intentional callable SECURITY DEFINER functions and no direct policy on `concept_polls`. These narrow functions validate identity/capability, pin search_path, and preserve blind aggregation. Tables have RLS; direct score/badge/poll mutation grants are absent. No service-role key or management token belongs in application code.

## Verification

- `npm.cmd run check`: 0 errors, warnings or hints.
- `npm.cmd test`: 210 files / 843 tests passed before the final upload-test additions.
- Final avatar API suite: 9 tests passed, including 3 new upload tests.
- `npm.cmd run build`: Astro / Cloudflare passed. Existing 676 KiB evidence-data chunk warning remains; new frontend modules are small and loaded per route.
- Browser: BOM component updates and PNG download, Canvas replay and fan response, DC waveform switching; no horizontal overflow at 360, 390, 430 and 768 px on the calculators. Touch controls checked at 44 px or greater.
- Live Supabase: table RLS, avatar bucket restrictions, mutation permissions, anonymous blind vault RPC and publishable-key Data API verified. The first poll returns zero votes and hidden percentages.
- Authenticated avatar uploads and a real member's vote were tested locally at API/database boundaries; no real user's account was impersonated for live acceptance.

## Runtime and deployment

Reuse the existing `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` and `APP_ORIGIN` runtime bindings. Labs writes fail closed if configured against an unrelated Supabase host. Local preview without those bindings intentionally shows an unavailable vault rather than fake poll results.

The user authorized Cloudflare deployment on 28 October 2026. The repository target is `phonefuturist-dev` at `https://phonefuturist-dev.phonefuturist.workers.dev`. Deployment must preserve existing bindings (`keep_vars: true`). No main-branch merge is part of this work.

## Article engagement

Articles include native sharing with copy-link fallback, aggregate daily reader views and authenticated likes. The reader must reach the article end and spend 15 visible seconds reading before the UI unlocks liking; the database independently enforces the minimum elapsed time. Duplicate views per reader/day and duplicate likes per account are ignored. Reading records are private and the public RPC only returns counts and the current reader's status.

The article engagement migration was applied to the existing Supabase project. Final verification: Astro check 514 files, zero diagnostics; Vitest 211 files / 849 tests passed; Astro Cloudflare build passed. A pre-existing battery fixture edit is excluded from these commits.
