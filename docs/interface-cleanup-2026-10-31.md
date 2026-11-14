# Interface cleanup — 31 October 2026

- Replaced repeated lab navigation rows with a shared, keyboard-accessible native disclosure menu and All labs link. Routes remain available.
- Removed the outer duplicate device-category navigation; the in-workspace selector retains each category configuration.
- Replaced repeated slogans with concise tool names and functional section headings. Reduced shared lab heading size and introductory spacing.
- Normalized the shared browser-title suffix and corrected Labs, Pro and Community titles.
- Kept visual spec/design exports prominent; moved BOM configuration, haptic pattern and simulation-record JSON into explicitly labelled Advanced export disclosures. Audio download and haptic profiles remain available.
- Kept one Beta / Simulated designation in the Interactive Leaks workspace, removing duplicate outer and Simple Mode beta labels. Feedback remains available.
- Community renders only populated feed sections and useful section links. When no builds or reusable profiles exist, it shows one invitation to publish. Creator search and its no-match feedback remain available.
- Consolidated scoped newsroom mobile rules, retained their final declaration values, merged duplicate lab input/alignment styling and removed unused old lab-nav styles.

No simulation algorithms, calibration data, component prices, authentication, roles, database schemas or policies changed. Existing unrelated battery-test edits and separately stashed display/video work are excluded.

Deployment is separate from this cleanup commit.

Verification so far: Astro check passed with zero errors/warnings; production build passed with the existing oversized-asset warnings. Browser verified the native tool switcher at 360, 390, 430 and 768px without horizontal overflow; JSON export is hidden until expanded; empty Community shows one invitation and retains search; title is Explore followed by one brand suffix.

Final verification: 222 test files / 904 tests passed with `npm.cmd test -- --maxWorkers=1 --testTimeout=15000`. Final `npm.cmd run check`: zero errors, warnings or hints. Final `npm.cmd run build`: passed; existing >500 KiB simulation-data and Three.js scene warnings remain. Newsroom scoped CSS final declaration maps compare equal before/after consolidation. No deployment performed.
