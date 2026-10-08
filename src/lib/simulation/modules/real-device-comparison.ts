import type { DeviceCorpus, DeviceCorpusRecord } from './device-corpus';
import type { SimulationSnapshot } from '../simulation-snapshot';
import { findDeviceByName } from './device-lookup';

export const REAL_DEVICE_COMPARISON_VERSION = 'real-device-comparison-0.1.0';

export interface ComparisonMetric {
  key: string;
  label: string;
  unit?: string;
  simulated?: number | string;
  released?: number | string;
  delta?: number;
  deltaPercent?: number;
}

export interface RealDeviceComparison {
  version: string;
  status: 'resolved' | 'ambiguous' | 'unresolved';
  simulatedId: string;
  releasedQuery: string;
  releasedVariant?: DeviceCorpusRecord;
  alternatives?: Array<{
    id: string;
    label: string;
    region?: string;
  }>;
  metrics: ComparisonMetric[];
  note?: string;
}

function pctDelta(a: number, b: number) {
  if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) return undefined;
  return ((a - b) / b) * 100;
}

function addNumericMetric(
  metrics: ComparisonMetric[],
  key: string,
  label: string,
  simulated: number | undefined,
  released: number | undefined,
  unit?: string,
) {
  if (simulated === undefined && released === undefined) return;

  metrics.push({
    key,
    label,
    ...(unit ? { unit } : {}),
    ...(simulated !== undefined ? { simulated } : {}),
    ...(released !== undefined ? { released } : {}),
    ...(simulated !== undefined && released !== undefined
      ? {
          delta: simulated - released,
          deltaPercent: pctDelta(simulated, released),
        }
      : {}),
  });
}

function simulatedBatteryMah(snapshot: SimulationSnapshot) {
  const cells = snapshot.input.battery?.cells ?? [];
  if (!cells.length) return undefined;
  if (cells.some((cell) => !Number.isFinite(cell.capacityMah))) return undefined;
  return cells.reduce((sum, cell) => sum + (cell.capacityMah ?? 0), 0);
}

export function compareSimulationToReleasedDevice(
  corpus: DeviceCorpus,
  snapshot: SimulationSnapshot,
  releasedQuery: string,
): RealDeviceComparison {
  const matches = findDeviceByName(corpus, releasedQuery, 8);

  if (!matches.length) {
    return {
      version: REAL_DEVICE_COMPARISON_VERSION,
      status: 'unresolved',
      simulatedId: snapshot.id,
      releasedQuery,
      metrics: [],
      note: 'No released device in the calibration corpus matched this query.',
    };
  }

  const top = matches[0];
  const tied = matches.filter(
    (match) => Math.abs(match.score - top.score) < 0.001,
  );

  if (tied.length > 1) {
    return {
      version: REAL_DEVICE_COMPARISON_VERSION,
      status: 'ambiguous',
      simulatedId: snapshot.id,
      releasedQuery,
      metrics: [],
      alternatives: tied.map(({ device }) => ({
        id: device.variant.id,
        label: `${device.variant.identity.manufacturer} ${device.variant.identity.modelName}`,
        ...(device.variant.identity.region
          ? { region: device.variant.identity.region }
          : {}),
      })),
      note:
        'Multiple released variants matched equally. Choose the exact regional or hardware variant before comparing.',
    };
  }

  const released = top.device;
  const metrics: ComparisonMetric[] = [];

  const releasedBattery =
    released.variant.battery?.capacityMah ??
    released.variant.battery?.typicalCapacityMah;

  addNumericMetric(
    metrics,
    'battery.capacityMah',
    'Battery capacity',
    simulatedBatteryMah(snapshot),
    releasedBattery,
    'mAh',
  );

  addNumericMetric(
    metrics,
    'dimensions.thicknessMm',
    'Thickness',
    snapshot.input.dimensions?.thicknessMm,
    released.dimensions?.thicknessMm,
    'mm',
  );

  addNumericMetric(
    metrics,
    'dimensions.weightG',
    'Weight',
    snapshot.input.dimensions?.weightG,
    released.dimensions?.weightG,
    'g',
  );

  addNumericMetric(
    metrics,
    'display.diagonalInches',
    'Display size',
    snapshot.input.displays.primary.diagonalInches,
    released.display?.diagonalInches,
    'in',
  );

  addNumericMetric(
    metrics,
    'display.refreshRateHz',
    'Refresh rate',
    undefined,
    released.display?.refreshRateHz,
    'Hz',
  );

  const simulatedMain = snapshot.input.cameras?.find(
    (camera) => camera.type === 'wide',
  );
  const releasedMain = released.cameras?.find(
    (camera) => camera.role.toLowerCase() === 'wide',
  );

  addNumericMetric(
    metrics,
    'camera.main.aperture',
    'Main camera aperture',
    simulatedMain?.apertureFNumber,
    releasedMain?.apertureFNumber,
    'f/',
  );

  addNumericMetric(
    metrics,
    'camera.main.resolutionMp',
    'Main camera resolution',
    simulatedMain?.resolutionMp,
    releasedMain?.resolutionMp,
    'MP',
  );

  if (snapshot.result.battery?.totalEnergyWh !== undefined) {
    addNumericMetric(
      metrics,
      'battery.energyWh',
      'Battery energy',
      snapshot.result.battery.totalEnergyWh,
      undefined,
      'Wh',
    );
  }

  return {
    version: REAL_DEVICE_COMPARISON_VERSION,
    status: 'resolved',
    simulatedId: snapshot.id,
    releasedQuery,
    releasedVariant: released,
    metrics,
    note:
      'Released-device values are pulled from the canonical calibration corpus. Missing fields stay missing rather than being guessed.',
  };
}
