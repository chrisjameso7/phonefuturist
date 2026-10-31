# Domain auth, verification and advertising release — 2026-10-31

## Changed files

- `src/lib/security.ts`: exact apex/www/legacy origin allowlist, local development origins, credentialed CORS helpers, shared strict lowercase 3–20 handle rule and help text.
- `src/lib/supabase.ts`: environment-only Supabase public configuration, optional comma-separated `ALLOWED_ORIGINS`, trusted request-host callback origins.
- `src/lib/session-client.ts`: HTTPS cookie security follows the actual request; existing host-only, HttpOnly, SameSite=Lax cookies retained.
- `src/middleware.ts`: exact unsafe-method checks, OPTIONS handling and matched-origin CORS; verified Pro ad audience; preserve generated Astro CSP; private/no-store responses retained.
- `astro.config.mjs`: middleware replaces Astro's same-origin-only form guard; permit the site's bundled scripts in generated CSP.
- `src/pages/auth/[action].ts`, `src/pages/auth/google.ts`: signup, recovery and OAuth callbacks stay on the trusted host carrying the PKCE cookie.
- `src/pages/account/api/creator-profile.ts`, `src/components/labs/CreatorProfileEditor.tsx`: reject uppercase, whitespace and >20-character handles; explicit helper text; preserve avatar updates.
- `src/lib/creator-identity.ts`, `src/components/RoleBadge.astro`: protected database role projection; gold Admin, green Writer and blue Pro check marks; standard members have no verification check. Bounded public creator prefix search.
- `src/lib/billing/pro-members.ts`: recognizes only administrator-managed `Pro` entries in the existing SELECT-only `user_badges` table. Does not enable checkout or grant paid-feature access.
- `src/pages/account/index.astro`, `src/pages/creator/[handle].astro`, `src/pages/interactive-leaks/explore.astro`, `src/pages/interactive-leaks/profile/[id].astro`, `src/pages/interactive-leaks/simulation/[id].astro`: verified checks on profile and community author headers; public creator search. There is no separate public comments UI in this checkout.
- `src/lib/advertising.ts`, `src/layouts/Page.astro`, `src/env.d.ts`, `public/ads.txt`: AdSense client `ca-pub-1048772235239044`; homepage/article pages only; anonymous and signed-in free readers eligible, verified Pro excluded. Unverifiable signed-in ad status suppresses advertising. Ad vendor CSP changes scoped to ad pages. No ad unit IDs invented; Auto ads must be configured in AdSense.
- `.dev.vars.example`: optional extra origin configuration documented; no secrets included.
- `supabase/migrations/20261024224715_creator_identity_badges_and_uploads.sql`, `20261024231315_account_directory_search.sql`: recovered existing remotely applied migration sources; not newly applied or changed on production.
- `supabase/migrations/20261031134500_public_creator_identity_badges.sql`: only new/changed username and handle validation triggers. Legacy 21–24 character identities remain readable; no keys, RLS policies or indexes changed.
- `tests/domain-identity.test.ts`, `tests/domain-middleware.test.ts`, `tests/creator-identity-database.test.ts`, `tests/creator-profile-edit.test.ts`: exact origin, callback, CORS, username, public search, protected badges and free/Pro advertising regression coverage.

## Manual dashboard settings

Cloudflare Worker `phonefuturist-dev`:

- Set `APP_ORIGIN=https://phonefuturist.com` as the canonical origin when convenient. The code already explicitly accepts both custom domains and the legacy Worker host even while the current APP_ORIGIN retains the legacy value.
- Optional `ALLOWED_ORIGINS=https://phonefuturist.com,https://www.phonefuturist.com,https://phonefuturist-dev.phonefuturist.workers.dev`. These are already built in; no wildcard or substring matching.
- Keep `SUPABASE_URL=https://ehldokmrgahrlcoyidjy.supabase.co` and existing `SUPABASE_PUBLISHABLE_KEY`. Project URL and key presence/type were verified without exposing key values. No secrets, routes, DNS or production dashboard settings were modified.

Supabase Auth URL Configuration:

- Site URL: `https://phonefuturist.com`.
- Allow `https://phonefuturist.com/auth/callback` and `https://www.phonefuturist.com/auth/callback`, plus each with `?next=/account/password` for recovery.
- Retain `https://phonefuturist-dev.phonefuturist.workers.dev/auth/callback` and its recovery callback until confirmed unused.
- Retain development callbacks `http://localhost:4321/auth/callback` and `http://127.0.0.1:4321/auth/callback`, including recovery next query if used.
- Google provider's authorized redirect URI remains `https://ehldokmrgahrlcoyidjy.supabase.co/auth/v1/callback`.
- These dashboard settings were not changed automatically. Real-mail confirmation, recovery and successful Google sign-in still require end-to-end acceptance with a controlled account.

AdSense:

- Add/verify phonefuturist.com, obtain account/site approval, and enable Auto ads in the AdSense console. Configure its required consent message/CMP for applicable regions.
- Public ads.txt is present. Ad delivery depends on Google approval, placement configuration and consent; loading the script does not guarantee an ad will display.
- No Pro assignments currently exist in `user_badges`; authorized administrators must assign the exact `Pro` badge to Pro members. Ordinary users have no INSERT/UPDATE privileges on that table.

## Commands and verification

```powershell
npm.cmd run check
npm.cmd test -- --maxWorkers=1 --testTimeout=15000
npm.cmd run build
node node_modules/wrangler/bin/wrangler.js deploy
```

- Type check: zero errors, warnings or hints.
- Full suite: 221 files, 900 tests passed. Subsequent badge/Pro/CSP edits: focused suite 4 files, 19 tests passed.
- Production build passed. Existing oversized simulation-data (676 KiB) and Three.js scene (596 KiB) warnings remain; calculation/data changes were outside this patch.
- Migration dry run included only the new validation migration; applied successfully. Live SQL confirmed both triggers, SECURITY INVOKER, public creator read, private profile protection and retained unique handle index.
- Live apex, www and legacy login POSTs reach auth (303 for intentionally empty credentials); OPTIONS 204 with exact origin/credentials; hostile suffix origins 403 without CORS. Browser dummy login reaches the normal invalid-credentials page, not the origin rejection.
- Live administrator creator page and creator search return the gold check markup; ads.txt returns the configured publisher record.
- No production user, password, role assignment or payment was created or changed for testing.

## Launch status

Domain origin blocker fixed. Keep beta labels pending controlled successful signup/email verification/recovery/OAuth checks, AdSense account/consent setup and final launch acceptance. Existing advisor warnings include public SECURITY DEFINER RPCs and disabled leaked-password protection; these predate this patch and were not changed as unrelated security work. Database migration does not alter RLS.

Matte/nano-texture/video-preview work is preserved separately in the named Git stash and is not included in this release. Existing uncommitted battery test edits were not included.
