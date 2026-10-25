# PhoneFuturist Phase A: simulation evidence audit

## Inspected state and scope

Inspected `feat/account-search` at `7daee30a713be7c11a12534c54ffa33d2181c167`, with a clean working tree. Remote design branch remained `09a829b38f01603e864126033f6299fe8b68c856`; the remote account-search branch matched the local HEAD. No uncommitted contributor work was overwritten. Work continued on the focused `fix/simulation-evidence-integrity` branch.

The preceding account-search work is separately committed and deployed (PR #14; Worker version `80ecd8b2-82e4-4a08-9d52-1ad0b81ec2f0`). This Phase A simulation work has **not** been deployed. Its numerical changes are scenario plumbing and validation, not a new calibration or a claim that the accuracy target is achieved.

## What was already implemented

- Astro/React/TypeScript on Cloudflare Workers, Supabase Auth and RLS, server-scoped session checks and existing editorial role/MFA rules.
- Public News/Reports/Leaks/Analysis articles, private Studio publishing and audited role management, public creator identities and owned/public community simulations.
- Simple/Advanced modes, comparisons, six section receipts, daily energy-budget code and prediction snapshot/validation APIs.
- `soc-runtime-delta.ts`, `estimateMatchedSocBatteryScenario`, explicit +/-12% loaded-SoC what-ifs, a brightness selector and an experimental display factor.
- The measured battery engine deliberately ignores processor marketing names when choosing headline runtime peers. Exact measured benchmark-power comparisons are separate opt-in scenarios, not headline corrections.
- Pro pricing, a pure trusted-subscription resolver and comparison/feature policy helpers exist. Checkout is disabled. There is **no connected subscription persistence, protected Pro content retrieval, Intel feed or Pro publishing workflow**. A helper alone is not backend enforcement. Existing Advanced Mode remains free beta.
- Private device-intelligence source/claim/event tables exist; these are an evidence foundation, not an Intel Drop publishing system. No replacement intelligence system was created.

## Live schema audit

Read the canonical PhoneFuturist project `ehldokmrgahrlcoyidjy` through its authenticated SQL Editor. Public application tables were `creator_profiles`, `profiles`, `simulation_profiles` and `simulations`; all audited public/private tables had RLS enabled. Private account, role, article revision/event and device-intelligence tables were present. No application subscription/entitlement table was found. Prediction-history and beta-feedback persistence were not live.

`to_regclass('public.simulator_feedback')` returned NULL. The feedback API inserts into that table and maps storage failures to HTTP 503. This establishes a missing migration as the live feedback storage blocker; no fabricated production feedback was submitted. The existing `20261010094500_simulator_beta_feedback.sql` migration passes isolated persistence/access tests but was not applied during this phase, because the master brief requires explicit approval for production migrations.

## Findings and fixes

1. The shared `simulateSimpleMode` path dropped brightness, although the main React workspace passed it through. Brightness now survives preset expansion and reaches the shared battery engine.
2. Workload cards and mixed-use totals used different scenario adjustments. Each workload now receives the existing usage/display/cooling/SoC what-if factor once; the same adjusted drain feeds its card, mixed-use contribution and daily energy budget. Raw corpus arithmetic and an explicit `referenceExpectedHours` remain available.
3. A neutral 400-nit selection could enable unrelated geometry adjustments when no hardware scenario was selected. Brightness is now independent of that gate. Missing/invalid brightness stays neutral.
4. Non-finite, negative, over-24-hour or unsupported requested workload mixes no longer produce misleading partial/non-finite headlines. Mixed-use/calendar results are withheld with a reason. Available individual workloads can still be shown. Combined estimates are also withheld when workload references mix Wh and capacity-only bases, rather than silently blending incompatible evidence.
5. Invalid battery-cell capacities and invalid display-scenario numbers are handled without constructing a fictitious usable pack or NaN output.
6. Matched SoC comparison now rejects unsupported runtime protocol values. Tests cover missing curves, invalid score/duty inputs, duplicate-handset references, region/storage aliases of one phone model and incomplete Wh evidence. It still requires two independent exact-reference-SoC phones and transfers only the matched board-power difference, never full target board power.
7. Simple Mode now displays the reference chip and existing assumed CPU uplift. GPU retention and sustained CPU outputs are explicitly labelled cooling-based scenarios rather than measured stress-test results. No benchmark scores, clocks, curves, voltage defaults or uplift coefficients were inflated or replaced.
8. Per-invocation corpus results are reused instead of repeating the same workload lookup for the mixed-use calculation.
9. Added `npm run audit:simulation` and `npm run check:simulation-accuracy`. The latter fails unless overall and per-workload MAPE are <=20% and at least 80% of predictions are within 20%, with adequate sample counts. It does not weaken the existing targets.

## Reproduction and scientific interpretation

The audit uses a clearly hypothetical 5,500 mAh, 6.7-inch FHD/120 Hz configuration and a 2h browsing / 2h video / 1h gaming mix, without inventing target voltage. Exynos 2700, future Snapdragon Elite Extreme Gen 6 and unknown processor selections each return **10.73 active-use hours** under the neutral generic cohort. This is an evidence limitation, not proof that their real efficiencies are equal. No measured future-chip penalty was invented.

The brightness-only sensitivity is 11.47h at 200 nits, 10.73h at the neutral 400-nit reference, 9.83h at 800 nits and 9.24h at 1,200 nits. These are outputs of the existing uncalibrated sensitivity assumptions, not measurements. In the actual local Simple Mode UI, its different default 6.8-inch QHD/large-VC profile changed from 10.8h to 8.7h between 200 and 1,200 nits.

The current peak estimator uses Exynos 2600 references plus pre-existing **27% single-core / 25% multi-core assumed uplifts** for Exynos 2700. With the audit query's context it returns 3,980.815 and 13,388.75. These are illustrative assumptions, not verified Exynos 2700 measurements. Historical 3,156/10,803 and alleged 4,328/14,700 values were not substituted into the model. Cooling maps, not verified target-device stress tests, generate the 15-minute GPU/CPU retention scenarios.

Display size/resolution/refresh/brightness affect bounded scenario factors and comparable selection. Panel technology is not a measured battery-power input in this path. Network/signal conditions are not independently modelled. Calendar endurance requires an explicitly supplied standby draw and Wh budget; otherwise only active-use endurance is available. Better cooling can increase sustained gaming draw; it does not receive a blanket endurance bonus.

The optional matched SoC comparison remains a benchmark-board-power transfer with an assumed duty fraction. It is **not validated for whole-device browsing/gaming** and was not promoted into the headline estimate. Future chips without exact curves remain unresolved. Prediction ranges describe peer variation, not calibrated confidence intervals.

## Calibration metrics reproduced

All figures below are reconstructed from repository data, not new laboratory measurements. Same-protocol rows hold out the entire target device; historical rows additionally use only earlier released phones. No target device was found among its own references. Release-date ordering does not prove measurements were available before the target launch, so the past-devices-only analysis is still a reconstruction rather than prospective validation. Cross-protocol results are reported separately in the JSON artifact and are not used as same-protocol acceptance evidence.

| Evaluation | Workload | n | MAPE | Within 20% | Signed bias | P90 absolute error |
|---|---|---:|---:|---:|---:|---:|
| sparse / leave-one-device-out | web_browsing | 99 | 14.61% | 75.76% | +0.00% | 29.35% |
| sparse / leave-one-device-out | video_playback | 99 | 13.30% | 78.79% | +0.31% | 29.95% |
| sparse / leave-one-device-out | gaming | 99 | 21.80% | 56.57% | -0.14% | 38.68% |
| spec-enriched / leave-one-device-out | web_browsing | 99 | 14.87% | 75.76% | -0.02% | 31.85% |
| spec-enriched / leave-one-device-out | video_playback | 99 | 13.38% | 78.79% | +0.20% | 31.20% |
| spec-enriched / leave-one-device-out | gaming | 99 | 22.62% | 53.54% | -0.38% | 40.49% |
| sparse / past-devices-only | web_browsing | 97 | 14.76% | 71.13% | -1.01% | 32.58% |
| sparse / past-devices-only | video_playback | 97 | 12.94% | 79.38% | -2.28% | 30.59% |
| sparse / past-devices-only | gaming | 97 | 22.41% | 59.79% | +3.53% | 39.65% |

Historical aggregate: **291 evaluated, 6 skipped; 16.70% MAPE; 70.10% within 20%**. The overall 80% coverage target fails. Historical gaming also fails the <=20% MAPE target (22.41%). Sparse leave-one-device-out aggregate: 297 rows, 16.57% MAPE, 70.37% within 20%. Adding available specifications did not improve this dataset's aggregate error, and was not used to claim a win.

The wiring fixes do not alter the raw corpus estimator, so these calibration metrics remain unchanged. A trustworthy improvement requires relevant independent device/workload/power evidence and training/validation separation; tuning penalties on the held-out scores would not establish validity.

## Verification actually performed

- Before edits: seven baseline suites / 30 tests passed.
- Five newly added regression cases failed on the original implementation, then passed after the fixes.
- Thirteen targeted suites / 61 tests passed, followed by four focused suites / 25 tests after the mixed-energy-basis guard (overlapping checks; not summed), covering SoC/brightness/Wh consistency, invalid/missing evidence, calendar budgets, feedback API and isolated PostgreSQL persistence, comparisons and receipt boundaries. A previous expanded nine-suite run also passed 36 tests, including peak-performance regressions; these overlap and are not summed.
- Astro check: zero errors, warnings or hints. Production build succeeds; the pre-existing >500 kB simulator asset warning remains (about 2.42 MiB total client JS).
- Standard calibration data/check scripts passed. These validate existing data/models and are not proof that runtime accuracy targets pass.
- `ENFORCE_SIMULATION_ACCURACY=1` same-protocol test and the new strict accuracy command both fail on the documented coverage/accuracy gap. This failure is retained.
- Local built-Worker browser check: workspace hydrates on visibility; Simple Mode brightness affects the rendered result, CPU assumptions are visible, Advanced Mode runs and exposes all six section exports, and a battery PNG downloaded successfully. Advanced has no summary share card. Desktop and 390px mobile results have no horizontal overflow; browser error/warning log is empty.
- Hosted feedback persistence remains unverified because the table is absent and production migration approval is required. No new production secrets, roles, billing service or paid resource was created.

## Files changed

- `src/lib/simulation/modules/battery-experience-engine.ts`
- `src/lib/simulation/modules/display-power-scenario.ts`
- `src/lib/simulation/modules/soc-runtime-delta.ts`
- `src/lib/simulation/simple-mode.ts`
- `src/lib/simulation/simple-mode-engine.ts`
- `src/components/interactive-leaks/SimpleModePanel.tsx`
- `src/components/interactive-leaks/InteractiveLeaksSimulator.tsx`
- `src/components/interactive-leaks/simulation-results-layout.css`
- Three related simulation regression test files
- `scripts/audit-simulation-evidence.ts`, `package.json`, and this report

## Completion status and release boundaries

The processor-specific battery issue is **partially addressed**: existing measured comparisons remain guarded and separate, scenario consistency/brightness are fixed, and unsupported future-chip efficiency is not fabricated. The scientific accuracy/relevance gap remains unresolved. Phase A is not labelled fully calibrated or production-ready.

Pro access is **not currently enforced end to end by a connected subscription backend**, because that product layer does not yet exist. Phase B/C entitlement persistence, protected Intel Drops/threads/corrections and editorial publishing remain later work. Watchlists, notes, alerts, briefings and moderated submissions are deliberately deferred. No ordinary reporting was paywalled, and no fake content/subscribers were seeded.

This patch is prepared for a focused review on `fix/simulation-evidence-integrity`. It does not merge main or deploy a release. The previously deployed account search remains the live site. The master brief explicitly requires approval before new deployments/production migrations; the feedback migration and a simulation preview deployment therefore remain review actions, not automatic steps.
