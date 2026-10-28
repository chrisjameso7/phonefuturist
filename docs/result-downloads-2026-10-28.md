# Result downloads and article headline refinement

28 October 2026

Long BOM and section receipts switch from a scrolling PNG to a paginated A4 PDF. Complete metric rows and chart blocks stay together; every page repeats the report/device heading and page number. Compact share cards and camera receipts remain PNG. Detailed legacy simulation receipts use PDF directly and their preview opens as a document rather than an image. CSV/JSON data exports and haptic WAV/JSON packs are unchanged.

The PDF writer and canvas pagination are loaded only with export rendering. No package, external rendering service, font download, simulation calculation, calibration data, database change or production binding is required. PDF pages contain locally rendered report artwork.

Desktop article headlines now use a 60 px maximum instead of 115 px, with a 1.08 line height. Mobile overrides remain unchanged. Haptics is retained because audio preview, pattern editing and downloads are usable across device classes, with native vibration on supported handsets.

Validation: Astro check 530 files with zero diagnostics; Vitest 215 files / 862 tests passed; Astro/Cloudflare production build passed. Browser exports verified a two-page named BOM PDF, an Advanced Mode thermal PDF with its chart, and a compact camera PNG. Poppler and the PDF parser validated the A4 output. Both BOM pages and the thermal page were visually inspected, including row boundaries, units, labels and footer numbering. The existing large simulation-data chunk warning remains.
