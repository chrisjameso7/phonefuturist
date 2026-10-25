# Simulation reliability and export review

Branch: `fix/share-card-presentation` (based on `fix/simulation-evidence-integrity`).

## Changes

- Advanced edits, camera edits, resets and mode changes invalidate existing results and cancel in-flight work. Old result values cannot be downloaded under a newly edited device configuration.
- Calculation workers stop after 20 seconds with an actionable retry message. Timers are cleared on success, failure, cancellation and unmount; late responses from timed-out jobs are ignored.
- Removed the hidden 3.85 V fallback from both charging presentation paths. An illustrative energy-based charge estimate now requires supplied/calculated Wh. Existing eligible measured charging cohorts remain available independently.
- Charging scenarios reject arithmetic overflow and cannot report a zero-minute full charge after rounding.
- All six Advanced receipts use measured text wrapping, stacked labels and values, dynamic image height and 1080px output to reduce mobile canvas memory. Invalid/non-finite results are omitted. Every image identifies itself as a simulation rather than a measured device test.
- Battery exports identify active use rather than standby and preserve the workload mix. Charging and thermal exports distinguish scenarios. Benchmark names are readable. Camera receipts include available sensor area and entrance-pupil geometry.
- Simple summary exports label sustained scores as scenarios and clarify active-use/cooling assumptions; downloads expose progress, prevent repeated taps, recover from errors and time out a failed logo request.
- Comparison suggestions no longer fill all slots with storage variants of one phone, handle invalid limits safely, and avoid duplicated manufacturer prefixes. This presentation key is never used to join measurement evidence.
- Advanced Mode still has six individual receipts, with no summary share card.

## Verification

All 185 original simulation-prefixed suites were exercised in sequential batches to fit local memory limits. The only failures were six newly added export-test assertions that selected only full-word title fragments; those assertions were corrected to reconstruct every wrapped line. The complete export suite passed on rerun. The added charging safety suite and comparison suite also passed: **187 distinct suites / 720 tests** covered across batches and targeted reruns. This is not a claim that the entire repository test suite ran in one invocation.

Final verification:

- `npm run check`: 496 files, zero errors, warnings or hints.
- `npm run build`: passed; 2425.1 KiB client JavaScript across 21 files. The existing >500 kB simulator asset warning remains; this change adds about 2.5 KiB against the Phase A baseline, without adding dependencies.
- Actual browser downloads: Simple summary plus Display, Battery, Charging, Benchmark, Thermal and Camera PNGs all succeeded and were visually inspected. Long names and missing benchmark evidence remain legible.
- Advanced input edit: old results and all six download controls disappear; rerunning restores six controls. No Advanced summary card.
- Desktop and 390px mobile: no horizontal overflow. Mobile download works. No console warnings/errors observed.
- Final card layout regression suite: 8/8 passed after spacing adjustment; targeted export/charging/comparison group: 29/29 passed.

These checks cover the exercised paths; they do not prove the absence of every possible defect. The worker timeout is implemented but no forced browser worker-hang test was performed.

## Remaining release limitations

The stricter battery accuracy gate remains failing: historical same-protocol validation has 16.70% MAPE but only 70.10% of predictions within 20% (target >=80%); gaming is 22.41% MAPE. These are reconstructed comparisons, not new prospective lab tests. No acceptance thresholds or raw measurements were changed. Future-processor uplifts and cooling retention remain explicit assumptions. AI cannot create missing measured evidence.

Live simulator-feedback storage is still missing its existing migration, and prediction/Pro entitlement persistence is not yet connected. These are pre-existing deployment gaps, separate from local numerical/rendering correctness. No production migration, deployment, billing connection or paid service was added in this change.
