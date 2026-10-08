import devicesJson from '../../../data/calibration/battery/devices.json';
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

interface CalibrationDevice {
  id: string;
  manufacturer: string;
  model: string;
  battery: {
    rated_energy_wh?: number | null;
    typical_energy_wh?: number | null;
  };
}

interface RuntimeMeasurement {
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

function energyForDevice(device: CalibrationDevice): number | undefined {
  if (positive(device.battery.rated_energy_wh)) return device.battery.rated_energy_wh;
  if (positive(device.battery.typical_energy_wh)) return device.battery.typical_energy_wh;
  return undefined;
}

function inputEnergy(input: SimulationInput): number | undefined {
  const cells = input.battery?.cells ?? [];
  if (
    !cells.length ||
    !cells.every(
      (cell) =>
        positive(cell.capacityMah) &&
        positive(cell.nominalVoltageV),
    )
  ) return undefined;

  return cells.reduce(
    (sum, cell) =>
      sum + (cell.capacityMah! * cell.nominalVoltageV!) / 1000,
    0,
  );
}

const devices = (devicesJson as unknown as { devices: CalibrationDevice[] }).devices;
const measurements = (runtimeJson as unknown as { measurements: RuntimeMeasurement[] }).measurements;
const deviceById = new Map(devices.map((device) => [device.id, device]));

export const WORKLOAD_POWER_REFERENCES = measurements.flatMap((measurement) => {
  const device = deviceById.get(measurement.device_id);
  if (!device || !positive(measurement.runtime_seconds)) return [];

  const energyWh = energyForDevice(device);
  if (!energyWh) return [];

  const runtimeHours = measurement.runtime_seconds / 3600;
  return [{
    workload: measurement.workload,
    deviceId: device.id,
    manufacturer: device.manufacturer,
    model: device.model,
    energyWh,
    runtimeHours,
    powerW: energyWh / runtimeHours,
    sourceUrl: measurement.source_url,
  }];
});

function matchReference(
  input: SimulationInput,
  workload: SupportedActiveWorkload,
) {
  const energyWh = inputEnergy(input);
  const name = input.name?.trim().toLowerCase();
  if (!energyWh || !name) return undefined;

  const ENERGY_TOLERANCE = 0.16;

  return WORKLOAD_POWER_REFERENCES.find((reference) => {
    if (reference.workload !== workload) return false;
    const fullName =
      `${reference.manufacturer} ${reference.model}`.toLowerCase();
    const sameName =
      name === reference.model.toLowerCase() ||
      name === fullName;
    const closeEnergy =
      Math.abs(reference.energyWh - energyWh) / reference.energyWh <=
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
      minW: matched.powerW,
      maxW: matched.powerW,
      referenceCount: 1,
      basis: 'matched-reference',
      reference: {
        deviceId: matched.deviceId,
        manufacturer: matched.manufacturer,
        model: matched.model,
        runtimeHours: matched.runtimeHours,
        powerW: matched.powerW,
      },
    };
  }

  const power = refs.map((reference) => reference.powerW).sort((a, b) => a - b);

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
  const energyWh = inputEnergy(input);

  if (!energyWh) {
    return {
      version: WORKLOAD_RUNTIME_VERSION,
      status: 'unresolved',
      unresolved: {
        code: 'MISSING_ENERGY',
        message:
          'Battery capacity and nominal voltage are required to calculate active-use runtime.',
        missing: ['battery.capacityMah', 'battery.nominalVoltageV'],
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
    min: energyWh / maxPower,
    max: energyWh / minPower,
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
