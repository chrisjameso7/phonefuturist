# Interactive Leaks — Simulation Engine v0.5.x: Battery Experience

Status: v0.5 (`0.5.0-battery.1`) was merged to `main` via PR #2 (merge commit
`bc8a953`). This document describes v0.5.1 (`0.5.1-battery.1`), a correctness
pass implemented on `simulation/v0.5.1-battery-corrections` and opened as a PR
against `main`; the PR is left unmerged pending human review. No UI changes.
The v0.4 deterministic engine (`src/lib/simulation/engine.ts`,
`SIMULATION_ENGINE_VERSION = '0.4.0'`) remains untouched and all of its tests
continue to pass unchanged.

## Scope of this slice

Battery Experience is the modeled (non-deterministic) runtime layer alongside
the existing deterministic battery module:

- The existing battery module keeps ownership of deterministic pack
  calculations: Wh from mAh × V, cell/pack volume, energy densities.
- The battery-experience module models real-world runtime behavior from
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
- `tests/simulation-battery-experience.test.ts` — the module test suite.

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

## Profile-level runtime semantics (corrected in v0.5.1)

A simulated profile has exactly one runtime: the runtime of the workload
mixture that was actually simulated. It is reported once, at
`estimate.runtimeHours`.

- Each workload entry reports its own average modeled power
  (`averagePowerW`), its weighted contribution to the profile average
  (`weightedPowerW` — own power scaled by its normalized weight share), and
  the normalized `weightShare` used.
- `runtimeHours` appears on a workload entry only when that workload is
  itself the complete simulated profile (a single-workload profile); the
  profile runtime and the workload runtime are then the same figure.
- v0.5.0 repeated the mixture runtime inside every workload entry, which
  read as a standalone per-workload runtime that was never simulated. That
  repetition was removed rather than reinterpreted.

## Uncertainty and interval arithmetic

Inputs may be supplied as:

- an exact number — a point quantity,
- `{ value, provenance }` — a point with provenance,
- `{ range: { min, max }, provenance }` — a range; each bound may be omitted
  and stays unknown.

Supplying both a point value and a range on the same parameter is ambiguous
for v0.5.x — the type does not yet distinguish a central estimate plus
uncertainty — and is rejected fail-closed with an explicit message instead of
silently preferring the point and discarding the range. This applies to
total energy, usable percent, and every subsystem power.

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

Provenance state is structured, not inferred: every parameter record carries
`provenanceRecorded: boolean`.

- `provenanceRecorded: true` — the input supplied provenance of its own.
- `provenanceRecorded: false` — the input carried no provenance. The record
  still shows the structural fallback (`kind: 'modeled'`, note
  "Provenance not supplied; treated as modeled.") for human display, but the
  flag — never the note text — is what confidence grading inspects.

A parameter supplied as a bare number is therefore recorded with the
fallback provenance and `provenanceRecorded: false`, and is counted in
`confidenceNotes`, so public simulations can later explain exactly which
figures rest on unattributed data. Provenance is never inferred or upgraded:
a reported number never silently becomes measured.

## Unknowns stay unknown (fail-closed outputs)

The module returns one of two top-level statuses:

1. `resolved` — sufficient information existed; see Outputs below.
2. `unresolved` — with a `code`, a human-readable `message`, and a `missing`
   list naming exactly which required information is absent or invalid:

- `MISSING_TOTAL_ENERGY` — no total pack energy was supplied (including a
  parameter object with neither a value nor a range).
- `MISSING_WORKLOAD_POWER` — no evaluated workload has any usable power
  parameter.
- `INVALID_ENERGY_INPUT` — energy was supplied but is invalid (not a
  positive finite value/range, point+range ambiguity), or an explicitly
  supplied usable percentage is invalid (see below).
- `INVALID_WORKLOAD_POWER` — supplied power values are invalid (negative,
  non-finite, inverted range, point+range ambiguity). Invalid supplied
  values refuse the estimate entirely rather than being silently dropped,
  because dropping a bad number would overstate runtime.
- `INVALID_WORKLOAD_WEIGHT` — a supplied workload weight is not a positive
  finite number (zero, negative, NaN, infinite). The result is unresolved,
  a warning names the workload and the supplied value, and no default
  weight is substituted. Weights are validated for the workloads actually
  evaluated (those surviving `workloadOrder` filtering).
- `NO_WORKLOADS_SUPPLIED` — the workload record is empty.

No default wattage exists anywhere in the module. Unknown subsystem power is
excluded from sums and remains absent from parameter records.

## Usable battery percentage

The usable percentage must be greater than 0 and at most 100. Every supplied
bound of a range must satisfy the same rule, and an inverted range is
invalid.

- A valid percentage scales the total energy; ranged percentages multiply
  known energy bounds by known percent bounds (worst case pairs the lowest
  of each).
- An explicitly supplied invalid percentage returns an unresolved
  `INVALID_ENERGY_INPUT` result naming `energy.usablePercent`. Invalid
  percentages are never retained (v0.5.0 kept values above 100 with a
  warning) and never silently fall back to the no-derating assumption.
- A genuinely absent percentage preserves the v0.5 behavior: usable energy
  equals total energy and the assumption list carries
  `NO_USABLE_PERCENT_SUPPLIED` — "No usable battery percentage was supplied,
  so the full rated pack energy was treated as usable. Real devices
  typically hold a protection reserve, so treat the resulting runtime as
  optimistic." (provenance: modeled, "Structural assumption, not a
  device-specific figure.").

## Outputs

`resolved` results carry:

- `runtimeHours` — one profile-level runtime for the whole workload mixture
  (bounds present only when derivable).
- `workloads[]` — per-workload `averagePowerW` (own power), `weightedPowerW`
  (weighted contribution), `weightShare`, and — only for single-workload
  profiles — `runtimeHours`.
- `usableEnergyWh` — point expressed as min/max, or a range.
- `assumptions[]` — structural assumptions (currently the no-derating
  assumption) with provenance.
- `parameters[]` — every consumed parameter with its resolved value/range,
  provenance, structured `provenanceRecorded` state, and parameter path
  (e.g. `workloads.gaming.subsystems.display`).
- `contributors[]` — per-subsystem (and workload-specific component) power
  contributions with their share of total power. Shares use range midpoints
  as the basis and the notes say so when midpoints were involved.
- `warnings[]` — an array independent of the calculation-level warnings
  array. Because every invalid input now fails closed, resolved results
  currently carry empty warning arrays; the field is retained for future
  non-fatal cases.

No rounding or precision reduction is applied anywhere in the engine;
consumers format numbers for display.

## Confidence

`confidence` is derived from input quality, never an arbitrary percentage.
The implemented grading is exactly:

- `deterministic` — every energy and power input was an exact point value
  and every parameter recorded provenance; the runtime is a pure division.
- `high` — inputs may be ranged, but every required bound is known (the
  runtime range is complete) and every parameter recorded provenance.
- `moderate` — the numeric result is complete (no required bound unknown)
  but at least one parameter carries no recorded provenance.
- `low` — the result is resolved but materially incomplete: at least one
  required runtime bound could not be derived from the inputs.

`confidenceNotes[]` explains the grade: which bounds are missing, whether
contributor shares rest on midpoints, and how many parameters lack
recorded provenance. The wording is intended to be shown to end users as-is.

## Workload and subsystem architecture

Workloads declare subsystem power:

- fixed subsystems: `display`, `compute`, `memory_platform`,
  `connectivity` — matching the task's subsystem families;
- `workloadSpecific`: free-form named components (e.g. a cellular radio
  under load, haptics, fan) so future detail does not require breaking
  type changes.

Multiple workloads combine by normalized weights; `workloadOrder` fixes the
output order deterministically. A workload present in `workloads` but absent
from `workloadOrder` is not evaluated (and its weight is not validated); an
order entry with no workload is ignored (warning-free, deterministic).

## Simple and advanced modes converge

The input shape is a single model. A future simple-mode UI would supply a
small set of parameters (e.g. total energy plus one mixed-use power figure);
advanced mode overrides individual subsystem parameters, usable percent, or
workload composition. Both resolve through the same
`simulateBatteryExperience` call and produce the same result shape, so no
separate "simple engine" can drift from the advanced one.

## Comparison architecture

`compareBatteryExperience(baselineLabel, baseline, candidateLabel, candidate)`
compares two resolved results:

- `runtimeHours` — one profile-level delta: candidate minus baseline by
  interval subtraction (worst case pairs candidate-min with baseline-max).
  Absent when either profile runtime is unknown.
- `baseline` / `candidate` summaries carry each profile's average power and
  profile runtime.
- `deltas[]` — workload-matched power deltas only (`averagePowerW`,
  candidate minus baseline). Per-workload runtime deltas are intentionally
  not reported: runtime is a profile-level quantity.
- `powerDeltaBySubsystem` is reserved in the delta type and is NOT yet
  implemented. It is never populated today; absence must not be read as
  "no per-subsystem change". The Upgrade Simulator will implement it by
  joining the two results' contributor lists by subsystem and component.

Deltas involving unresolved results return `undefined` rather than partial
guesses.

## What was deliberately not built

- No UI changes (the existing simulator page is untouched).
- No camera, performance, or thermal simulation.
- No device-specific wattage tables (no per-phone hard-coding).
- No AI-generated estimates; every number flows from supplied inputs.
- No persistence of simulation runs, no server verification.
- No display rounding; no default weights or percentages.

## Testing

The battery-experience suite in
`tests/simulation-battery-experience.test.ts` covers:

- deterministic runtime from exact energy and power (with provenance);
- runtime ranges from ranged power and energy, including multi-subsystem
  ranges and mixed point/range bounds;
- profile-level runtime semantics: one runtime per profile, per-workload
  weighted power and weight share, standalone runtime only for
  single-workload profiles;
- missing energy (including empty parameter objects), missing workload
  power, and no workloads → explicit unresolved results with the exact
  missing pieces named;
- invalid values: negative energy, non-finite power, inverted ranges,
  point+range ambiguity (energy, percent, power), invalid workload weights
  (zero, negative, NaN, infinite), usable percentages outside (0, 100]
  (including 100 exactly as the valid boundary, and ranged bounds);
- provenance preservation for all four kinds, the structured
  `provenanceRecorded` flag, and grading independence from note wording;
- unknown values remaining unknown (absent subsystems never become zero);
- workload selection, ordering, weighted mixing, and unknown-order filtering;
- usable-energy adjustment (point percent, ranged percent, missing percent
  with its assumption record);
- contributor calculations (single workload, weighted mixture, midpoint
  basis for ranged inputs);
- comparison: profile-level runtime deltas, per-workload power deltas, no
  per-workload runtime deltas, unresolved-comparison refusal;
- confidence grades: deterministic, high, moderate, low all reached
  explicitly;
- independent warning arrays between calculation and estimate;
- backwards compatibility: the v0.4 battery module and engine API surface
  are unchanged (`SIMULATION_ENGINE_VERSION` stays `0.4.0`; the v0.4 result
  carries no battery-experience fields).

The pre-existing 57 tests are untouched and must keep passing. Three v0.5.0
tests were rewritten because v0.5.1 deliberately changes the behavior they
asserted (weight coercion to 1, retaining percentages above 100, per-workload
comparison runtime deltas); no test was weakened or deleted.

## Future extension points

- Per-workload power profiles measured from reference devices (as
  provenance-tagged datasets feeding `subsystems`).
- Calibration hooks: measured runtime vs modeled runtime reconciliation per
  workload (Milestone 5 acceptance requires documented calibration).
- `powerDeltaBySubsystem` implementation in the Upgrade Simulator.
- A first-class "central estimate + uncertainty" parameter shape, which
  would replace the point+range rejection with explicit semantics.
- Advanced UI bound to `parameters[]` paths so overrides round-trip with
  provenance intact.
- Server-side verification of submitted runs against recomputation.
