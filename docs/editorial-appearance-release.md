# Editorial appearance release — 2026-11-03

This follows the UI refinement in 54a8edf/4946a01 and the user's explicit approval to apply the confidence migration and deploy. The later desktop-header request is the one exception to removing UI glass: its background becomes blurred while scrolling.

## Changes

- Removed the navigation refraction/SVG displacement engine, optical cursor code, obsolete glass variables, backdrop styles and optical overlays. Renamed navigation-glass.css to navigation.css and lab-glass classes to lab-panel. Removed the five tests for the deliberately removed optical engine; retained navigation/state tests.
- Neutral black/charcoal surfaces replace the navy surfaces. Blue remains an action/link/focus color.
- Added locally stored Dark, Light and System choices in the existing desktop header and mobile menu. The existing theme-init.js resolves the preference before paint, synchronizes selectors and follows OS changes only in System mode. Blocked storage does not break switching.
- Light mode has dedicated surface, text, border, status and action colors. Canvas charts repaint on appearance changes. Device materials and images are unchanged.
- Mobile uses flat editorial rows, hairline dividers, restrained masthead/navigation styling and clearer article typography. No navigation link, simulator control, export, article interaction or account feature was removed.
- Desktop navigation is fixed at the top, edge to edge, with no rounded rail/container. It stays opaque at scroll zero; beyond 8px it uses a restrained live backdrop blur. All links/account actions remain visible. Reduced-transparency users retain an opaque header; browsers without backdrop support retain the solid fallback. Mobile has no blur.

## Approved Supabase migration

Applied only `20261103135403_article_confidence_label.sql` to the already-linked `ehldokmrgahrlcoyidjy` project. CLI dry-run showed this as the sole pending migration. Current function bodies matched the migration's expected predecessors before applying it.

Command: `supabase db push --linked --skip-vault --yes`.

Verification returned true for migration recorded, confidence validation, confidence projection, public read permission preserved, private validator inaccessible to anonymous callers, and functioning public article projection. No table, RLS policy, role, authentication configuration or secret was changed. The connector denied access; the existing authenticated CLI connection completed the migration.

## Verification

- Source preservation: all 56 original routes and 667 recorded control definitions remain.
- Astro check: zero errors, warnings or hints.
- Full default-timeout run: 941 passed / 944 tests; three calibration tests exceeded 5 seconds while browser/build checks were running. The affected two files passed all four tests in a focused rerun with a 20-second test timeout. No calculation or calibration changes were made to address timing.
- Focused appearance/confidence/database tests: 15 passed.
- Build: passes; pre-existing >500 KiB simulation evidence / 3D scene warnings remain.
- Browser appearance checks: 100 viewport/theme combinations across ten pages, 360/390/430/768/1440px; no overflow or page errors. Appearance controls, persistence and asynchronous OS preference changes passed.
- Additional final checks and deployment details are recorded below once completed.

The pre-existing tests/simulation-battery-experience.test.ts edit remains outside this change and unstaged. No merge to main.

## Final local checks

- Final Astro check: 591 files, no errors, warnings or hints.
- Appearance/navigation focused tests: 27 passed.
- Fixed-header browser checks: dark/light at 1280, 1440 and 1920px. Header remains at top zero and full viewport width, square corners, no blur at top, 18px blur only after scrolling; no other element blurs. Mobile navigation remains available and opaque.
- All ten interaction journeys pass again on the final header/theme implementation, including PDF export, thermal replay/mobile results, 3D dimensions, Simple/Advanced, tablet/foldable/laptop selection, creator retry, Studio and articles. Zero page errors.
- Source preservation and whitespace checks pass. Existing uncommitted battery test changes remain unstaged.

## Deployment

Deployed the original project configuration (not the local fixture configuration) with existing production variables preserved:

`wrangler deploy --config dist/server/wrangler.json --keep-vars`

Worker: phonefuturist-dev. Version: `05c54040-c9df-4a0d-aede-1f76ca49542b`. Release implementation commit: `7f582f7`.

The live Supabase migration remains recorded as `20261103135403`. No change to Cloudflare production variables, secrets, domains or authentication settings was requested or made.

Live read-only smoke checks passed on both phonefuturist.com and www.phonefuturist.com: HTTP 200, production content (no local fixtures), neutral dark background, full-width fixed navigation, scroll blur, Light mode persisting across reload, Labs/BOM/Interactive Leaks/login/articles routes, and the mobile appearance menu/Community link. No page-level JavaScript errors or mobile overflow. The browser check waits for DOM readiness rather than global network-idle, since advertising/network activity can remain ongoing.
