# Explicit phone comparison release

Date: 26 October 2026. Branch: `fix/explicit-device-comparison`.

The simulator no longer displays automatic predecessor/competitor cards. Simple and Advanced results each offer one explicit comparison panel: **Compare with predecessor**, a native **Select phone to compare with** menu, and **Clear comparison**. Nothing is compared until the reader chooses a baseline.

The current menu contains 208 phones with measured benchmark or battery evidence, excluding dated future releases and catalog entries marked unverified. Duplicate labels prefer fuller records with relevant measurements. Regional variants remain labelled. A predecessor is available only when the named concept has an exact preceding model in this menu; a visible variant matching the selected processor vendor is preferred. This selects the variant and does not transfer measurements across IDs.

The selected comparison shows:

- CPU single-core and multi-core percentage gains/losses, using the exact phone's measured matching Geekbench version against the concept estimate. Assumed future-processor uplift is explicitly labelled. CPU benchmark results are not presented as a universal SoC performance score.
- Estimated active-use battery-life gains/losses for the same requested usage and brightness scenario, only when workload protocols and energy bases match. Standby is excluded. Both runtime values are estimates.
- Battery capacity as a separate specification delta, with an explicit distinction from battery life.

Missing or incompatible information is withheld. No benchmark scores, battery measurements or percentage gains were invented. `(concept / selected phone - 1) * 100` determines each percentage; negative results read slower/shorter/smaller.

## Verification

- 77 tests in five suites passed, covering positive/negative deltas, invalid inputs, benchmark-version isolation, exact selected IDs, inferred-evidence rejection, eligible menu entries, battery protocol/energy compatibility, explicit controls and battery regressions.
- Final Astro check: 505 files, zero errors/warnings/hints.
- Production build passed: 2430.6 KiB client JS across 22 files. Existing oversized simulator bundle warning remains.
- Browser: no automatic comparison; predecessor button selected Samsung Galaxy S26 Europe for a Galaxy S27 concept with an Exynos 2700 scenario. Displayed 31.2%/30.2% projected CPU gains, 9.0% longer estimated active use, and a distinct capacity delta. These are this configuration's scenario outputs, not measured Exynos 2700 claims.
- Manual OnePlus 15 selection updated the same concept to 14.7%/27.1% projected CPU gains and 23.5% shorter estimated battery life. Clear removed the selected baseline/results. Mode switching discarded old results.
- Advanced Mode has one explicit comparison panel and retains all six section receipts. No Advanced summary share card was added.
- No horizontal overflow at the tested 1280px desktop viewport. Fresh mobile browser verification was unavailable because the browser viewport override did not take effect in the previous release; the layout has a single-column breakpoint and native select controls, but no new mobile browser pass is claimed.

The battery model's previously reported accuracy limitations remain unchanged; adding comparison percentages does not establish new real-world accuracy.
