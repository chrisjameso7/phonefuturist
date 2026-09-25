# Interactive Leaks beta verification — 2026-09-25

## Scope

Hardened the simulator workspace without changing Engine 0.4.0 or battery model 0.5.1-battery.1. Device + Environment + Model remains the calculation boundary.

- Captures input primitives before deferred React updates; distinguishes malformed numbers from unknown inputs.
- Calculates energy from the current device snapshot, eliminating stale battery results after edits.
- Labels power as whole-device average watts. Custom time shares must total 100%; missing power and invalid shares remain unresolved. Equal weighting and manual mixed-use power are explicit separate modes.
- Explains usable pack energy, optimistic blank-percentage behavior, provenance, confidence and assumptions. Supporting engineering metrics are collapsible.
- Keeps camera geometry editable and reusable, with unknown values preserved. Adds responsive input sizing and removes nested main landmarks.

## Changed files

- src/lib/simulation/beta-workspace.ts — input validation and calculation adapter.
- src/components/interactive-leaks/InteractiveLeaksSimulator.tsx — state, controls and results.
- src/pages/interactive-leaks/index.astro and simulate.astro — beta copy and landmarks.
- src/styles/lab-simulator.css — scoped responsive controls and result styling.
- tests/simulation-beta-workspace.test.ts — 30 regression cases.

## Verification

Baseline: 109 tests; Astro, calibration validation and build passed.
Final npm run verify: 139 tests across 15 files passed; 75 checked files, zero errors, warnings or hints; calibration validation passed (3 protocols, 5 devices, 8 measurements); production build passed.

Local production Worker browser checks: both Lab routes load; complete example yields 3.2 h from 19.25 Wh / 6 W. Custom 30/20/10/5/35 percent shares at 2/3/8/5/0.2 W yield 2.32 W and 8.3 h. Editing capacity/voltage to 2500 mAh / 4 V yields 10 Wh and 4.3 h. Totals of 95% and 105% remain unresolved. Keyboard deletion of voltage produces a missing-energy message. Camera add/remove works. No captured browser errors or warnings. Workspace document fits 390, 820 and 1440 px viewports without horizontal overflow.

Astro dev startup timed out locally; browser checks used Wrangler's local production Worker instead. Existing untracked review artifacts were preserved.

## Limits

The workspace accepts point estimates; model interval support is not a range-input UI. It estimates battery runtime and physical geometry, not measured benchmark scores, thermal behavior or image quality. Supplied powers remain unverified and runtime is not a lab measurement. No authentication/database policies, paid dependencies or engine versions changed in this beta hardening patch.
