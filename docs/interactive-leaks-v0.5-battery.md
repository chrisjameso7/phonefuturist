# Interactive Leaks — Simulation Engine v0.5 foundation: Battery Experience

Status: foundation implemented on `simulation/v0.5-battery`. Not merged. No UI
changes. The v0.4 deterministic engine (`src/lib/simulation/engine.ts`,
`SIMULATION_ENGINE_VERSION = '0.4.0'`) is untouched and all of its tests
continue to pass unchanged.

## Scope of this slice

Battery Experience introduces a modeled (non-deterministic) runtime layer
alongside the existing deterministic battery module:

- The existing battery module keeps ownership of deterministic pack
  calculations: Wh from mAh × V, cell/pack volume, energy densities.
- The new battery-experience module models real-world runtime behavior from
  subsystem power under named workloads. It never fabricates wattage figures.

Implemented workloads: `mixed_use`, `web_browsing`, `video_playback`,
`gaming`, `camera_use`, `standby`. Camera workload composition is accepted by
the architecture; camera behaviour itself is not simulated here.

## Where the code lives

- `src/lib/simulation/modules/modeling.ts` — shared provenance/uncertainty
  primitives (reusable by future modeled subsystems such as performance or
  thermal without new type plumbing).
- `src/lib/simulation/modules/battery-experience.ts` — the module: inputs,
  resolution, runtime derivation, outputs, comparison helper.
- `tests/simulation-battery-experience.test.ts` — 30 tests.

## Core formula

Runtime fundamentally derives from usable battery energy divided by modeled
average power consumption:

```
runtime_hours = usable_energy_Wh / average_modeled_power_W
```

- `usable_energy_Wh = total_energy_Wh × usable_percent / 100`
  (when `usable_percent` is absent, usable = total and an explicit assumption
  records that no derating was supplied).
- `average_modeled_power_W` for a single workload is the sum of the
  subsystem powers that are actually known.
- For multiple workloads, each workload's power is scaled by its normalized
  weight (weight / sum of weights) and the scaled powers are summed.

Worst-case runtime pairs the lowest energy bound with the highest power
bound; best-case runtime pairs the highest energy bound with the lowest
power bound. This interval division is the mechanism that turns input ranges
into runtime ranges without any fabricated precision.

## Uncertainty and interval arithmetic

Inputs may be supplied as:

- an exact number — a point quantity,
- `{ value, provenance }` — a point with provenance,
- `{ range: { min, max }, provenance }` — a range; each bound may be omitted
  and stays unknown,
- `{ value, range }` — the point drives the calculation, the range is
  preserved on the parameter record.

Interval arithmetic rules implemented in `modeling.ts`:

- Addition (subsystem sums, workload mixtures): sums of points stay points;
  any range in the sum widens the result, and a missing bound anywhere makes
  the corresponding output bound unknown.
- Division (runtime): only computed per bound where both energy and power
  bounds exist; a missing input bound yields a missing output bound, never a
  guessed one.
- Multiplication by constants (weight shares, percent derating): distributes
  over known bounds.

## Provenance architecture

Every modeled parameter can carry provenance:

- `measured` — from a real measurement (for example, a lab capture).
- `reported` — claimed by a leak, vendor, or filing.
- `modeled` — derived by PhoneFuturist modeling with no external source.
- `user` — entered by the simulation user (advanced configuration).

A parameter supplied as a bare number is recorded with kind `modeled` and the
note "Provenance not supplied; treated as modeled." Such parameters are
counted and surfaced in `confidenceNotes`, so public simulations can later
explain exactly which figures rest on unattributed data. Provenance is
never inferred or upgraded: a reported number never silently becomes
measured.

## Unknowns stay unknown (fail-closed outputs)

The module returns one of two top-level statuses:

1. `resolved` — sufficient information existed; see Outputs below.
2. `unresolved` — with a `code`, a human-readable `message`, and a `missing`
   list naming exactly which required information is absent:

- `MISSING_TOTAL_ENERGY` — no total pack energy was supplied.
- `MISSING_WORKLOAD_POWER` — no workload has any usable power parameter.
- `INVALID_ENERGY_INPUT` — energy was supplied but is not a positive finite
  value/range.
- `INVALID_WORKLOAD_POWER` — supplied power values are invalid (negative,
  non-finite, or an inverted range). Invalid supplied values refuse the
  estimate entirely rather than being silently dropped, because dropping a
  bad number would overstate runtime.
- `NO_WORKLOADS_SUPPLIED` — the workload record is empty.

No default wattage exists anywhere in the module. Unknown subsystem power is
excluded from sums and remains absent from parameter records.

## Outputs

`resolved` results carry:

- `workloads[]` — per-workload `runtimeHours {min,max}` and
  `averagePowerW {min,max}` (bounds present only when derivable).
- `usableEnergyWh` — point expressed as min/max, or a range.
- `assumptions[]` — structural assumptions (currently the no-derating
  assumption) with provenance.
- `parameters[]` — every consumed parameter with its resolved value/range,
  provenance, and parameter path (e.g.
  `workloads.gaming.subsystems.display`).
- `contributors[]` — per-subsystem (and workload-specific component) power
  contributions with their share of total power. Shares use range midpoints
  as the basis and the notes say so when midpoints were involved.
- `warnings[]` — non-fatal input problems (e.g. usable percent > 100, bad
  workload weights) that were surfaced rather than hidden.

## Confidence

`confidence` is derived from input quality, never an arbitrary percentage:

- `deterministic` — every energy and power input was an exact point value
  with recorded provenance; the runtime is a pure division.
- `high` — exact points, but some provenance is unrecorded.
- `moderate` — ranged inputs with complete bounds and recorded provenance,
  or exact points with unrecorded provenance.
- `low` — any required bound is unknown, or inputs are largely
  unattributed.

`confidenceNotes[]` explains the grade: which bounds are missing, whether
contributor shares rest on midpoints, and how many parameters lack
provenance. The wording is intended to be shown to end users as-is.

## Workload and subsystem architecture

Workloads declare subsystem power:

- fixed subsystems: `display`, `compute`, `memory_platform`,
  `connectivity` — matching the task's subsystem families;
- `workloadSpecific`: free-form named components (e.g. a cellular radio
  under load, haptics, fan) so future detail does not require breaking
  type changes.

Multiple workloads combine by normalized weights; `workloadOrder` fixes the
output order deterministically. A workload present in `workloads` but absent
from `workloadOrder` is not evaluated; an order entry with no workload is
ignored (warning-free, deterministic).

## Simple and advanced modes converge

The input shape is a single model. A future simple-mode UI would supply a
small set of parameters (e.g. total energy plus one mixed-use power figure);
advanced mode overrides individual subsystem parameters, usable percent, or
workload composition. Both resolve through the same
`simulateBatteryExperience` call and produce the same result shape, so no
separate "simple engine" can drift from the advanced one.

## Comparison architecture

`compareBatteryExperience(baselineLabel, baseline, candidateLabel, candidate)`
returns workload-matched deltas:

- `runtimeHours {min,max}` — candidate minus baseline (interval subtraction:
  worst case pairs candidate-min with baseline-max).
- `averagePowerW {min,max}` — candidate minus baseline.
- `powerDeltaBySubsystem` is reserved in the type for the Upgrade Simulator;
  the current implementation reports workload-level deltas and the result
  shape carries `comparisonReady.averagePowerW` for cross-result comparison.

The Upgrade Simulator can therefore compare a hypothetical device against a
known baseline and explain improvement/regression by comparing contributor
lists of the two resolved results, without new engine plumbing. Deltas
involving unresolved results return `undefined` rather than partial guesses.

## What was deliberately not built

- No UI changes (the existing simulator page is untouched).
- No camera, performance, or thermal simulation.
- No device-specific wattage tables (no per-phone hard-coding).
- No AI-generated estimates; every number flows from supplied inputs.
- No persistence of simulation runs, no server verification.

## Testing

30 tests in `tests/simulation-battery-experience.test.ts` cover:

- deterministic runtime from exact energy and power (with provenance);
- runtime ranges from ranged power and energy, including multi-subsystem
  ranges and mixed point/range bounds;
- missing energy, missing workload power, and no workloads → explicit
  unresolved results with the exact missing pieces named;
- invalid values: negative energy, non-finite power, inverted ranges,
  bad workload weights, usable percent above 100;
- provenance preservation for all four kinds plus the unattributed
  fallback record;
- unknown values remaining unknown (absent subsystems never become zero);
- workload selection, ordering, weighted mixing, and unknown-order filtering;
- usable-energy adjustment (point percent, ranged percent, missing percent
  with its assumption record);
- contributor calculations (single workload, weighted mixture, midpoint
  basis for ranged inputs);
- comparison deltas and unresolved-comparison refusal;
- backwards compatibility: the v0.4 battery module and engine API surface
  are unchanged (`SIMULATION_ENGINE_VERSION` stays `0.4.0`; the v0.4 result
  carries no battery-experience fields).

The pre-existing 57 tests are untouched and must keep passing.

## Future extension points

- Per-workload power profiles measured from reference devices (as
  provenance-tagged datasets feeding `subsystems`).
- Calibration hooks: measured runtime vs modeled runtime reconciliation per
  workload (Milestone 5 acceptance requires documented calibration).
- `powerDeltaBySubsystem` implementation in the Upgrade Simulator.
- Advanced UI bound to `parameters[]` paths so overrides round-trip with
  provenance intact.
- Server-side verification of submitted runs against recomputation.
