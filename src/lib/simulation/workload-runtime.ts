import runtimeJson from '../../../data/calibration/battery/workload-runtimes.json';
import type { SimulationInput } from './types';

export const WORKLOAD_RUNTIME_VERSION = '0.5.1';

export type SupportedActiveWorkload =
  | 'web_browsing'
  | 'video_playback'
  | 'gaming';

export type UserActiveWorkload =
  | SupportedActiveWorkload
  | 'camera_use';

export type DailyWorkloadHours = Partial<Record<UserActiveWorkload, number>>;

interface RuntimeMeasurement {
  device_id: string;
  manufacturer: string;
  model: string;
  release_date: string;
  capacity_mah: number;
  workload: SupportedActiveWorkload;
  runtime_seconds: number;
  source_display_value: string;
  source_url: string;
}

export interface WorkloadDrainBand {
  workload: SupportedActiveWorkload;
  minMahPerHour: number;
  maxMahPerHour: number;
  referenceCount: number;
  basis: 'matched-reference' | 'reference-population';
  reference?: {
    deviceId: string;
    manufacturer: string;
    model: string;
    runtimeHours: number;
    drainMahPerHour: number;
  };
}

export interface ActiveUseRuntimeResult {
  version: string;
  status: 'resolved' | 'unresolved';
  unresolved?: {
    code:
      | 'MISSING_CAPACITY'
      | 'NO_ACTIVE_HOURS'
      | 'INVALID_HOURS'
      | 'CAMERA_UNCALIBRATED'
      | 'MISSING_WORKLOAD_EVIDENCE';
    message: string;
    missing: string[];
  };
  estimate?: {
    activeHoursPerDay: number;
    averageDrainMahPerHour: { min: number; max: number };
    runtimeHours: { min: number; max: number };
    equivalentDaysPerCharge: { min: number; max: number };
    workloads: Array<{
      workload: SupportedActiveWorkload;
      hoursPerDay: number;
      share: number;
      drainMahPerHour: { min: number; max: number };
    }>;
    note: string;
  };
}

function positive(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function inputCapacityMah(input: SimulationInput): number | undefined {
  const cells = input.battery?.cells ?? [];
  if (!cells.length || !cells.every((cell) => positive(cell.capacityMah))) {
    return undefined;
  }
  return cells.reduce((sum, cell) => sum + cell.capacityMah!, 0);
}

const measurements = (
  runtimeJson as unknown as { measurements: RuntimeMeasurement[] }
).measurements;

export const WORKLOAD_DRAIN_REFERENCES = measurements.flatMap((measurement) => {
  if (
    !positive(measurement.runtime_seconds) ||
    !positive(measurement.capacity_mah)
  ) return [];

  const runtimeHours = measurement.runtime_seconds / 3600;
  return [{
    workload: measurement.workload,
    deviceId: measurement.device_id,
    manufacturer: measurement.manufacturer,
    model: measurement.model,
    releaseDate: measurement.release_date,
    capacityMah: measurement.capacity_mah,
    runtimeHours,
    drainMahPerHour: measurement.capacity_mah / runtimeHours,
    sourceUrl: measurement.source_url,
  }];
});

// Compatibility export retained for existing callers/tests while v0.5.1
// transitions from watt-based naming to capacity-normalized drain.
export const WORKLOAD_POWER_REFERENCES = WORKLOAD_DRAIN_REFERENCES;

function matchReference(
  input: SimulationInput,
  workload: SupportedActiveWorkload,
) {
  const capacityMah = inputCapacityMah(input);
  const name = input.name?.trim().toLowerCase();
  if (!capacityMah || !name) return undefined;

  const CAPACITY_TOLERANCE = 0.16;

  return WORKLOAD_DRAIN_REFERENCES.find((reference) => {
    if (reference.workload !== workload) return false;
    const fullName =
      `${reference.manufacturer} ${reference.model}`.toLowerCase();
    const sameName =
      name === reference.model.toLowerCase() ||
      name === fullName;
    const closeCapacity =
      Math.abs(reference.capacityMah - capacityMah) /
        reference.capacityMah <=
      CAPACITY_TOLERANCE;
    return sameName && closeCapacity;
  });
}

export function resolveWorkloadDrainBand(
  input: SimulationInput,
  workload: SupportedActiveWorkload,
): WorkloadDrainBand | undefined {
  const refs = WORKLOAD_DRAIN_REFERENCES.filter(
    (reference) => reference.workload === workload,
  );
  if (!refs.length) return undefined;

  const matched = matchReference(input, workload);
  if (matched) {
    return {
      workload,
      minMahPerHour: matched.drainMahPerHour,
      maxMahPerHour: matched.drainMahPerHour,
      referenceCount: 1,
      basis: 'matched-reference',
      reference: {
        deviceId: matched.deviceId,
        manufacturer: matched.manufacturer,
        model: matched.model,
        runtimeHours: matched.runtimeHours,
        drainMahPerHour: matched.drainMahPerHour,
      },
    };
  }

  const drain = refs
    .map((reference) => reference.drainMahPerHour)
    .sort((a, b) => a - b);

  return {
    workload,
    minMahPerHour: drain[0],
    maxMahPerHour: drain[drain.length - 1],
    referenceCount: refs.length,
    basis: 'reference-population',
  };
}

// Compatibility alias for the earlier v0.5.1 integration.
export function resolveWorkloadPowerBand(
  input: SimulationInput,
  workload: SupportedActiveWorkload,
) {
  const band = resolveWorkloadDrainBand(input, workload);
  if (!band) return undefined;
  return {
    workload: band.workload,
    minW: band.minMahPerHour,
    maxW: band.maxMahPerHour,
    referenceCount: band.referenceCount,
    basis: band.basis,
    ...(band.reference
      ? {
          reference: {
            deviceId: band.reference.deviceId,
            manufacturer: band.reference.manufacturer,
            model: band.reference.model,
            runtimeHours: band.reference.runtimeHours,
            powerW: band.reference.drainMahPerHour,
          },
        }
      : {}),
  };
}

export function simulateActiveUseRuntime(
  input: SimulationInput,
  dailyHours: DailyWorkloadHours,
): ActiveUseRuntimeResult {
  const capacityMah = inputCapacityMah(input);

  if (!capacityMah) {
    return {
      version: WORKLOAD_RUNTIME_VERSION,
      status: 'unresolved',
      unresolved: {
        code: 'MISSING_CAPACITY',
        message:
          'Battery capacity is required to calculate active-use runtime.',
        missing: ['battery.capacityMah'],
      },
    };
  }

  const entries = Object.entries(dailyHours) as Array<
    [UserActiveWorkload, number | undefined]
  >;

  for (const [workload, hours] of entries) {
    if (
      hours !== undefined &&
      (!Number.isFinite(hours) || hours < 0 || hours > 24)
    ) {
      return {
        version: WORKLOAD_RUNTIME_VERSION,
        status: 'unresolved',
        unresolved: {
          code: 'INVALID_HOURS',
          message: 'Workload hours must be between 0 and 24.',
          missing: [`hours.${workload}`],
        },
      };
    }
  }

  const cameraHours = dailyHours.camera_use ?? 0;
  if (cameraHours > 0) {
    return {
      version: WORKLOAD_RUNTIME_VERSION,
      status: 'unresolved',
      unresolved: {
        code: 'CAMERA_UNCALIBRATED',
        message:
          'Camera use is not estimated yet because the calibration set has no isolated camera-runtime protocol. Enter 0 camera hours to calculate the supported active-use profile.',
        missing: ['camera workload evidence'],
      },
    };
  }

  const supportedCandidates: Array<
    [SupportedActiveWorkload, number]
  > = [
    ['web_browsing', dailyHours.web_browsing ?? 0],
    ['video_playback', dailyHours.video_playback ?? 0],
    ['gaming', dailyHours.gaming ?? 0],
  ];

  const supported = supportedCandidates.filter(
    ([, hours]) => hours > 0,
  );

  const activeHoursPerDay = supported.reduce(
    (sum, [, hours]) => sum + hours,
    0,
  );

  if (!(activeHoursPerDay > 0)) {
    return {
      version: WORKLOAD_RUNTIME_VERSION,
      status: 'unresolved',
      unresolved: {
        code: 'NO_ACTIVE_HOURS',
        message:
          'Enter at least one hour of web, video or gaming use per day.',
        missing: ['daily workload hours'],
      },
    };
  }

  if (activeHoursPerDay > 24) {
    return {
      version: WORKLOAD_RUNTIME_VERSION,
      status: 'unresolved',
      unresolved: {
        code: 'INVALID_HOURS',
        message:
          'Combined active-use hours cannot exceed 24 hours per day.',
        missing: ['daily workload hours'],
      },
    };
  }

  const resolved = supported.map(([workload, hours]) => ({
    workload,
    hours,
    band: resolveWorkloadDrainBand(input, workload),
  }));

  const missing = resolved
    .filter((entry) => !entry.band)
    .map((entry) => entry.workload);

  if (missing.length) {
    return {
      version: WORKLOAD_RUNTIME_VERSION,
      status: 'unresolved',
      unresolved: {
        code: 'MISSING_WORKLOAD_EVIDENCE',
        message:
          'The selected active-use profile contains a workload without calibration evidence.',
        missing,
      },
    };
  }

  let minDrain = 0;
  let maxDrain = 0;

  const workloads = resolved.map(({ workload, hours, band }) => {
    const share = hours / activeHoursPerDay;
    minDrain += band!.minMahPerHour * share;
    maxDrain += band!.maxMahPerHour * share;

    return {
      workload,
      hoursPerDay: hours,
      share,
      drainMahPerHour: {
        min: band!.minMahPerHour,
        max: band!.maxMahPerHour,
      },
    };
  });

  const runtimeHours = {
    min: capacityMah / maxDrain,
    max: capacityMah / minDrain,
  };

  return {
    version: WORKLOAD_RUNTIME_VERSION,
    status: 'resolved',
    estimate: {
      activeHoursPerDay,
      averageDrainMahPerHour: { min: minDrain, max: maxDrain },
      runtimeHours,
      equivalentDaysPerCharge: {
        min: runtimeHours.min / activeHoursPerDay,
        max: runtimeHours.max / activeHoursPerDay,
      },
      workloads,
      note:
        'Active-use equivalent only. The model is capacity-normalized against 20 recent released phones under one lab protocol. Idle and standby drain are not included, so this is not a full 24-hour real-world battery-life prediction.',
    },
  };
}
