import { SOC_MODELS } from '../soc-model-catalog';
import type { SimulationInput } from '../types';
import type { DeviceCorpus } from './device-corpus';
import { resolveCorpusRuntimeBand } from './corpus-runtime';
import { estimateDailyBatteryBudget, type DailyBatteryBudgetResult } from './battery-daily-budget';
import { estimateChargingFromCorpus } from './charging-corpus-estimator';
import { estimateWirelessChargingFromCorpus } from './wireless-charging-estimator';

export const BATTERY_EXPERIENCE_ENGINE_VERSION = 'battery-experience-engine-0.3.0';

export interface BatteryExperienceInput {
  simulation: SimulationInput;
  manufacturer?: string;
  socVendor?: string;
  socName?: string;
  /** Independently measured average screen-off draw, in watts. */
  standbyPowerW?: number;
  region?: string;
  batteryChemistry?: string;
  cellArchitecture?: 'single-cell' | 'dual-cell' | 'tri-cell' | 'quad-cell' | 'unknown';
  wiredWatts?: number;
  wirelessWatts?: number;
  wiredChargingStandard?: string;
  wirelessChargingStandard?: string;
  dailyUseHours?: Partial<Record<
    'web_browsing' | 'video_playback' | 'gaming',
    number
  >>;
  coolingClass?:
    | 'passive-graphite'
    | 'vapor-chamber'
    | 'large-vapor-chamber'
    | 'active-fan'
    | 'other';
}

export interface BatteryRuntimeExperience {
  workload: 'web_browsing' | 'video_playback' | 'gaming';
  status: 'resolved' | 'unresolved';
  expectedHours?: number;
  minHours?: number;
  maxHours?: number;
  energyBasis?: 'wh' | 'mah';
  expectedDrainMahPerHour?: number;
  expectedDrainWhPerHour?: number;
  confidence?: number;
  averageSimilarity?: number;
  averageCoverage?: number;
  referenceCount?: number;
  neighborIds?: string[];
  sourceRecordCount?: number;
  publisherCount?: number;
  protocolFamilyCount?: number;
  evidenceScope?:
    | 'same-soc-family'
    | 'same-soc-vendor'
    | 'protocol-cohort';
  sameSocFamilyReferences?: number;
  sameSocVendorReferences?: number;
  note?: string;
}

export interface MixedUseBatteryEstimate {
  interpretation: 'active-use-only';
  energyBasis: 'wh' | 'mah';
  activeHoursPerDay: number;
  expectedDrainMahPerDay?: number;
  minDrainMahPerDay?: number;
  maxDrainMahPerDay?: number;
  expectedDrainWhPerDay?: number;
  minDrainWhPerDay?: number;
  maxDrainWhPerDay?: number;
  expectedActiveUseHoursPerCharge: number;
  minActiveUseHoursPerCharge: number;
  maxActiveUseHoursPerCharge: number;
  /**
   * Compatibility aliases. These are active-use profile repeats,
   * not literal calendar-day battery-life predictions.
   */
  expectedDaysPerCharge: number;
  minDaysPerCharge: number;
  maxDaysPerCharge: number;
  confidence: number;
  workloads: Array<{
    workload: 'web_browsing' | 'video_playback' | 'gaming';
    hoursPerDay: number;
    expectedDrainMahPerHour?: number;
    expectedDrainWhPerHour?: number;
    energyBasis: 'wh' | 'mah';
  }>;
}

export interface BatteryExperienceResult {
  version: string;
  status: 'resolved' | 'partial' | 'unresolved';
  capacityMah?: number;
  energyWh?: number;
  runtimes: BatteryRuntimeExperience[];
  mixedUse?: MixedUseBatteryEstimate;
  calendarEndurance?: DailyBatteryBudgetResult;
  charging?: ReturnType<typeof estimateChargingFromCorpus>;
  wirelessCharging?: ReturnType<typeof estimateWirelessChargingFromCorpus>;
  warnings: string[];
}

function capacityMah(input: SimulationInput) {
  const cells = input.battery?.cells ?? [];
  if (!cells.length || cells.some((cell) => !Number.isFinite(cell.capacityMah))) {
    return undefined;
  }

  return cells.reduce((sum, cell) => sum + (cell.capacityMah ?? 0), 0);
}
function energyWh(input: SimulationInput) {
  const cells = input.battery?.cells ?? [];

  if (
    !cells.length ||
    cells.some(
      (cell) =>
        !Number.isFinite(cell.capacityMah) ||
        !Number.isFinite(cell.nominalVoltageV) ||
        (cell.capacityMah ?? 0) <= 0 ||
        (cell.nominalVoltageV ?? 0) <= 0,
    )
  ) {
    return undefined;
  }

  return cells.reduce(
    (sum, cell) =>
      sum +
      ((cell.capacityMah ?? 0) *
        (cell.nominalVoltageV ?? 0)) /
        1000,
    0,
  );
}


function runtimeFromDrain(
  capacity: number,
  minDrain: number,
  expectedDrain: number,
  maxDrain: number,
) {
  return {
    minHours: capacity / Math.max(maxDrain, Number.EPSILON),
    expectedHours: capacity / Math.max(expectedDrain, Number.EPSILON),
    maxHours: capacity / Math.max(minDrain, Number.EPSILON),
  };
}

export function simulateBatteryExperience(
  corpus: DeviceCorpus,
  input: BatteryExperienceInput,
): BatteryExperienceResult {
  const capacity = capacityMah(input.simulation);
  const packEnergyWh = energyWh(input.simulation);
  const warnings: string[] = [];

  if (!capacity) {
    return {
      version: BATTERY_EXPERIENCE_ENGINE_VERSION,
      status: 'unresolved',
      runtimes: [],
      warnings: ['Battery capacity is required.'],
    };
  }

  const workloads = [
    'web_browsing',
    'video_playback',
    'gaming',
  ] as const;

  // Future chip names do not constitute measured battery-efficiency evidence.
  // Use the neutral comparison cohort until matching device measurements exist.
  const previewChip = !!input.socName && Object.values(SOC_MODELS).some(
    group => group.preview.includes(input.socName!),
  );
  const comparableSocVendor = previewChip ? undefined : input.socVendor;
  const comparableSocName = previewChip ? undefined : input.socName;

  const runtimes: BatteryRuntimeExperience[] = workloads.map((workload) => {
    const band = resolveCorpusRuntimeBand(
      corpus,
      input.simulation,
      workload,
      {},
      {
        manufacturer: input.manufacturer,
        socVendor: comparableSocVendor,
        socName: comparableSocName,
        batteryChemistry:
          input.batteryChemistry,
        coolingClass: input.coolingClass,
      },
    );

    if (band.status !== 'resolved' || !band.estimate) {
      return {
        workload,
        status: 'unresolved',
        note: band.unresolvedReason,
      };
    }

    const useWh =
      band.estimate.energyBasis === 'wh' &&
      packEnergyWh !== undefined &&
      band.estimate.minWhPerHour !== undefined &&
      band.estimate.expectedWhPerHour !== undefined &&
      band.estimate.maxWhPerHour !== undefined;

    const runtime = useWh
      ? runtimeFromDrain(
          packEnergyWh,
          band.estimate.minWhPerHour!,
          band.estimate.expectedWhPerHour!,
          band.estimate.maxWhPerHour!,
        )
      : runtimeFromDrain(
          capacity,
          band.estimate.minMahPerHour,
          band.estimate.expectedMahPerHour,
          band.estimate.maxMahPerHour,
        );

    return {
      workload,
      status: 'resolved',
      ...runtime,
      energyBasis: useWh ? 'wh' : 'mah',
      ...(useWh
        ? {
            expectedDrainWhPerHour:
              band.estimate.expectedWhPerHour,
          }
        : {
            expectedDrainMahPerHour:
              band.estimate.expectedMahPerHour,
          }),
      confidence: band.estimate.confidence,
      averageSimilarity:
        band.estimate.averageSimilarity,
      averageCoverage:
        band.estimate.averageCoverage,
      referenceCount: band.estimate.referenceCount,
      neighborIds: band.estimate.neighborIds,
      sourceRecordCount:
        band.estimate.sourceRecordCount,
      publisherCount:
        band.estimate.publisherCount,
      protocolFamilyCount:
        band.estimate.protocolFamilyCount,
      evidenceScope:
        band.estimate.evidenceScope,
      sameSocFamilyReferences:
        band.estimate.sameSocFamilyReferences,
      sameSocVendorReferences:
        band.estimate.sameSocVendorReferences,
      note: band.estimate.note,
    };
  });

  if (input.socName?.trim()) {
    const fallbackScopes = [...new Set(
      runtimes
        .filter((runtime) => runtime.status === 'resolved' && runtime.evidenceScope !== 'same-soc-family')
        .map((runtime) => runtime.evidenceScope),
    )];
    if (fallbackScopes.length) {
      warnings.push(
        `Chip-specific battery efficiency is not validated for "${input.socName}". Some runtime estimates use ${fallbackScopes.map((scope) => scope === 'same-soc-vendor' ? 'other chips from the same SoC vendor' : 'a wider device cohort').join(' and ')}. Different generations may produce nearly identical results; do not use these estimates to rank SoCs.`,
      );
    }
  }

  if (previewChip) {
    warnings.push('Upcoming SoC battery efficiency is unmeasured. Endurance uses a neutral device cohort, not a chip-specific advantage.');
  }

  let mixedUse: MixedUseBatteryEstimate | undefined;

  if (input.dailyUseHours) {
    const selected = runtimes.flatMap((runtime) => {
      const hours = input.dailyUseHours?.[runtime.workload] ?? 0;

      if (
        hours <= 0 ||
        runtime.status !== 'resolved'
      ) {
        return [];
      }

      const sourceBand = resolveCorpusRuntimeBand(
        corpus,
        input.simulation,
        runtime.workload,
        {},
        {
        manufacturer: input.manufacturer,
        socVendor: comparableSocVendor,
        socName: comparableSocName,
        batteryChemistry:
          input.batteryChemistry,
        coolingClass: input.coolingClass,
      },
      );

      if (sourceBand.status !== 'resolved' || !sourceBand.estimate) {
        return [];
      }

      const useWh =
        sourceBand.estimate.energyBasis === 'wh' &&
        packEnergyWh !== undefined &&
        sourceBand.estimate.minWhPerHour !== undefined &&
        sourceBand.estimate.expectedWhPerHour !== undefined &&
        sourceBand.estimate.maxWhPerHour !== undefined;

      return [{
        workload: runtime.workload,
        hoursPerDay: hours,
        energyBasis: useWh ? 'wh' as const : 'mah' as const,
        expectedDrainMahPerHour:
          sourceBand.estimate.expectedMahPerHour,
        minDrainMahPerHour:
          sourceBand.estimate.minMahPerHour,
        maxDrainMahPerHour:
          sourceBand.estimate.maxMahPerHour,
        expectedDrainWhPerHour:
          useWh
            ? sourceBand.estimate.expectedWhPerHour
            : undefined,
        minDrainWhPerHour:
          useWh
            ? sourceBand.estimate.minWhPerHour
            : undefined,
        maxDrainWhPerHour:
          useWh
            ? sourceBand.estimate.maxWhPerHour
            : undefined,
        confidence: sourceBand.estimate.confidence,
      }];
    });

    const activeHoursPerDay = selected.reduce(
      (sum, row) => sum + row.hoursPerDay,
      0,
    );

    if (activeHoursPerDay > 0 && selected.length > 0) {
      const useWh =
        packEnergyWh !== undefined &&
        selected.every(
          (row) =>
            row.energyBasis === 'wh' &&
            row.expectedDrainWhPerHour !== undefined &&
            row.minDrainWhPerHour !== undefined &&
            row.maxDrainWhPerHour !== undefined,
        );

      const expectedDrainMahPerDay = useWh
        ? undefined
        : selected.reduce(
            (sum, row) =>
              sum +
              row.hoursPerDay *
                row.expectedDrainMahPerHour,
            0,
          );
      const minDrainMahPerDay = useWh
        ? undefined
        : selected.reduce(
            (sum, row) =>
              sum +
              row.hoursPerDay *
                row.minDrainMahPerHour,
            0,
          );
      const maxDrainMahPerDay = useWh
        ? undefined
        : selected.reduce(
            (sum, row) =>
              sum +
              row.hoursPerDay *
                row.maxDrainMahPerHour,
            0,
          );

      const expectedDrainWhPerDay = useWh
        ? selected.reduce(
            (sum, row) =>
              sum +
              row.hoursPerDay *
                row.expectedDrainWhPerHour!,
            0,
          )
        : undefined;
      const minDrainWhPerDay = useWh
        ? selected.reduce(
            (sum, row) =>
              sum +
              row.hoursPerDay *
                row.minDrainWhPerHour!,
            0,
          )
        : undefined;
      const maxDrainWhPerDay = useWh
        ? selected.reduce(
            (sum, row) =>
              sum +
              row.hoursPerDay *
                row.maxDrainWhPerHour!,
            0,
          )
        : undefined;

      const confidence =
        selected.reduce(
          (sum, row) => sum + row.confidence * row.hoursPerDay,
          0,
        ) / activeHoursPerDay;

      const availableEnergy =
        useWh
          ? packEnergyWh!
          : capacity;

      const expectedProfileRepeats =
        availableEnergy /
        Math.max(
          useWh
            ? expectedDrainWhPerDay!
            : expectedDrainMahPerDay!,
          Number.EPSILON,
        );
      const minProfileRepeats =
        availableEnergy /
        Math.max(
          useWh
            ? maxDrainWhPerDay!
            : maxDrainMahPerDay!,
          Number.EPSILON,
        );
      const maxProfileRepeats =
        availableEnergy /
        Math.max(
          useWh
            ? minDrainWhPerDay!
            : minDrainMahPerDay!,
          Number.EPSILON,
        );

      mixedUse = {
        interpretation: 'active-use-only',
        energyBasis: useWh ? 'wh' : 'mah',
        activeHoursPerDay,
        ...(expectedDrainMahPerDay !== undefined
          ? {
              expectedDrainMahPerDay,
              minDrainMahPerDay,
              maxDrainMahPerDay,
            }
          : {}),
        ...(expectedDrainWhPerDay !== undefined
          ? {
              expectedDrainWhPerDay,
              minDrainWhPerDay,
              maxDrainWhPerDay,
            }
          : {}),
        expectedActiveUseHoursPerCharge:
          expectedProfileRepeats *
          activeHoursPerDay,
        minActiveUseHoursPerCharge:
          minProfileRepeats *
          activeHoursPerDay,
        maxActiveUseHoursPerCharge:
          maxProfileRepeats *
          activeHoursPerDay,
        expectedDaysPerCharge:
          expectedProfileRepeats,
        minDaysPerCharge:
          minProfileRepeats,
        maxDaysPerCharge:
          maxProfileRepeats,
        confidence,
        workloads: selected.map((row) => ({
          workload: row.workload,
          hoursPerDay: row.hoursPerDay,
          energyBasis: useWh ? 'wh' as const : 'mah' as const,
          ...(useWh
            ? {
                expectedDrainWhPerHour:
                  row.expectedDrainWhPerHour,
              }
            : {
                expectedDrainMahPerHour:
                  row.expectedDrainMahPerHour,
              }),
        })),
      };
      warnings.push(
        'Mixed-use battery life is an active-use-only estimate. Standby, modem idle, background sync and screen-off drain are not yet modeled, so it must not be interpreted as literal calendar days per charge.',
      );
    }
  }

  let charging: ReturnType<typeof estimateChargingFromCorpus> | undefined;

  if (input.wiredWatts !== undefined) {
    charging = estimateChargingFromCorpus(corpus, {
      batteryMah: capacity,
      ...(packEnergyWh !== undefined
        ? { batteryEnergyWh: packEnergyWh }
        : {}),
      batteryChemistry: input.batteryChemistry,
      wiredChargingWatts: input.wiredWatts,
      wirelessChargingWatts: input.wirelessWatts,
      manufacturer: input.manufacturer,
      socVendor: input.socVendor,
      region: input.region,
      displayDiagonalInches: input.simulation.displays.primary.diagonalInches,
      thicknessMm: input.simulation.dimensions?.thicknessMm,
      weightG: input.simulation.dimensions?.weightG,
      coolingClass: input.coolingClass,
      cellArchitecture: input.cellArchitecture,
      chargingStandard: input.wiredChargingStandard,
    });

    if (charging.status === 'unresolved') {
      warnings.push(
        charging.unresolvedReason ??
          'Charging estimate could not be resolved from the corpus.',
      );
    }
  } else {
    warnings.push(
      'Wired charging power is missing, so charging milestones were not estimated.',
    );
  }

  let wirelessCharging:
    | ReturnType<typeof estimateWirelessChargingFromCorpus>
    | undefined;

  if (input.wirelessWatts !== undefined) {
    wirelessCharging = estimateWirelessChargingFromCorpus(corpus, {
      batteryMah: capacity,
      wirelessChargingWatts: input.wirelessWatts,
      manufacturer: input.manufacturer,
      batteryChemistry: input.batteryChemistry,
      chargingStandard: input.wirelessChargingStandard,
    });

    if (wirelessCharging.status === 'unresolved') {
      warnings.push(
        wirelessCharging.unresolvedReason ??
          'Wireless charging estimate could not be resolved from the corpus.',
      );
    }
  }

  const calendarEndurance = input.standbyPowerW !== undefined && mixedUse && packEnergyWh !== undefined && mixedUse.expectedDrainWhPerDay !== undefined
    ? estimateDailyBatteryBudget({ usableEnergyWh: packEnergyWh, activeHoursPerDay: mixedUse.activeHoursPerDay,
        activeEnergyWhPerDay: mixedUse.expectedDrainWhPerDay, standbyPowerW: input.standbyPowerW })
    : undefined;

  const runtimeResolved = runtimes.filter(
    (runtime) => runtime.status === 'resolved',
  ).length;
  const chargingResolved = charging?.status === 'resolved';
  const wirelessResolved =
    input.wirelessWatts === undefined ||
    wirelessCharging?.status === 'resolved';

  const status =
    runtimeResolved === workloads.length &&
    chargingResolved &&
    wirelessResolved
      ? 'resolved'
      : runtimeResolved > 0 ||
          chargingResolved ||
          wirelessCharging?.status === 'resolved'
        ? 'partial'
        : 'unresolved';

  return {
    version: BATTERY_EXPERIENCE_ENGINE_VERSION,
    status,
    capacityMah: capacity,
    ...(packEnergyWh !== undefined
      ? { energyWh: packEnergyWh }
      : {}),
    runtimes,
    ...(mixedUse ? { mixedUse } : {}),
    ...(calendarEndurance ? { calendarEndurance } : {}),
    ...(charging ? { charging } : {}),
    ...(wirelessCharging ? { wirelessCharging } : {}),
    warnings,
  };
}
