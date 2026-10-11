export const BATTERY_CYCLE_EXPOSURE_VERSION =
  'battery-cycle-exposure-0.1.0';

export interface BatteryCycleExposureInput {
  ageYears?: number;
  dailyDrainWh?: number;
  batteryEnergyWh?: number;
  dailyDrainMah?: number;
  batteryCapacityMah?: number;
}

export interface BatteryCycleExposureResult {
  version: string;
  status: 'resolved' | 'unresolved';
  basis?: 'wh' | 'mah';
  ageYears?: number;
  equivalentFullCyclesPerDay?: number;
  equivalentFullCyclesPerYear?: number;
  equivalentFullCycles?: number;
  unresolvedReason?: string;
  note: string;
}

function positive(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value > 0
  );
}

function nonNegative(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= 0
  );
}

export function calculateBatteryCycleExposure(
  input: BatteryCycleExposureInput,
): BatteryCycleExposureResult {
  const ageYears =
    nonNegative(input.ageYears)
      ? input.ageYears
      : undefined;

  if (ageYears === undefined) {
    return {
      version:
        BATTERY_CYCLE_EXPOSURE_VERSION,
      status: 'unresolved',
      unresolvedReason:
        'Battery age is required to estimate cumulative equivalent full cycles.',
      note:
        'Cycle exposure is not inferred without an explicit age horizon.',
    };
  }

  const hasWh =
    nonNegative(input.dailyDrainWh) &&
    positive(input.batteryEnergyWh);

  const hasMah =
    nonNegative(input.dailyDrainMah) &&
    positive(input.batteryCapacityMah);

  if (!hasWh && !hasMah) {
    return {
      version:
        BATTERY_CYCLE_EXPOSURE_VERSION,
      status: 'unresolved',
      ageYears,
      unresolvedReason:
        'Daily battery drain and matching battery energy/capacity are required.',
      note:
        'No cycle exposure is estimated from incomplete drain evidence.',
    };
  }

  const basis =
    hasWh
      ? 'wh' as const
      : 'mah' as const;

  const equivalentFullCyclesPerDay =
    basis === 'wh'
      ? input.dailyDrainWh! /
        input.batteryEnergyWh!
      : input.dailyDrainMah! /
        input.batteryCapacityMah!;

  const equivalentFullCyclesPerYear =
    equivalentFullCyclesPerDay * 365;

  return {
    version:
      BATTERY_CYCLE_EXPOSURE_VERSION,
    status: 'resolved',
    basis,
    ageYears,
    equivalentFullCyclesPerDay,
    equivalentFullCyclesPerYear,
    equivalentFullCycles:
      equivalentFullCyclesPerYear *
      ageYears,
    note:
      'Equivalent full cycles are estimated from the simulator’s active-use daily drain only. Standby, charging inefficiency, background drain and days with different usage are not included, so this is a workload-exposure estimate rather than a device cycle-counter reading.',
  };
}
