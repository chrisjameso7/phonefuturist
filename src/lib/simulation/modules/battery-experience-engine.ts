import type { SimulationInput } from '../types';
import type { DeviceCorpus } from './device-corpus';
import { resolveCorpusRuntimeBand } from './corpus-runtime';
import { estimateChargingFromCorpus } from './charging-corpus-estimator';
import { estimateWirelessChargingFromCorpus } from './wireless-charging-estimator';

export const BATTERY_EXPERIENCE_ENGINE_VERSION = 'battery-experience-engine-0.1.0';

export interface BatteryExperienceInput {
  simulation: SimulationInput;
  manufacturer?: string;
  socVendor?: string;
  socName?: string;
  region?: string;
  batteryChemistry?: string;
  cellArchitecture?: 'single-cell' | 'dual-cell' | 'unknown';
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
  expectedDrainMahPerHour?: number;
  confidence?: number;
  averageSimilarity?: number;
  averageCoverage?: number;
  referenceCount?: number;
  neighborIds?: string[];
  evidenceScope?:
    | 'same-soc-family'
    | 'same-soc-vendor'
    | 'protocol-cohort';
  sameSocFamilyReferences?: number;
  sameSocVendorReferences?: number;
  note?: string;
}

export interface MixedUseBatteryEstimate {
  activeHoursPerDay: number;
  expectedDrainMahPerDay: number;
  minDrainMahPerDay: number;
  maxDrainMahPerDay: number;
  expectedDaysPerCharge: number;
  minDaysPerCharge: number;
  maxDaysPerCharge: number;
  confidence: number;
  workloads: Array<{
    workload: 'web_browsing' | 'video_playback' | 'gaming';
    hoursPerDay: number;
    expectedDrainMahPerHour: number;
  }>;
}

export interface BatteryExperienceResult {
  version: string;
  status: 'resolved' | 'partial' | 'unresolved';
  capacityMah?: number;
  runtimes: BatteryRuntimeExperience[];
  mixedUse?: MixedUseBatteryEstimate;
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

  const runtimes: BatteryRuntimeExperience[] = workloads.map((workload) => {
    const band = resolveCorpusRuntimeBand(
      corpus,
      input.simulation,
      workload,
      {},
      {
        manufacturer: input.manufacturer,
        socVendor: input.socVendor,
        socName: input.socName,
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

    const runtime = runtimeFromDrain(
      capacity,
      band.estimate.minMahPerHour,
      band.estimate.expectedMahPerHour,
      band.estimate.maxMahPerHour,
    );

    return {
      workload,
      status: 'resolved',
      ...runtime,
      expectedDrainMahPerHour: band.estimate.expectedMahPerHour,
      confidence: band.estimate.confidence,
      averageSimilarity:
        band.estimate.averageSimilarity,
      averageCoverage:
        band.estimate.averageCoverage,
      referenceCount: band.estimate.referenceCount,
      neighborIds: band.estimate.neighborIds,
      evidenceScope:
        band.estimate.evidenceScope,
      sameSocFamilyReferences:
        band.estimate.sameSocFamilyReferences,
      sameSocVendorReferences:
        band.estimate.sameSocVendorReferences,
      note: band.estimate.note,
    };
  });

  let mixedUse: MixedUseBatteryEstimate | undefined;

  if (input.dailyUseHours) {
    const selected = runtimes.flatMap((runtime) => {
      const hours = input.dailyUseHours?.[runtime.workload] ?? 0;

      if (
        hours <= 0 ||
        runtime.status !== 'resolved' ||
        runtime.expectedDrainMahPerHour === undefined
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
        socVendor: input.socVendor,
        socName: input.socName,
        batteryChemistry:
          input.batteryChemistry,
        coolingClass: input.coolingClass,
      },
      );

      if (sourceBand.status !== 'resolved' || !sourceBand.estimate) {
        return [];
      }

      return [{
        workload: runtime.workload,
        hoursPerDay: hours,
        expectedDrainMahPerHour:
          sourceBand.estimate.expectedMahPerHour,
        minDrainMahPerHour: sourceBand.estimate.minMahPerHour,
        maxDrainMahPerHour: sourceBand.estimate.maxMahPerHour,
        confidence: sourceBand.estimate.confidence,
      }];
    });

    const activeHoursPerDay = selected.reduce(
      (sum, row) => sum + row.hoursPerDay,
      0,
    );

    if (activeHoursPerDay > 0 && selected.length > 0) {
      const expectedDrainMahPerDay = selected.reduce(
        (sum, row) =>
          sum + row.hoursPerDay * row.expectedDrainMahPerHour,
        0,
      );
      const minDrainMahPerDay = selected.reduce(
        (sum, row) =>
          sum + row.hoursPerDay * row.minDrainMahPerHour,
        0,
      );
      const maxDrainMahPerDay = selected.reduce(
        (sum, row) =>
          sum + row.hoursPerDay * row.maxDrainMahPerHour,
        0,
      );

      const confidence =
        selected.reduce(
          (sum, row) => sum + row.confidence * row.hoursPerDay,
          0,
        ) / activeHoursPerDay;

      mixedUse = {
        activeHoursPerDay,
        expectedDrainMahPerDay,
        minDrainMahPerDay,
        maxDrainMahPerDay,
        expectedDaysPerCharge:
          capacity / Math.max(expectedDrainMahPerDay, Number.EPSILON),
        minDaysPerCharge:
          capacity / Math.max(maxDrainMahPerDay, Number.EPSILON),
        maxDaysPerCharge:
          capacity / Math.max(minDrainMahPerDay, Number.EPSILON),
        confidence,
        workloads: selected.map((row) => ({
          workload: row.workload,
          hoursPerDay: row.hoursPerDay,
          expectedDrainMahPerHour: row.expectedDrainMahPerHour,
        })),
      };
    }
  }

  let charging: ReturnType<typeof estimateChargingFromCorpus> | undefined;

  if (input.wiredWatts !== undefined) {
    charging = estimateChargingFromCorpus(corpus, {
      batteryMah: capacity,
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
    runtimes,
    ...(mixedUse ? { mixedUse } : {}),
    ...(charging ? { charging } : {}),
    ...(wirelessCharging ? { wirelessCharging } : {}),
    warnings,
  };
}
