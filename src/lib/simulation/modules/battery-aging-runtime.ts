export const BATTERY_AGING_RUNTIME_VERSION =
  'battery-aging-runtime-0.1.0';

export interface BatteryAgingRuntimeInput {
  baselineRuntimeHours?: number;
  retainedEnergyFraction?: number;
}

export interface BatteryAgingRuntimeResult {
  version: string;
  status: 'resolved' | 'unresolved';
  baselineRuntimeHours?: number;
  retainedEnergyFraction?: number;
  agedRuntimeHours?: number;
  runtimeDeltaHours?: number;
  runtimeDeltaPercent?: number;
  unresolvedReason?: string;
  note: string;
}

export function calculateBatteryAgingRuntime(
  input: BatteryAgingRuntimeInput,
): BatteryAgingRuntimeResult {
  if (
    input.baselineRuntimeHours === undefined ||
    !Number.isFinite(
      input.baselineRuntimeHours,
    ) ||
    input.baselineRuntimeHours <= 0 ||
    input.retainedEnergyFraction === undefined ||
    !Number.isFinite(
      input.retainedEnergyFraction,
    ) ||
    input.retainedEnergyFraction <= 0 ||
    input.retainedEnergyFraction > 1
  ) {
    return {
      version:
        BATTERY_AGING_RUNTIME_VERSION,
      status: 'unresolved',
      unresolvedReason:
        'Baseline runtime and retained battery-energy fraction are required.',
      note:
        'Aged runtime is withheld unless both baseline runtime and retained energy are known.',
    };
  }

  const agedRuntimeHours =
    input.baselineRuntimeHours *
    input.retainedEnergyFraction;
  const runtimeDeltaHours =
    agedRuntimeHours -
    input.baselineRuntimeHours;
  const runtimeDeltaPercent =
    (
      input.retainedEnergyFraction -
      1
    ) * 100;

  return {
    version:
      BATTERY_AGING_RUNTIME_VERSION,
    status: 'resolved',
    baselineRuntimeHours:
      input.baselineRuntimeHours,
    retainedEnergyFraction:
      input.retainedEnergyFraction,
    agedRuntimeHours,
    runtimeDeltaHours,
    runtimeDeltaPercent,
    note:
      'Runtime scales with retained usable battery energy under an explicit same-workload-drain assumption. Aging-related changes in voltage sag, thermal behavior, internal resistance or software are not modeled here.',
  };
}
