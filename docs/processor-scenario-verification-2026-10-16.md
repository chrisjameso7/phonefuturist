# Processor scenario verification — 2026-10-16

Reviewed the processor changes through `38cfbfc`, plus subsequent remote brightness and opt-in measured-power additions through `09a829b`.

## Interpretation

- Exynos 2700 Geekbench 6 defaults are explicit predecessor-relative what-if presets: +27% single-core and +25% multi-core. They are not measured chip results. Unverified news figures remain documentation context rather than calibration evidence.
- Neutral battery power leaves the baseline unchanged. Efficiency/performance scenarios assume minus/plus 12% of the loaded processor contribution, with assumed workload shares. They do not imply a measured Exynos-versus-Snapdragon efficiency ranking or a 12% change in whole-phone endurance.
- Matched measured board-power comparisons require compatible exact-chip curves, protocol and Wh-backed reference-phone evidence. They remain opt-in and separate from headline battery results.
- Neutral results for unreleased processors may legitimately remain identical. This patch does not supply missing real-world efficiency measurements.

## Controlled engine probe

Test inputs: Galaxy S27 Ultra concept, Samsung / Exynos 2700, 5500 mAh, 6.8-inch QHD, 120 Hz, large vapor chamber, Typical active-use mix. These are test inputs, not confirmed device specifications.

- GB6 single-core predecessor baseline 3134.5 → scenario 3980.815 (+27%).
- GB6 multi-core predecessor baseline 10711 → scenario 13388.75 (+25%).
- Neutral active-use battery estimate: 10.1505 h.
- Efficiency-focused what-if: 10.6064 h.
- Performance-focused what-if: 9.7322 h.

These numbers depend on selected reference data and scenario conditions. They are not measured endurance or benchmark results.

## Integration corrections

- Forward optional Simple Mode brightness through the validated expansion into the battery/display form state. Omission clears stale brightness and preserves unspecified reference conditions. Reject non-positive or non-finite explicit brightness.
- Label assumed Advanced benchmark results and their receipts as projected what-ifs.
- Include the selected processor power scenario in feedback snapshots and saved-prediction assumptions.
- Preserve the pre-existing unrelated battery-test fixture without including it in the correction commit.

## Deployment boundary

No staging deployment is part of this verification. The independently observed staging feedback HTTP 503 and absence of an authorized admin retrieval session remain unresolved; processor scenarios do not fix that storage problem.

## Verification results

- Focused suites: 33 passing tests across five files.
- Full Vitest suite with one worker: 827 passing tests across 207 files.
- Astro check: 487 files, no errors, warnings or hints.
- Calibration checks and production build passed; existing calibration/evidence and data-bundle warnings remain.
- Local production Worker browser test at 390px passed with no captured page errors. Neutral/efficiency/performance displayed 10.2/10.6/9.7 active-use hours; neutral was exactly restored after changing scenarios. Brightness 200/1200 nits displayed 10.8/8.7 hours; returning to reference conditions restored 10.2 hours and cleared Advanced brightness.
- The browser configuration selected a slightly different benchmark reference weighting from the narrow engine probe: projected 4007 single-core and 13499 multi-core. This is expected because configuration/context affects reference selection; no fixed target score is promised.
- The chosen power scenario is included in feedback snapshots and saved-prediction assumptions for reproducibility.
