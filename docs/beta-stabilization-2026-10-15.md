# October 15 beta stabilization

Branch: `design/phonefuturist-system-v1`.

## Scope

- Align the homepage hero, Latest and other editorial content with desktop navigation; retain the three centered destination cards and mobile padding.
- Simplify Simple and Advanced result presentation. Public cards keep useful numerical results, charts, units and an Estimated/Simulated designation. Internal version badges, evidence counts, coverage diagnostics and algorithm explanations are omitted from public presentation. Calculations, evidence data, uncertainty and feedback snapshot metadata remain in the existing engine.
- Keep controls, comparison names, metrics and receipts within narrow cards and give simulator controls a minimum 44px touch target.
- Load section PNG rendering only on download, with an accessible busy state and a recoverable error message. Keep the existing six section downloads and thermal plot.
- Separate immutable evidence payloads into their own build chunks using the existing Astro/Vite configuration. No simulation engine, coefficients, datasets, protocols, database schema or security policy was changed.

## Verification

Production-shaped local preview: built Cloudflare Worker served by Wrangler; Edge headless browser automation. No deployment was performed.

- Homepage and Lab audited at 360, 390, 430, 820 and 1440px without document horizontal overflow. Simple results audited at 360, 390, 430 and 820px; Advanced results at the same widths.
- At 1440px, navigation, hero and Latest measured approximately 1336px wide. The three destination cards retain their centered grid.
- Galaxy S27 Ultra test configuration: selected Exynos 2700, changed to a Snapdragon option, ran Simple, switched to Advanced, changed capacity to 6000mAh and wired charging to 80W, selected Exynos again, then ran Advanced. Capacity survived processor changes and the device name survived switching modes.
- Predecessor comparisons included Galaxy S26 Ultra and Galaxy S25 Ultra.
- Display, Battery, Charging, Benchmark, Thermal and Camera PNG receipts downloaded successfully. Changing the device name to a second concept and running again succeeded. No captured browser page errors. The mobile menu opened and closed with Escape. At 360px, the feedback dialog fit inside the viewport and all visible Simple Mode inputs, selects and buttons met the 44px minimum height.
- Feedback UI submission/confirmation tested with a local intercepted response, without sending a report to production. API tests separately cover validated insert, invalid payload rejection, signed-out denial, ordinary-member denial and authorized administrator retrieval. Existing database tests exercise submission and report access under RLS.
- Astro check: 484 files, zero errors, warnings or hints.
- Production build: passed. Simulator UI chunk approximately 151 KiB uncompressed. Largest evidence-data chunk approximately 676 KiB uncompressed / 44 KiB gzip; the remaining size warning is from immutable evidence data. Splitting one data module further would require a broader data-loading change and is deferred.
- Focused presentation/receipt/feedback tests: 35 passed.
- Full verification rerun: `npm.cmd test -- --maxWorkers=1` passed 808 tests across 206 files, with no skips (212.96s). The initial default-concurrency rerun had 803 passing tests and five skipped tests because the charging holdout setup exceeded its existing 240s timeout. That suite subsequently passed all five tests in isolation (118.48s), then passed as part of the full single-worker rerun. No test timeout, assertion, dataset or coefficient was changed to obtain the pass.

## Release checks that still need the deployed environment

Local Wrangler has no Supabase bindings configured. A live feedback insert and administrator retrieval must therefore be checked against the configured staging deployment before beta sign-off. The mocked browser test and local database tests do not establish remote migration/configuration state. Do not alter secrets or schema to make this check pass without approval.

Review the remaining evidence-data bundle warning on a real mobile connection. It is not a failed build and no evidence was discarded to suppress it.

Existing unrelated changes in `tests/simulation-battery-experience.test.ts` were present before this task and are deliberately excluded from the stabilization commits.
