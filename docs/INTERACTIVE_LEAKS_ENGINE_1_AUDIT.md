# Interactive Leaks Engine 1.0 audit

Launch target: October 10, 2026.

## Rule

The simulator may show a control only when changing that control propagates through a defensible model and changes an output for a defensible reason.

No subsystem is retained simply because it already exists.

## Keep as exact math

These operations are useful because they transform explicit inputs without inventing device behavior:

- Battery energy: mAh × nominal voltage / 1000 = Wh.
- Battery cell rectangular volume when all three dimensions are explicitly supplied.
- Energy density from explicit energy, volume and/or mass.
- Display PPI from explicit resolution and diagonal.
- Display geometry from explicit physical/aspect inputs.
- Camera module rectangular volume from explicitly supplied module dimensions.
- Arithmetic aggregation of explicitly supplied component volumes.
- Runtime identity: explicit usable Wh / explicit average whole-device W.

The output quality is still limited by input quality. Exact arithmetic must never be presented as evidence that an unreleased input is correct.

## Rewrite or move above the kernel

- Battery endurance prediction. The arithmetic survives, but workload power and usable-energy assumptions need a larger calibrated evidence model.
- Power evidence. This becomes Auto-mode input generation and calibration rather than the simulation kernel.
- Packaging. Keep exact known-volume arithmetic, but do not imply rectangular-envelope arithmetic equals real internal manufacturable volume.
- Processor profiles. They become evidence-backed parameter bundles only after CPU/GPU/thermal models consume them.
- Confidence. It must come from evidence quality and validation, never hardcoded UI percentages.

## Hide until validated

- CPU load sliders
- GPU load sliders
- efficiency sliders
- ambient-temperature effects
- processor performance deltas
- thermal throttling
- benchmark prediction
- image-quality scores

These controls can return only when their values feed validated equations or calibrated models.

## Auto

Auto creates a Virtual Device from confirmed specifications, reports, PhoneFuturist evidence models and uncertainty ranges. Every parameter keeps provenance and confidence. Unsupported parameters remain unresolved.

Users may override any exposed Auto parameter. The override is labelled as a user value and the Auto value remains available for reset.

## Manual

Manual does not require evidence coverage. It accepts explicit engineering assumptions and runs them through the same validated models. It warns about unusual ranges but blocks only malformed or mathematically invalid inputs.

## Validation target

Do not claim 99% prediction accuracy globally. Target computational correctness for the math kernel, then publish empirical error by subsystem using held-out released-device data.
