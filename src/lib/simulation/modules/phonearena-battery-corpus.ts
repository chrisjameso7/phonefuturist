import rawJson from '../../../../data/calibration/phonearena-battery-2025-2026.json';
import type {
  CorpusMeasurement,
  CorpusSource,
  DeviceCorpus,
  DeviceCorpusRecord,
} from './device-corpus';

type RawRow = {
  id: string;
  manufacturer: string;
  model: string;
  releaseDate?: string;
  batteryMah?: number;
  sourceIds: string[];
  measurements?: Record<string, number>;
  notes?: string[];
};

type RawFile = {
  version: string;
  sources: CorpusSource[];
  devices: RawRow[];
};

function workload(metric: string) {
  const value = metric.toLowerCase();
  if (value.includes('browsing')) {
    return 'web_browsing' as const;
  }
  if (value.includes('video')) {
    return 'video_playback' as const;
  }
  if (value.includes('gaming')) {
    return 'gaming' as const;
  }
  return 'benchmark' as const;
}

export function buildPhoneArenaBatteryCorpus(): DeviceCorpus {
  const raw =
    rawJson as unknown as RawFile;

  const devices:
    DeviceCorpusRecord[] =
    raw.devices.map((row) => ({
      variant: {
        id: row.id,
        identity: {
          manufacturer:
            row.manufacturer,
          family: row.model,
          modelName: row.model,
        },
        ...(row.batteryMah
          ? {
              battery: {
                capacityMah:
                  row.batteryMah,
              },
            }
          : {}),
        ...(row.notes
          ? {
              notes: row.notes,
            }
          : {}),
      },
      ...(row.releaseDate
        ? {
            releaseDate:
              row.releaseDate,
          }
        : {}),
      sourceIds: row.sourceIds,
    }));

  const measurements:
    CorpusMeasurement[] = [];

  for (const row of raw.devices) {
    for (
      const [metric, value] of
      Object.entries(
        row.measurements ?? {},
      )
    ) {
      measurements.push({
        id:
          `${row.id}-${metric}`,
        deviceVariantId: row.id,
        workload: workload(metric),
        metric,
        value,
        unit: 'hours',
        sourceId:
          row.sourceIds[0],
        evidenceKind: 'measured',
        displayBrightnessNits: 200,
        componentScope:
          'whole-device',
        notes: [
          'PhoneArena battery protocol: fixed 200-nit brightness, Wi-Fi, new device / 100% battery health, latest firmware at test time.',
        ],
      });
    }
  }

  return {
    version: raw.version,
    sources: raw.sources,
    devices,
    measurements,
  };
}
