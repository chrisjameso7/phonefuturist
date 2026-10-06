/**
 * Interactive Leaks live math kernel.
 *
 * This file contains only exact transformations of explicit inputs.
 * It never chooses assumptions, fills missing values, or predicts an
 * unreleased device. Auto/Manual input generation belongs above this layer.
 */

function positiveFinite(value: number | undefined): value is number {
  return value !== undefined && Number.isFinite(value) && value > 0;
}

/** Exact electrical conversion: mAh × V / 1000 = Wh. */
export function batteryEnergyWh(
  capacityMah: number | undefined,
  nominalVoltageV: number | undefined,
): number | undefined {
  if (!positiveFinite(capacityMah) || !positiveFinite(nominalVoltageV)) return undefined;
  return (capacityMah * nominalVoltageV) / 1000;
}

/** Applies an explicitly supplied usable-energy percentage. No default is assumed. */
export function usableEnergyWh(
  ratedEnergyWh: number | undefined,
  usablePercent: number | undefined,
): number | undefined {
  if (!positiveFinite(ratedEnergyWh)) return undefined;
  if (!positiveFinite(usablePercent) || usablePercent > 100) return undefined;
  return ratedEnergyWh * usablePercent / 100;
}

/** Exact runtime identity for an explicitly supplied average whole-device power. */
export function runtimeHours(
  usableWh: number | undefined,
  averagePowerW: number | undefined,
): number | undefined {
  if (!positiveFinite(usableWh) || !positiveFinite(averagePowerW)) return undefined;
  return usableWh / averagePowerW;
}
