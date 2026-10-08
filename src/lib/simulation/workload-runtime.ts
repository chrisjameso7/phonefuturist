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

  device_id: string;
  workload: SupportedActiveWorkload;
  runtime_seconds: number;
  source_display_value: string;
  source_url: string;
}

export interface WorkloadPowerBand {
  workload: SupportedActiveWorkload;
  minW: number;
  maxW: number;
  referenceCount: number;
  basis: 'matched-reference' | 'reference-population';
  reference?: {
    deviceId: string;
    manufacturer: string;
    model: string;
    runtimeHours: number;
    powerW: number;
  };
}

export interface ActiveUseRuntimeResult {
  version: string;
  status: 'resolved' | 'unresolved';
  unresolved?: {
    code:
      | 'MISSING_ENERGY'
      | 'NO_ACTIVE_HOURS'
      | 'INVALID_HOURS'
      | 'CAMERA_UNCALIBRATED'
      | 'MISSING_WORKLOAD_EVIDENCE';
    message: string;
    missing: string[];
  };
  estimate?: {
    activeHoursPerDay: number;
    averagePowerW: { min: number; max: number };
    runtimeHours: { min: number; max: number };
    equivalentDaysPerCharge: { min: number; max: number };
    workloads: Array<{
      workload: SupportedActiveWorkload;
      hoursPerDay: number;
      share: number;
      powerW: { min: number; max: number };
    }>;
    note: string;
  };
}

function positive(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function inputCapacityMah(input: SimulationInput): number | undefined {
  const cells = input.battery?.cells ?? [];
  if (
    !cells.length ||
    !cells.every((cell) => positive(cell.capacityMah))
  ) return undefined;

  return cells.reduce(
    (sum, cell) => sum + cell.capacityMah!,
    0,
  );
}

export const WORKLOAD_POWER_REFERENCES = measurements.flatMap((measurement) => {
  if (
    !positive(measurement.runtime_seconds) ||
    !positive(measurement.capacity_mah)
  ) return [];

  const runtimeHours = measurement.runtime_seconds / 3600;
  const drainMahPerHour = measurement.capacity_mah / runtimeHours;

  return [{
    workload: measurement.workload,
    deviceId: measurement.device_id,
    manufacturer: measurement.manufacturer,
    model: measurement.model,
    capacityMah: measurement.capacity_mah,
    runtimeHours,
    drainMahPerHour,
    sourceUrl: measurement.source_url,
  }];
});

function matchReference(
  input: SimulationInput,
  workload: SupportedActiveWorkload,
) {
  const capacityMah = inputCapacityMah(input);
  const name = input.name?.trim().toLowerCase();
  if (!capacityMah || !name) return undefined;

  const ENERGY_TOLERANCE = 0.16;

  return WORKLOAD_POWER_REFERENCES.find((reference) => {
    if (reference.workload !== workload) return false;
    const fullName =
      `${reference.manufacturer} ${reference.model}`.toLowerCase();
    const sameName =
      name === reference.model.toLowerCase() ||
      name === fullName;
    const closeEnergy =
      Math.abs(reference.capacityMah - capacityMah) / reference.capacityMah <=
      ENERGY_TOLERANCE;
    return sameName && closeEnergy;
  });
}

export function resolveWorkloadPowerBand(
  input: SimulationInput,
  workload: SupportedActiveWorkload,
): WorkloadPowerBand | undefined {
  const refs = WORKLOAD_POWER_REFERENCES.filter(
    (reference) => reference.workload === workload,
  );

  if (!refs.length) return undefined;

  const matched = matchReference(input, workload);

  if (matched) {
    return {
      workload,
      minW: matched.drainMahPerHour,
      maxW: matched.drainMahPerHour,
      referenceCount: 1,
      basis: 'matched-reference',
      reference: {
        deviceId: matched.deviceId,
        manufacturer: matched.manufacturer,
        model: matched.model,
        runtimeHours: matched.runtimeHours,
        powerW: matched.drainMahPerHour,
      },
    };
  }

  const power = refs.map((reference) => reference.drainMahPerHour).sort((a, b) => a - b);

  return {
    workload,
    minW: power[0],
    maxW: power[power.length - 1],
    referenceCount: refs.length,
    basis: 'reference-population',
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
        code: 'MISSING_ENERGY',
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

  const supported: Array<[SupportedActiveWorkload, number]> = [
    ['web_browsing', dailyHours.web_browsing ?? 0],
    ['video_playback', dailyHours.video_playback ?? 0],
    ['gaming', dailyHours.gaming ?? 0],
  ].filter(([, hours]) => hours > 0) as Array<
    [SupportedActiveWorkload, number]
  >;

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

  const resolved = supported.map(([workload, hours]) => {
    const band = resolveWorkloadPowerBand(input, workload);
    return { workload, hours, band };
  });

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

  let minPower = 0;
  let maxPower = 0;

  const workloads = resolved.map(({ workload, hours, band }) => {
    const share = hours / activeHoursPerDay;
    minPower += band!.minW * share;
    maxPower += band!.maxW * share;

    return {
      workload,
      hoursPerDay: hours,
      share,
      powerW: {
        min: band!.minW,
        max: band!.maxW,
      },
    };
  });

  const runtimeHours = {
    min: capacityMah / maxPower,
    max: capacityMah / minPower,
  };

  return {
    version: WORKLOAD_RUNTIME_VERSION,
    status: 'resolved',
    estimate: {
      activeHoursPerDay,
      averagePowerW: { min: minPower, max: maxPower },
      runtimeHours,
      equivalentDaysPerCharge: {
        min: runtimeHours.min / activeHoursPerDay,
        max: runtimeHours.max / activeHoursPerDay,
      },
      workloads,
      note:
        'Active-use equivalent only. Idle/standby drain is not included, so this is not a full 24-hour real-world battery-life prediction.',
    },
  };
}
