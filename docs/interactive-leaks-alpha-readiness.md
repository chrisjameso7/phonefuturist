
## Alpha preparation — implementation and release checklist

This pass stays on feature/interactive-leaks-beta. Do not merge into main; deploy only the existing development Worker after verification.

- Simple is the default; editorial Light/Typical/Heavy usage presets are minutes/day, not measurements. Custom non-overlapping active durations may total less than 24 h; remaining time is idle. More than 24 h is invalid. Custom values survive mode and preset changes.
- Advanced power, percentage shares and usable-energy semantics remain intact. Simple ignores the manual derating value while preserving it for Advanced. Simple power reuse requires explicit consent; no fitted device-power resolver exists yet. Seed runtime observations are not silently converted into watts.
- Rated capacity is the calculation input. Separate typical/advertised capacity and processor metadata are not supported by the current engine schema and were not invented.
- Engine 0.4.0 and battery 0.5.1-battery.1 remain unchanged. PPI already derives from diagonal and resolution; battery volume still requires cell geometry.
- Share exports use a deeply frozen copy of the calculation and context. Fixed 1080 x 1350 PNG card; 1080 px wide variable-height technical receipt; plain-text summary; optional native text sharing; downloadable JSON simulation record. Images stay client-side. A compact non-cryptographic configuration ID excludes receipt generation time. Persistent URLs and JSON import are not implemented.
- Only image CSP gains blob: for locally generated previews. Authentication, database policy, DNS/routes and dependencies are unchanged.
- Existing untracked review artifacts are preserved. A pre-existing stray trailing 4 in observatory.css was backed up outside the repository then removed; this restores the tracked stylesheet content.

### MUST FIX BEFORE ALPHA

- Before advertising Simple mode as a consumer battery-life estimator, supply and independently validate a versioned device/workload power evidence model, including idle power. Today new configurations without explicitly supplied Advanced power honestly remain unresolved. This does not block a clearly scoped engineering/UX Alpha.
- Validate actual iOS/Android download and native share behavior on physical devices; desktop browser emulation cannot establish OS share-sheet behavior.

### SHOULD FIX DURING ALPHA

- Persistent simulation URLs with immutable saved inputs, model/calibration versions and privacy policy.
- Public reference-device selection with traceable conditions and applicability; distinguish rated and advertised battery metadata in a planned schema change.
- Formal screen-reader and assistive-technology testing; user testing of daily mixed-use runtime vs screen-on-time comprehension.
- Very large receipts currently stop with a clear message above 16000 px height rather than clip. Consider paginated PDF export after demand is demonstrated.

### CAN WAIT UNTIL BETA/LATER

- Range-input UI, validated SoC/thermal/image-quality models, social feeds, leaderboards and PDF export. None is claimed by this release.

### Validation evidence

- Added 24 Alpha tests: default server-rendered UI; usage presets/custom durations; mode/preset state preservation; invalid inputs; missing idle power; deterministic same-engine calculation; full-rated-energy default; PPI/unknown volume; frozen export data; correct runtime/confidence/versions; filename sanitation; long-name wrapping; PNG canvas generation; unavailable Web Share fallback detection.
- Browser checks on the production Worker preview: Simple and Typical default; engineering watts/derating absent in Simple; custom gaming 72.5 minutes preserved through Heavy and Advanced/Simple switching; missing evidence remains unresolved; explicit power reuse gives 23.5 h for the tested illustrative daily mix, with the Advanced 90% value retained separately; repeated camera additions/removals remain stable.
- Checked 320, 390, 768, 1280 and 1440 px viewport widths without horizontal overflow. Clipboard summary succeeded. Actual PNG downloads generated at 1080 x 1350 (card) and 1080 x 3808 (initial receipt); visual inspection caught and corrected a large-font baseline collision. Final receipt wording is more compact.
- Native share availability is progressively detected and its text payload uses the frozen summary. No real recipient was sent a test share. Physical-device share sheets remain unverified.

### Files changed

astro.config.mjs; src/components/interactive-leaks/InteractiveLeaksSimulator.tsx; src/components/interactive-leaks/ShareResult.tsx; src/lib/simulation/alpha-workspace.ts; src/lib/simulation/result-export.ts; src/styles/lab-simulator.css; tests/simulation-alpha.test.ts; this report.

### Final verification

`npm.cmd run verify` passed after the final validation fix: 79 checked files, zero errors/warnings/hints; 163 tests across 16 files passed; calibration validator passed (3 protocols, 5 devices, 8 measurements); production build passed. No engine/model files or calibration observations changed.

Corrected PNGs were downloaded and visually inspected: card 1080 x 1350, example receipt 1080 x 3590. Desktop/mobile card files have identical SHA-256 hashes. JSON download contains the frozen Advanced context. No browser errors/warnings captured. Dev-only deployment is authorized; no main merge or production route change.
