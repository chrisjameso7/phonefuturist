import type {
  ModelParameter,
  ModelParameterInput,
  ModelProvenance,
  Resolution,
  ResolvedQuantity,
} from './modeling';

import {
  divideEnergyByPower,
  isPositiveFinite,
  quantityMidpoint,
  resolvePositiveParameter,
  scaleQuantity,
  sumQuantities,
} from './modeling';

import type { SimulationWarning } from '../types';

// ---------------------------------------------------------
// Workloads and subsystems
// ---------------------------------------------------------

/**
 * Supported workload profiles. Camera workload composition is
 * accepted by the architecture but camera behaviour itself is
 * not simulated in this version.
 */
export type BatteryExperienceWorkload =
  | 'mixed_use'
  | 'web_browsing'
  | 'video_playback'
  | 'gaming'
  | 'camera_use'
  | 'standby';

export type BatterySubsystem =
  | 'display'
  | 'compute'
  | 'memory_platform'
  | 'connectivity'
  | 'workload_specific';

export interface SubsystemPowerInput {
  display?: ModelParameterInput;

  compute?: ModelParameterInput;

  memory_platform?: ModelParameterInput;

  connectivity?: ModelParameterInput;

  /**
   * Power for workload-specific components (for example a
   * cellular radio under load, haptics, or a cooling fan).
   * Names are free-form so future subsystem detail does not
   * require breaking type changes.
   */
  workloadSpecific?: Record<string, ModelParameterInput>;
}

/**
 * Composition of a workload as subsystem power inputs plus an
 * optional weight. Workload composition is user-declared, not
 * invented: absent subsystem power is unknown, not zero.
 */
export interface WorkloadDefinition {
  subsystems: SubsystemPowerInput;

  /**
   * Relative weight of this workload inside a mixed profile.
   * Weights are normalized by their sum; absent weights on
   * present workloads are treated as 1 during normalization.
   */
  weight?: number;
}

// ---------------------------------------------------------
// Battery energy inputs
// ---------------------------------------------------------

export interface BatteryExperienceEnergyInput {
  /**
   * Total pack energy in Wh (deterministic battery module
   * output or a supplied measured/reported value).
   */
  totalEnergyWh?: ModelParameterInput;

  /**
   * Share of rated pack energy that is actually usable
   * (0–100). Derating reflects protection reserves and
   * voltage cutoffs. When absent, usable energy equals total
   * energy and the result explains that no derating was
   * supplied.
   */
  usablePercent?: ModelParameterInput;
}

// ---------------------------------------------------------
// Inputs
// ---------------------------------------------------------

export interface BatteryExperienceInput {
  energy: BatteryExperienceEnergyInput;

  /**
   * One or more workloads. Multiple workloads are combined by
   * normalized weight; a single workload is evaluated alone.
   */
  workloads: Partial<Record<BatteryExperienceWorkload, WorkloadDefinition>>;

  /**
   * Explicit evaluation order for deterministic contributor
   * and warning output. When absent, declaration order of the
   * workloads record is used.
   */
  workloadOrder?: BatteryExperienceWorkload[];
}

// ---------------------------------------------------------
// Outputs
// ---------------------------------------------------------

export interface BatteryExperienceContributor {
  workload: BatteryExperienceWorkload;

  subsystem: BatterySubsystem;

  /** Present only for workload_specific components. */
  component?: string;

  powerW?: { min?: number; max?: number };

  /**
   * Share of the total average modeled power, using the
   * midpoint of each quantity as the basis. Midpoint basis is
   * reported so partial precision stays visible.
   */
  sharePercent?: number;
}

export interface BatteryExperienceAssumption {
  code: string;

  message: string;

  provenance?: ModelProvenance;
}

export interface BatteryExperienceParameterRecord {
  parameter: string;

  value?: number;

  range?: { min?: number; max?: number };

  provenance?: ModelProvenance;

  /** Set when a supplied value was rejected as invalid. */
  rejected?: { reason: string };
}

export interface BatteryExperienceRuntimeEstimate {
  workload: BatteryExperienceWorkload;

  runtimeHours?: { min?: number; max?: number };

  averagePowerW?: { min?: number; max?: number };
}

/**
 * An explicit unresolved result. Nothing is substituted.
 */
export interface BatteryExperienceUnresolved {
  code:
    | 'MISSING_TOTAL_ENERGY'
    | 'MISSING_WORKLOAD_POWER'
    | 'INVALID_ENERGY_INPUT'
    | 'INVALID_WORKLOAD_POWER'
    | 'NO_WORKLOADS_SUPPLIED';

  message: string;

  /** Which required information is missing or invalid. */
  missing: string[];
}

export interface BatteryExperienceBaselineDelta {
  workload: BatteryExperienceWorkload;

  /**
   * Positive runtimeHours means the candidate runs longer
   * than the baseline; negative means shorter. Absent when a
   * bound cannot be computed because either side is unknown.
   */
  runtimeHours?: { min?: number; max?: number };

  averagePowerW?: { min?: number; max?: number };

  /** Contribution of each subsystem to the power delta. */
  powerDeltaBySubsystem?: Array<{
    subsystem: BatterySubsystem;

    component?: string;

    /** candidate minus baseline. */
    deltaW?: { min?: number; max?: number };
  }>;
}

export interface BatteryExperienceComparison {
  baseline: {
    label: string;

    averagePowerW?: { min?: number; max?: number };
  };

  candidate: {
    label: string;

    averagePowerW?: { min?: number; max?: number };
  };

  deltas: BatteryExperienceBaselineDelta[];
}

export type BatteryExperienceConfidence =
  | 'deterministic'
  | 'high'
  | 'moderate'
  | 'low';

export interface BatteryExperienceResult {
  engineVersion: string;

  status: 'resolved' | 'unresolved';

  unresolved?: BatteryExperienceUnresolved;

  /** Only present when status is 'resolved'. */
  estimate?: {
    workloads: BatteryExperienceRuntimeEstimate[];

    usableEnergyWh?: { value?: number; min?: number; max?: number };

    assumptions: BatteryExperienceAssumption[];

    parameters: BatteryExperienceParameterRecord[];

    contributors: BatteryExperienceContributor[];

    warnings: SimulationWarning[];
  };

  /**
   * Derived from input quality, never an arbitrary percentage:
   * deterministic when every input is a validated point,
   * otherwise graded by how many bounds are unknown and how
   * much provenance is unrecorded. Explained in confidenceNotes.
   */
  confidence?: BatteryExperienceConfidence;

  confidenceNotes?: string[];

  /**
   * Designed for a future Upgrade Simulator: pass a resolved
   * baseline result (and candidate label) to compare power
   * and runtime with per-subsystem deltas.
   */
  comparisonReady?: {
    averagePowerW?: { min?: number; max?: number };
  };
}

export interface BatteryExperienceCalculation {
  result: BatteryExperienceResult;

  warnings: SimulationWarning[];
}

// ---------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------

const UNTYPED_PROVENANCE_NOTE =
  'Provenance not supplied; treated as modeled.';

const UNKNOWN_PROVENANCE: ModelProvenance = {
  kind: 'modeled',
  note: UNTYPED_PROVENANCE_NOTE,
};

function describeParameter(
  parameter: ModelParameterInput | undefined,
): ModelParameter | undefined {
  return parameter === undefined
    ? undefined
    : typeof parameter === 'number'
      ? { value: parameter }
      : parameter;
}

function provenanceFor(
  parameter: ModelParameter | undefined,
  fallback: ModelProvenance,
): ModelProvenance {
  return parameter?.provenance ?? fallback;
}

function parameterRecord(
  name: string,
  parameter: ModelParameter | undefined,
  quantity: ResolvedQuantity | undefined,
  fallbackProvenance: ModelProvenance,
): BatteryExperienceParameterRecord {
  const provenance = provenanceFor(parameter, fallbackProvenance);

  return {
    parameter: name,
    ...(quantity?.kind === 'point' ? { value: quantity.value } : {}),
    ...(quantity?.kind === 'range'
      ? {
          range: {
            ...(quantity.min !== undefined ? { min: quantity.min } : {}),
            ...(quantity.max !== undefined ? { max: quantity.max } : {}),
          },
        }
      : {}),
    provenance,
  };
}

function bounds(
  quantity: ResolvedQuantity | undefined,
): { min?: number; max?: number } {
  if (quantity === undefined) {
    return {};
  }

  if (quantity.kind === 'point') {
    return { min: quantity.value, max: quantity.value };
  }

  return {
    ...(quantity.min !== undefined ? { min: quantity.min } : {}),
    ...(quantity.max !== undefined ? { max: quantity.max } : {}),
  };
}

function hasAnyBound(quantity: ResolvedQuantity | undefined): boolean {
  if (quantity === undefined) {
    return false;
  }

  if (quantity.kind === 'point') {
    return true;
  }

  return quantity.min !== undefined || quantity.max !== undefined;
}

// ---------------------------------------------------------
// Subsystem power resolution
// ---------------------------------------------------------

interface ResolvedSubsystem {
  quantities: Array<{
    subsystem: BatterySubsystem;

    component?: string;

    quantity: ResolvedQuantity;

    parameter: ModelParameter;
  }>;

  invalid: string[];
}

const SUBSYSTEM_LABELS: Record<
  Exclude<BatterySubsystem, 'workload_specific'>,
  string
> = {
  display: 'Display power',
  compute: 'Compute power',
  memory_platform: 'Memory/platform power',
  connectivity: 'Connectivity power',
};

function resolveSubsystemPower(
  input: SubsystemPowerInput,
): ResolvedSubsystem {
  const quantities: ResolvedSubsystem['quantities'] = [];
  const invalid: string[] = [];

  const describe = (label: string) =>
    `${label} must be a positive finite value or a range with at least one positive finite bound.`;

  const coreEntries: Array<
    [Exclude<BatterySubsystem, 'workload_specific'>, ModelParameterInput | undefined]
  > = [
    ['display', input.display],
    ['compute', input.compute],
    ['memory_platform', input.memory_platform],
    ['connectivity', input.connectivity],
  ];

  for (const [subsystem, parameterInput] of coreEntries) {
    const parameter = describeParameter(parameterInput);

    if (parameter === undefined) {
      continue;
    }

    const resolution = resolvePositiveParameter(
      parameter,
      {
        code: 'INVALID_WORKLOAD_POWER',
        describe,
      },
      SUBSYSTEM_LABELS[subsystem],
    );

    if (resolution.quantity) {
      quantities.push({
        subsystem,
        quantity: resolution.quantity,
        parameter,
      });
    } else if (resolution.issue) {
      invalid.push(resolution.issue.message);
    }
  }

  for (const [component, parameterInput] of Object.entries(
    input.workloadSpecific ?? {},
  )) {
    const parameter = describeParameter(parameterInput);

    if (parameter === undefined) {
      continue;
    }

    const label = `${component} power`;

    const resolution = resolvePositiveParameter(
      parameter,
      {
        code: 'INVALID_WORKLOAD_POWER',
        describe,
      },
      label,
    );

    if (resolution.quantity) {
      quantities.push({
        subsystem: 'workload_specific',
        component,
        quantity: resolution.quantity,
        parameter,
      });
    } else if (resolution.issue) {
      invalid.push(resolution.issue.message);
    }
  }

  return { quantities, invalid };
}

// ---------------------------------------------------------
// Main entry point
// ---------------------------------------------------------

export function simulateBatteryExperience(
  input: BatteryExperienceInput,
): BatteryExperienceCalculation {
  const warnings: SimulationWarning[] = [];
  const parameters: BatteryExperienceParameterRecord[] = [];
  const assumptions: BatteryExperienceAssumption[] = [];

  // -------------------------------------------------------
  // Workload selection
  // -------------------------------------------------------

  const suppliedWorkloads = Object.keys(
    input.workloads,
  ) as BatteryExperienceWorkload[];

  if (suppliedWorkloads.length === 0) {
    warnings.push({
      code: 'NO_WORKLOADS_SUPPLIED',
      message:
        'At least one workload definition is required to estimate runtime.',
    });

    return {
      result: {
        engineVersion: BATTERY_EXPERIENCE_VERSION,
        status: 'unresolved',
        unresolved: {
          code: 'NO_WORKLOADS_SUPPLIED',
          message:
            'No workload was supplied. Battery experience cannot produce a runtime estimate without a workload.',
          missing: ['workloads'],
        },
      },
      warnings,
    };
  }

  const order = input.workloadOrder ?? suppliedWorkloads;

  const workloads = order.filter((workload) =>
    suppliedWorkloads.includes(workload),
  );

  // -------------------------------------------------------
  // Energy resolution
  // -------------------------------------------------------

  let energyUnresolved: BatteryExperienceUnresolved | undefined;

  let usableEnergy: ResolvedQuantity | undefined;

  const totalParameter = describeParameter(input.energy.totalEnergyWh);

  const usableParameter = describeParameter(input.energy.usablePercent);

  let totalResolution: Resolution = {};

  if (totalParameter === undefined) {
    energyUnresolved = {
      code: 'MISSING_TOTAL_ENERGY',
      message:
        'Total battery energy is unknown. A runtime estimate requires usable battery energy divided by modeled average power.',
      missing: ['energy.totalEnergyWh'],
    };
  } else {
    totalResolution = resolvePositiveParameter(
      totalParameter,
      {
        code: 'INVALID_ENERGY_INPUT',
        describe: (label) =>
          `${label} must be a positive finite value or a range with at least one positive finite bound.`,
      },
      'Total battery energy',
    );

    if (totalResolution.issue) {
      energyUnresolved = {
        code: 'INVALID_ENERGY_INPUT',
        message: totalResolution.issue.message,
        missing: ['energy.totalEnergyWh'],
      };
    }
  }

  // Usable-energy adjustment. A missing usablePercent means
  // no derating information was supplied: usable equals total
  // and the assumption list says so explicitly.
  let usableAssumptionIssued = false;

  if (totalResolution.quantity) {
    const totalEnergy = totalResolution.quantity;

    let usablePercent: ResolvedQuantity | undefined;

    if (usableParameter === undefined) {
      usableAssumptionIssued = true;
    } else {
      const usableResolution = resolvePositiveParameter(
        usableParameter,
        {
          code: 'INVALID_ENERGY_INPUT',
          describe: (label) =>
            `${label} must be a positive finite value or a range with at least one positive finite bound.`,
        },
        'Usable battery percentage',
      );

      if (usableResolution.issue) {
        warnings.push({
          code: usableResolution.issue.code,
          message: usableResolution.issue.message,
        });

        usableAssumptionIssued = true;
      } else if (usableResolution.quantity) {
        usablePercent = usableResolution.quantity;

        const percentMax =
          usablePercent.kind === 'point'
            ? usablePercent.value
            : usablePercent.max;

        if (percentMax !== undefined && percentMax > 100) {
          warnings.push({
            code: 'INVALID_USABLE_PERCENT',
            message:
              'Usable battery percentage should not exceed 100. The supplied value was kept, but it likely misstates the pack reserve.',
          });
        }

        parameters.push(
          parameterRecord(
            'energy.usablePercent',
            usableParameter,
            usablePercent,
            UNKNOWN_PROVENANCE,
          ),
        );
      }
    }

    if (usablePercent === undefined) {
      usableEnergy = totalEnergy;
    } else {
      const scale = (percent: number) => percent / 100;

      usableEnergy =
        usablePercent.kind === 'point'
          ? scaleQuantity(totalEnergy, scale(usablePercent.value))
          : (() => {
              // Multiply each known energy bound by each known
              // percent bound. Worst case pairs the lowest
              // energy with the lowest percent.
              const percentMin =
                usablePercent.min !== undefined
                  ? scale(usablePercent.min)
                  : undefined;
              const percentMax =
                usablePercent.max !== undefined
                  ? scale(usablePercent.max)
                  : undefined;

              const energyMin =
                totalEnergy.kind === 'point'
                  ? totalEnergy.value
                  : totalEnergy.min;
              const energyMax =
                totalEnergy.kind === 'point'
                  ? totalEnergy.value
                  : totalEnergy.max;

              const min =
                energyMin !== undefined && percentMin !== undefined
                  ? energyMin * percentMin
                  : undefined;
              const max =
                energyMax !== undefined && percentMax !== undefined
                  ? energyMax * percentMax
                  : undefined;

              if (min === undefined && max === undefined) {
                return undefined;
              }

              return {
                kind: 'range' as const,
                ...(min !== undefined ? { min } : {}),
                ...(max !== undefined ? { max } : {}),
              };
            })();
    }
  }

  if (usableAssumptionIssued && totalResolution.quantity) {
    assumptions.push({
      code: 'NO_USABLE_PERCENT_SUPPLIED',
      message:
        'No usable battery percentage was supplied, so the full rated pack energy was treated as usable. Real devices typically hold a protection reserve, so treat the resulting runtime as optimistic.',
      provenance: {
        kind: 'modeled',
        note: 'Structural assumption, not a device-specific figure.',
      },
    });
  }

  if (totalParameter !== undefined) {
    parameters.push(
      parameterRecord(
        'energy.totalEnergyWh',
        totalParameter,
        totalResolution.quantity,
        UNKNOWN_PROVENANCE,
      ),
    );
  }

  // -------------------------------------------------------
  // Workload power resolution
  // -------------------------------------------------------

  interface ResolvedWorkload {
    workload: BatteryExperienceWorkload;

    weight: number;

    power: ResolvedQuantity | undefined;

    quantities: ResolvedSubsystem['quantities'];
  }

  const resolvedWorkloads: ResolvedWorkload[] = [];

  const missingPowerWorkloads: string[] = [];

  const invalidPowerMessages: string[] = [];

  for (const workload of workloads) {
    const definition = input.workloads[workload];

    if (!definition) {
      continue;
    }

    const resolved = resolveSubsystemPower(definition.subsystems);

    invalidPowerMessages.push(...resolved.invalid);

    for (const entry of resolved.quantities) {
      parameters.push(
        parameterRecord(
          `workloads.${workload}.subsystems.${entry.subsystem}${entry.component ? `.${entry.component}` : ''}`,
          entry.parameter,
          entry.quantity,
          UNKNOWN_PROVENANCE,
        ),
      );
    }

    if (resolved.quantities.length === 0) {
      missingPowerWorkloads.push(workload);

      continue;
    }

    const total = sumQuantities(
      resolved.quantities.map((entry) => entry.quantity),
    );

    const weight =
      definition.weight !== undefined
        ? isPositiveFinite(definition.weight)
          ? definition.weight
          : 1
        : 1;

    if (
      definition.weight !== undefined &&
      !isPositiveFinite(definition.weight)
    ) {
      warnings.push({
        code: 'INVALID_WORKLOAD_WEIGHT',
        message: `Workload ${workload} weight must be a positive finite value. The workload was weighted as 1.`,
      });
    }

    resolvedWorkloads.push({
      workload,
      weight,
      power: total,
      quantities: resolved.quantities,
    });
  }

  if (invalidPowerMessages.length > 0) {
    for (const message of invalidPowerMessages) {
      warnings.push({
        code: 'INVALID_WORKLOAD_POWER',
        message,
      });
    }
  }

  if (missingPowerWorkloads.length > 0) {
    warnings.push({
      code: 'MISSING_WORKLOAD_POWER',
      message: `No usable power information was supplied for: ${missingPowerWorkloads.join(', ')}.`,
    });
  }

  // -------------------------------------------------------
  // Unresolved gate
  // -------------------------------------------------------

  if (
    energyUnresolved ||
    invalidPowerMessages.length > 0 ||
    resolvedWorkloads.length === 0
  ) {
    const missing: string[] = [];

    let code: BatteryExperienceUnresolved['code'];

    let message: string;

    if (energyUnresolved) {
      code = energyUnresolved.code;

      message = energyUnresolved.message;

      missing.push(...energyUnresolved.missing);
    } else if (invalidPowerMessages.length > 0) {
      // Invalid supplied values are rejected fail-closed: an
      // estimate that silently drops invalid power would
      // overstate runtime.
      code = 'INVALID_WORKLOAD_POWER';

      message =
        'Supplied workload power contained invalid values. Battery experience refuses to estimate runtime while ignoring supplied power. Correct or remove the invalid values.';

      missing.push('workloads.*.subsystems.* (invalid values)');
    } else {
      code = 'MISSING_WORKLOAD_POWER';

      message =
        'No workload has sufficient modeled or calibrated power information. Battery experience does not substitute default wattage figures.';

      if (missingPowerWorkloads.length > 0) {
        missing.push(
          ...missingPowerWorkloads.map(
            (workload) => `workloads.${workload}.subsystems.*`,
          ),
        );
      }
    }

    if (
      code !== 'MISSING_TOTAL_ENERGY' &&
      code !== 'INVALID_ENERGY_INPUT' &&
      usableEnergy === undefined
    ) {
      missing.push('energy.totalEnergyWh');
    }

    return {
      result: {
        engineVersion: BATTERY_EXPERIENCE_VERSION,
        status: 'unresolved',
        unresolved: { code, message, missing },
      },
      warnings,
    };
  }

  // -------------------------------------------------------
  // Weighted average power across workloads
  // -------------------------------------------------------

  const weightTotal = resolvedWorkloads.reduce(
    (total, workload) => total + workload.weight,
    0,
  );

  let averagePower: ResolvedQuantity | undefined;

  if (resolvedWorkloads.length === 1 && weightTotal === 1) {
    averagePower = resolvedWorkloads[0].power;
  } else {
    let min: number | undefined;
    let max: number | undefined;
    let minKnown = true;
    let maxKnown = true;

    for (const workload of resolvedWorkloads) {
      if (workload.power === undefined) {
        minKnown = false;
        maxKnown = false;
        continue;
      }

      const share = workload.weight / weightTotal;

      const scaled = scaleQuantity(workload.power, share);

      if (scaled.kind === 'point') {
        min = (min ?? 0) + scaled.value;
        max = (max ?? 0) + scaled.value;
      } else {
        if (scaled.min !== undefined) {
          min = (min ?? 0) + scaled.min;
        } else {
          minKnown = false;
        }

        if (scaled.max !== undefined) {
          max = (max ?? 0) + scaled.max;
        } else {
          maxKnown = false;
        }
      }
    }

    if (minKnown && maxKnown && min !== undefined && max !== undefined && min === max) {
      averagePower = { kind: 'point', value: min };
    } else if (minKnown || maxKnown) {
      averagePower = {
        kind: 'range',
        ...(minKnown ? { min } : {}),
        ...(maxKnown ? { max } : {}),
      };
    }
  }

  // -------------------------------------------------------
  // Runtime derivation
  // -------------------------------------------------------

  const runtime =
    usableEnergy !== undefined && averagePower !== undefined
      ? divideEnergyByPower(usableEnergy, averagePower)
      : undefined;

  // -------------------------------------------------------
  // Contributors
  // -------------------------------------------------------

  const contributors: BatteryExperienceContributor[] = [];

  const midpointBases = new Set<string>();

  if (averagePower !== undefined) {
    const totalMidpoint = quantityMidpoint(averagePower);

    for (const workload of resolvedWorkloads) {
      const share = workload.weight / weightTotal;

      for (const entry of workload.quantities) {
        const scaled = scaleQuantity(entry.quantity, share);

        const midpoint = quantityMidpoint(scaled);

        let sharePercent: number | undefined;

        if (totalMidpoint && midpoint && totalMidpoint.value > 0) {
          sharePercent = (midpoint.value / totalMidpoint.value) * 100;

          midpointBases.add(totalMidpoint.basis);
          midpointBases.add(midpoint.basis);
        }

        contributors.push({
          workload: workload.workload,
          subsystem: entry.subsystem,
          ...(entry.component ? { component: entry.component } : {}),
          powerW: bounds(scaled),
          ...(sharePercent !== undefined ? { sharePercent } : {}),
        });
      }
    }
  }

  // -------------------------------------------------------
  // Confidence from input quality
  // -------------------------------------------------------

  const confidenceNotes: string[] = [];

  let confidence: BatteryExperienceConfidence;

  const pointPower =
    averagePower !== undefined && averagePower.kind === 'point';

  const pointEnergy =
    usableEnergy !== undefined && usableEnergy.kind === 'point';

  const anyRangePower =
    averagePower !== undefined &&
    (averagePower.kind === 'range' ||
      resolvedWorkloads.some((workload) =>
        workload.quantities.some(
          (entry) => entry.quantity.kind === 'range',
        ),
      ));

  const unrecordedProvenance = parameters.filter(
    (record) => record.provenance?.note === UNTYPED_PROVENANCE_NOTE,
  );

  if (
    pointPower &&
    pointEnergy &&
    !anyRangePower &&
    unrecordedProvenance.length === 0
  ) {
    confidence = 'deterministic';

    confidenceNotes.push(
      'All energy and power inputs were supplied as exact positive values with recorded provenance, so the runtime figure is a deterministic division.',
    );
  } else {
    const unknownBounds: string[] = [];

    if (averagePower?.kind === 'range') {
      if (averagePower.min === undefined) {
        unknownBounds.push('lower average power bound');
      }

      if (averagePower.max === undefined) {
        unknownBounds.push('upper average power bound');
      }
    }

    if (usableEnergy?.kind === 'range') {
      if (usableEnergy.min === undefined) {
        unknownBounds.push('lower usable energy bound');
      }

      if (usableEnergy.max === undefined) {
        unknownBounds.push('upper usable energy bound');
      }
    }

    if (unknownBounds.length > 0) {
      confidenceNotes.push(
        `Runtime bounds are incomplete because the ${unknownBounds.join(' and ')} could not be derived from the supplied inputs.`,
      );
    } else {
      confidenceNotes.push(
        'All energy and power bounds were derived from the supplied inputs; the result is a range, not a single measured figure.',
      );
    }

    if (midpointBases.has('range_midpoint')) {
      confidenceNotes.push(
        'Contributor shares use range midpoints as their basis, so treat them as indicative weightings rather than exact splits.',
      );
    }

    if (unrecordedProvenance.length > 0) {
      confidenceNotes.push(
        `${unrecordedProvenance.length} parameter(s) carry no explicit provenance; they are recorded as modeled with unknown origin.`,
      );
    }

    const partialBounds =
      (averagePower !== undefined && hasAnyBound(averagePower)) ||
      (usableEnergy !== undefined && hasAnyBound(usableEnergy));

    if (!partialBounds) {
      confidence = 'low';

      confidenceNotes.push(
        'Neither power nor energy could be resolved into any usable bound.',
      );
    } else if (unknownBounds.length > 0) {
      confidence = 'low';
    } else if (unrecordedProvenance.length > 0) {
      confidence = 'moderate';
    } else {
      confidence = 'high';
    }
  }

  // -------------------------------------------------------
  // Assemble
  // -------------------------------------------------------

  const estimate: NonNullable<BatteryExperienceResult['estimate']> = {
    workloads: resolvedWorkloads.map((workload) => ({
      workload: workload.workload,

      ...(runtime
        ? { runtimeHours: bounds(runtime) }
        : {}),

      ...(workload.power
        ? { averagePowerW: bounds(workload.power) }
        : {}),
    })),

    ...(usableEnergy ? { usableEnergyWh: bounds(usableEnergy) } : {}),

    assumptions,

    parameters,

    contributors,

    warnings,
  };

  return {
    result: {
      engineVersion: BATTERY_EXPERIENCE_VERSION,
      status: 'resolved',
      estimate,
      confidence,
      confidenceNotes,
      ...(averagePower
        ? {
            comparisonReady: {
              averagePowerW: bounds(averagePower),
            },
          }
        : {}),
    },
    warnings,
  };
}

// ---------------------------------------------------------
// Comparison helper (structure for the future Upgrade
// Simulator; candidate = this result, baseline = another)
// ---------------------------------------------------------

export function compareBatteryExperience(
  baselineLabel: string,
  baseline: BatteryExperienceResult,
  candidateLabel: string,
  candidate: BatteryExperienceResult,
): BatteryExperienceComparison | undefined {
  if (
    baseline.status !== 'resolved' ||
    candidate.status !== 'resolved' ||
    !baseline.estimate ||
    !candidate.estimate
  ) {
    return undefined;
  }

  const baselinePower =
    baseline.comparisonReady?.averagePowerW ??
    (baseline.estimate.workloads.length === 1
      ? baseline.estimate.workloads[0].averagePowerW
      : undefined);

  const candidatePower =
    candidate.comparisonReady?.averagePowerW ??
    (candidate.estimate.workloads.length === 1
      ? candidate.estimate.workloads[0].averagePowerW
      : undefined);

  const deltas: BatteryExperienceBaselineDelta[] = [];

  for (const candidateWorkload of candidate.estimate.workloads) {
    const baselineWorkload = baseline.estimate.workloads.find(
      (entry) => entry.workload === candidateWorkload.workload,
    );

    if (!baselineWorkload) {
      continue;
    }

    const runtimeDelta = (() => {
      if (
        candidateWorkload.runtimeHours === undefined ||
        baselineWorkload.runtimeHours === undefined
      ) {
        return undefined;
      }

      const candidateMin = candidateWorkload.runtimeHours.min;
      const candidateMax = candidateWorkload.runtimeHours.max;
      const baselineMin = baselineWorkload.runtimeHours.min;
      const baselineMax = baselineWorkload.runtimeHours.max;

      const min =
        candidateMin !== undefined && baselineMax !== undefined
          ? candidateMin - baselineMax
          : undefined;
      const max =
        candidateMax !== undefined && baselineMin !== undefined
          ? candidateMax - baselineMin
          : undefined;

      if (min === undefined && max === undefined) {
        return undefined;
      }

      return {
        ...(min !== undefined ? { min } : {}),
        ...(max !== undefined ? { max } : {}),
      };
    })();

    const powerDelta = (() => {
      if (
        candidateWorkload.averagePowerW === undefined ||
        baselineWorkload.averagePowerW === undefined
      ) {
        return undefined;
      }

      const candidateMin = candidateWorkload.averagePowerW.min;
      const candidateMax = candidateWorkload.averagePowerW.max;
      const baselineMin = baselineWorkload.averagePowerW.min;
      const baselineMax = baselineWorkload.averagePowerW.max;

      const min =
        candidateMin !== undefined && baselineMax !== undefined
          ? candidateMin - baselineMax
          : undefined;
      const max =
        candidateMax !== undefined && baselineMin !== undefined
          ? candidateMax - baselineMin
          : undefined;

      if (min === undefined && max === undefined) {
        return undefined;
      }

      return {
        ...(min !== undefined ? { min } : {}),
        ...(max !== undefined ? { max } : {}),
      };
    })();

    deltas.push({
      workload: candidateWorkload.workload,
      ...(runtimeDelta ? { runtimeHours: runtimeDelta } : {}),
      ...(powerDelta ? { averagePowerW: powerDelta } : {}),
    });
  }

  return {
    baseline: {
      label: baselineLabel,
      ...(baselinePower ? { averagePowerW: baselinePower } : {}),
    },
    candidate: {
      label: candidateLabel,
      ...(candidatePower ? { averagePowerW: candidatePower } : {}),
    },
    deltas,
  };
}

export const BATTERY_EXPERIENCE_VERSION = '0.5.0-battery.1';

export type {
  ModelParameter,
  ModelParameterInput,
  ModelProvenance,
  ModelProvenanceKind,
  ModelRange,
} from './modeling';
