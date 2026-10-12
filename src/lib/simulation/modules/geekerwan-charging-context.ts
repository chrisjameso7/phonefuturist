import type {
  DeviceCorpus,
} from './device-corpus';
import {
  buildGeekerwanChargingEfficiencyRows,
} from './geekerwan-charging-efficiency';

export const GEEKERWAN_CHARGING_CONTEXT_VERSION =
  'geekerwan-charging-context-0.1.0';

export interface GeekerwanChargingContextInput {
  batteryEnergyWh?: number;
  chargerWatts?: number;
  manufacturer?: string;
  limit?: number;
}

export interface GeekerwanChargingContextResult {
  version: string;
  status: 'resolved' | 'unresolved';
  expectedFullChargeMinutes?: number;
  minFullChargeMinutes?: number;
  maxFullChargeMinutes?: number;
  expectedWallInputEnergyWh?: number;
  expectedCellToWallEnergyRatio?: number;
  expectedWallToCellOverheadPercent?: number;
  expectedAverageChargerUtilizationPercent?: number;
  expectedAverageWallInputPowerW?: number;
  referenceCount: number;
  sameManufacturerReferences: number;
  evidenceRangeWatts?: {
    min: number;
    max: number;
  };
  targetPosition?:
    | 'interpolation'
    | 'near-extrapolation'
    | 'far-extrapolation';
  neighborIds: string[];
  unresolvedReason?: string;
  note: string;
}

function positive(
  value: unknown,
): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value > 0
  );
}

function normalizeManufacturer(
  value?: string,
) {
  return value
    ?.trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function weightedMean(
  rows: Array<{
    value: number;
    weight: number;
  }>,
) {
  const total =
    rows.reduce(
      (sum, row) =>
        sum + row.weight,
      0,
    );

  return rows.reduce(
    (sum, row) =>
      sum +
      row.value *
        row.weight,
    0,
  ) /
    Math.max(
      total,
      Number.EPSILON,
    );
}

function targetPosition(
  targetWatts: number,
  values: number[],
) {
  const min =
    Math.min(...values);
  const max =
    Math.max(...values);

  if (
    targetWatts >= min &&
    targetWatts <= max
  ) {
    return 'interpolation' as const;
  }

  const nearestDistance =
    Math.min(
      Math.abs(
        targetWatts - min,
      ),
      Math.abs(
        targetWatts - max,
      ),
    );

  const scale =
    Math.max(
      Math.min(
        Math.abs(min),
        Math.abs(max),
      ),
      1,
    );

  return nearestDistance /
      scale <=
    0.25
    ? 'near-extrapolation' as const
    : 'far-extrapolation' as const;
}

export function estimateGeekerwanChargingContext(
  corpus: DeviceCorpus,
  input: GeekerwanChargingContextInput,
): GeekerwanChargingContextResult {
  if (
    !positive(
      input.batteryEnergyWh,
    )
  ) {
    return {
      version:
        GEEKERWAN_CHARGING_CONTEXT_VERSION,
      status: 'unresolved',
      referenceCount: 0,
      sameManufacturerReferences: 0,
      neighborIds: [],
      unresolvedReason:
        'Target battery energy in Wh is required.',
      note:
        'The Geekerwan wall-energy context refuses to convert mAh into Wh without accepted voltage/energy evidence.',
    };
  }

  if (
    !positive(
      input.chargerWatts,
    )
  ) {
    return {
      version:
        GEEKERWAN_CHARGING_CONTEXT_VERSION,
      status: 'unresolved',
      referenceCount: 0,
      sameManufacturerReferences: 0,
      neighborIds: [],
      unresolvedReason:
        'Target charger wattage is required.',
      note:
        'Advertised or measured charger class must be explicit for Geekerwan wall-energy context.',
    };
  }

  const paired =
    buildGeekerwanChargingEfficiencyRows(
      corpus,
    ).rows;

  if (!paired.length) {
    return {
      version:
        GEEKERWAN_CHARGING_CONTEXT_VERSION,
      status: 'unresolved',
      referenceCount: 0,
      sameManufacturerReferences: 0,
      neighborIds: [],
      unresolvedReason:
        'No Geekerwan battery/charging energy pairs are available.',
      note:
        'No wall-to-cell efficiency is invented when same-device measured pairs are absent.',
    };
  }

  const targetManufacturer =
    normalizeManufacturer(
      input.manufacturer,
    );

  const sameManufacturer =
    targetManufacturer
      ? paired.filter(
          (row) =>
            normalizeManufacturer(
              row.manufacturer,
            ) ===
            targetManufacturer,
        )
      : [];

  const pool =
    sameManufacturer.length >= 2
      ? sameManufacturer
      : paired;

  const weighted =
    pool.map((row) => {
      const wattDistance =
        Math.abs(
          row.chargerPowerW -
          input.chargerWatts!,
        ) /
        Math.max(
          input.chargerWatts!,
          1,
        );

      const energyDistance =
        Math.abs(
          row.batteryEnergyWh -
          input.batteryEnergyWh!,
        ) /
        Math.max(
          input.batteryEnergyWh!,
          0.1,
        );

      const manufacturerBonus =
        targetManufacturer &&
        normalizeManufacturer(
          row.manufacturer,
        ) ===
          targetManufacturer
          ? 1.5
          : 1;

      const weight =
        manufacturerBonus /
        (
          1 +
          wattDistance * 3 +
          energyDistance * 2
        ) ** 2;

      return {
        row,
        weight,
      };
    })
    .sort(
      (a, b) =>
        b.weight -
        a.weight,
    )
    .slice(
      0,
      Math.max(
        1,
        input.limit ?? 8,
      ),
    );

  const efficiency =
    weightedMean(
      weighted.map(
        ({ row, weight }) => ({
          value:
            row.cellToWallEnergyRatio,
          weight,
        }),
      ),
    );

  const utilization =
    weightedMean(
      weighted.map(
        ({ row, weight }) => ({
          value:
            row.averageChargerUtilizationFraction,
          weight,
        }),
      ),
    );

  if (
    !positive(efficiency) ||
    !positive(utilization)
  ) {
    return {
      version:
        GEEKERWAN_CHARGING_CONTEXT_VERSION,
      status: 'unresolved',
      referenceCount: 0,
      sameManufacturerReferences:
        sameManufacturer.length,
      neighborIds: [],
      unresolvedReason:
        'Selected Geekerwan pairs do not provide valid energy efficiency and charger utilization.',
      note:
        'The context model fails closed rather than substituting generic charging efficiency.',
    };
  }

  const expectedWallInputEnergyWh =
    input.batteryEnergyWh /
    efficiency;

  const expectedAverageWallInputPowerW =
    input.chargerWatts *
    utilization;

  const expectedFullChargeMinutes =
    expectedWallInputEnergyWh /
    expectedAverageWallInputPowerW *
    60;

  const perReferenceMinutes =
    weighted.map(
      ({ row }) => {
        const wallEnergy =
          input.batteryEnergyWh! /
          row.cellToWallEnergyRatio;

        const averagePower =
          input.chargerWatts! *
          row.averageChargerUtilizationFraction;

        return wallEnergy /
          averagePower *
          60;
      },
    );

  const watts =
    weighted.map(
      ({ row }) =>
        row.chargerPowerW,
    );

  return {
    version:
      GEEKERWAN_CHARGING_CONTEXT_VERSION,
    status: 'resolved',
    expectedFullChargeMinutes,
    minFullChargeMinutes:
      Math.min(
        ...perReferenceMinutes,
      ),
    maxFullChargeMinutes:
      Math.max(
        ...perReferenceMinutes,
      ),
    expectedWallInputEnergyWh,
    expectedCellToWallEnergyRatio:
      efficiency,
    expectedWallToCellOverheadPercent:
      (
        1 /
          efficiency -
        1
      ) *
      100,
    expectedAverageChargerUtilizationPercent:
      utilization * 100,
    expectedAverageWallInputPowerW,
    referenceCount:
      weighted.length,
    sameManufacturerReferences:
      sameManufacturer.length,
    evidenceRangeWatts: {
      min:
        Math.min(...watts),
      max:
        Math.max(...watts),
    },
    targetPosition:
      targetPosition(
        input.chargerWatts,
        watts,
      ),
    neighborIds:
      weighted.map(
        ({ row }) =>
          row.canonicalDeviceId,
      ),
    note:
      sameManufacturer.length >= 2
        ? 'Geekerwan context is weighted from same-manufacturer phones first, using measured cell-to-wall energy ratio and average charger utilization. It is an independent wall-energy estimate and does not replace the main charging corpus estimator.'
        : 'Geekerwan context uses the closest measured cross-brand energy/charger pairs because fewer than two same-manufacturer pairs were available. It remains independent from the main charging estimator.',
  };
}
