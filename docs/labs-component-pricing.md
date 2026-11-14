# Labs component pricing review — 28 October 2026

Internal engineering/editorial record. This file is not rendered by the public Labs pages.

## Catalog and ownership

The BOM catalog contains 1,476 options in 43 component slots, including 1,143 additional configured variants beyond the 333-entry base catalog. These are distinct planning configurations, not 1,476 independently verified, orderable supplier SKUs. A named sensor is a sensor-only line; the main lens/OIS line is separate. Ultrawide, telephoto and front-camera choices are complete module allocations. Memory bundled with a processor package has its own zero-additional-cost option to avoid charging for RAM twice.

All component prices are owned by PhoneFuturist in `src/lib/labs/bom-catalog.ts`. There is no public unit-price input. Quantities are configurable, and retail price remains the user's target. USD line items are rounded to cents. Existing panel resolution/refresh scaling is preserved, with one shared price helper used by the dropdown, summary and calculation. The previous opaque $135 remainder has been replaced by selectable itemized components.

The configured catalog covers specific panel sizes, luminance grades and surface finishes; camera focal lengths, focus/stabilization packages and sensor formats; RAM capacities and transfer rates; storage capacities, interfaces and NAND grades; battery capacities, cell counts and chemistries; and vapor chamber area/thickness. These variants use editorial cost allocations. They are not evidence of a vendor offering every combination. Public output is labeled **Estimated BOM**. Public pricing formulas, assumptions and engine notes are removed.

## Price review and limitations

Manufacturer pages generally do not establish negotiated smartphone SoC unit prices. Do not describe these allocations as confirmed purchase quotations. No purchased reports, private quotes or paywalled tables were accessed.

| Processor | Catalog USD | Basis |
| --- | ---: | --- |
| Exynos 2700 | 260 | User-provided editorial allocation; no independently verified unit price found. |
| Snapdragon 8 Elite Extreme Gen 6 | 300 | User-provided allocation; reports of the earlier Pro name suggest above $300. Exact later Extreme pricing remains unconfirmed. |
| Snapdragon 8 Elite Gen 6 | 250 | User-provided allocation; not a manufacturer quote. |
| Snapdragon 8 Elite Gen 5 | 260 | Editorial midpoint of the reported $240–280 range. |
| Snapdragon 8 Elite | 220 | Reported $220+ lower-bound anchor; editorial allocation. |
| Snapdragon 8 Gen 3 | 185 | Editorial midpoint of the reported $170–200 range. |
| Snapdragon 8 Gen 2 | 160 | Reported unit-price anchor. |
| Other named processors/components | Catalog values | Editorial planning allocations; not individually substantiated wholesale quotes. |

Sources inspected:

- [Qualcomm's September 2026 announcement](https://www.qualcomm.com/news/releases/2026/09/snapdragon-leads-the-agentic-ai-age-with-two-of-the-world-s-fast): official product naming and launch context; no unit pricing supplied.
- [Abhishek Yadav's original May 12 pricing post](https://twitter.com/yabhishekhd/status/2054084664323870976): original leak attribution, reproduced by PhoneArena; direct fetch returned 403, so independent access to the original post was unavailable.
- [PhoneArena report reproducing the pricing post](https://www.phonearena.com/news/rumored-snapdragon-8-elite-gen-6-prices-may-make-android-phones-more-expensive-than-ever_id180312): secondary attribution for the historical Snapdragon ranges. Leak claims remain unconfirmed.
- [Counterpoint's S23/S24/S25 Ultra cost comparison](https://counterpointresearch.com/en/insights/post-insight-research-briefs-blogs-a-detailed-look-at-the-shifting-bom-cost-of-samsung-galaxy-s23-ultra-s24-ultra-and-s25-ultra): primary teardown analysis supports the increase in SoC costs, including 21% from S24 Ultra to S25 Ultra; it does not substantiate the entire catalog's individual prices.
- [TechInsights S24 teardown](https://www.techinsights.com/ko/node/57042): primary teardown overview identifies component suppliers and cost categories; no private report content imported.
- [Intel mobile product comparison](https://www.intel.com/content/www/us/en/products/compare.html?productIds=240957%2C237327): no usable recommended customer price shown for the selected laptop package; laptop allocations remain editorial values. On-package RAM is accounted for via the included-memory choice.

## Haptics

Four pulse profiles, a bounded custom editor, native vibration dispatch, Web Audio clicks and portable JSON / PCM WAV downloads. Web Audio schedules click offsets; physical motor latency and browser scheduling prevent a promise of exact audio/motor synchronization. Browser vibration has no amplitude or frequency control. It does not install a system notification pack automatically. The UI reports capability, never claims that API success proves a motor is present. Playback stops on navigation/unmount, page hide and pattern edits.

[MDN Vibration API](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/vibrate) documents sticky user activation, limited compatibility and browser truncation. Unsupported browsers receive audio playback and downloads. Hardware response requires acceptance on a physical supported handset.

## New Interactive Leaks device concepts

Separate foldable/tablet/laptop preview routes expose the existing geometry and battery-energy engine. Book/flip foldables have independent primary/cover displays. Battery energy is entered in Wh across classes. Runtime is an explicit energy/system-draw scenario; charge time is labeled an ideal minimum. No phone benchmark cohorts, calibration coefficients, thermal datasets or vendor efficiency rankings are reused for larger devices. These are the first physical/power workspaces, not calibrated laptop/tablet benchmark coverage. Existing phone workflows and Interactive Leaks methodology presentation are unchanged.


## Verification for this expansion

- `npm.cmd run check`: 528 files, zero errors, warnings or hints.
- `npm.cmd test`: 214 files / 859 tests passed; the focused BOM, haptics, device concepts and existing Labs calculator suites passed 14 tests.
- `npm.cmd run build`: clean Astro / Cloudflare build passed. The BOM module is approximately 17 KiB and device concept frontend 12.4 KiB. Existing 676 KiB simulation-data warning remains.
- Browser: confirmed named BOM, catalog search, fixed $300 chip selection, quantity totals, PNG and JSON export contents. No horizontal overflow or controls under 44 px at 360, 390, 430 and 768 px on BOM, haptics and foldables. Tablet/laptop layouts also passed overflow checks at all four widths.
- Haptics: preset/custom timing, repeats, playback dispatch, stop, JSON pack and actual PCM WAV download verified; browser error log empty. Physical motor sensation and hardware audio/motor latency require a supported handset check.
- Devices: cover/inner display switching, comparison pin, independent family settings, laptop power changes, editable numeric drafts and PNG receipt download verified. Existing mathematical simulation modules, calibration data, database schema and production settings were not changed.
- This new batch is committed locally for review. The earlier deployed Labs/article version remains live; this expansion has not been deployed automatically.
