import type { SimulationInput } from '../types';
import type { DeviceCorpus } from './device-corpus';
import { resolveCorpusRuntimeBand } from './corpus-runtime';
import { estimateChargingFromCorpus } from './charging-corpus-estimator';

export const BATTERY_EXPERIENCE_ENGINE_VERSION = 'battery-experience-engine-0.1.0';

export interface BatteryExperienceInput {
  simulation: SimulationInput;
  manufacturer?: string;
  socVendor?: string;
  region?: string;
  batteryChemistry?: string;
  cellArchitecture?: 'single-cell' | 'dual-cell' | 'unknown';
  wiredWatts?: number;
  wirelessWatts?: number;
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
  referenceCount?: number;
  neighborIds?: string[];
  note?: string;
}

export interface BatteryExperienceResult {
  version: string;
  status: 'resolved' | 'partial' | 'unresolved';
  capacityMah?: number;
  runtimes: BatteryRuntimeExperience[];
  charging?: ReturnType<typeof estimateChargingFromCorpus>;
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
      referenceCount: band.estimate.referenceCount,
      neighborIds: band.estimate.neighborIds,
      note: band.estimate.note,
    };
  });

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
      refreshRateHz: input.simulation.displays.primary.refreshRateHz,
      thicknessMm: input.simulation.dimensions?.thicknessMm,
      weightG: input.simulation.dimensions?.weightG,
      coolingClass: input.coolingClass,
      cellArchitecture: input.cellArchitecture,
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

  const runtimeResolved = runtimes.filter(
    (runtime) => runtime.status === 'resolved',
  ).length;
  const chargingResolved = charging?.status === 'resolved';

  const status =
    runtimeResolved === workloads.length && chargingResolved
      ? 'resolved'
      : runtimeResolved > 0 || chargingResolved
        ? 'partial'
        : 'unresolved';

  return {
    version: BATTERY_EXPERIENCE_ENGINE_VERSION,
    status,
    capacityMah: capacity,
    runtimes,
    ...(charging ? { charging } : {}),
    warnings,
  };
}
