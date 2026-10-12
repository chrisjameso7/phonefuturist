import cohortJson from '../../../../data/calibration/charging-mode-cohort-2026-10-08-0.1.json';
import type {
  CorpusMeasurement,
  CorpusSource,
  DeviceCorpus,
  DeviceCorpusRecord,
} from './device-corpus';

type RawFile = typeof cohortJson;

export function buildChargingModeCorpus(): DeviceCorpus {
  const raw = cohortJson as RawFile;

  const sources: CorpusSource[] = raw.sources.map((source) => ({
    ...source,
  }));

  const devices: DeviceCorpusRecord[] = raw.devices.map((row) => ({
    variant: {
      id: row.id,
      identity: {
        manufacturer: row.manufacturer,
        family: row.model,
        modelName: row.model,
        region: row.region,
      },
      battery: {
        capacityMah: row.batteryMah,
        ...(row.batteryChemistry
          ? { chemistry: row.batteryChemistry }
          : {}),
      },
    },
    charging: {
      advertisedWiredWatts: row.advertisedWiredWatts,
      ...(row.advertisedWirelessWatts !== undefined
        ? { advertisedWirelessWatts: row.advertisedWirelessWatts }
        : {}),
      ...(row.cellArchitecture === 'single-cell' ||
      row.cellArchitecture === 'dual-cell' ||
      row.cellArchitecture === 'unknown'
        ? { cellArchitecture: row.cellArchitecture }
        : {}),
    },
    sourceIds: row.sourceIds,
  }));

  const measurements: CorpusMeasurement[] = raw.measurements.map(
    (measurement) => ({
      id: measurement.id,
      deviceVariantId: measurement.deviceVariantId,
      workload: 'charging',
      metric: measurement.metric,
      value: measurement.value,
      unit: measurement.unit,
      sourceId: measurement.sourceId,
      evidenceKind: 'measured',
      testChargerWatts: measurement.testChargerWatts,
      chargingStandard: measurement.chargingStandard,
      measuredPeakWatts: measurement.measuredPeakWatts,
    }),
  );

  return {
    version: raw.version,
    sources,
    devices,
    measurements,
  };
}
