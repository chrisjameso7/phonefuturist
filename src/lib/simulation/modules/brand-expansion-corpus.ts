import cohortJson from '../../../data/calibration/brand-expansion-cohort-0.1.json';
import type {
  DeviceCorpus,
  DeviceCorpusRecord,
  CorpusMeasurement,
  CorpusSource,
} from './device-corpus';

type ExpansionRow = {
  id: string;
  manufacturer: string;
  model: string;
  region?: string;
  batteryMah?: number;
  sourceIds: string[];
  measurements?: Record<string, number>;
  charging?: Record<string, number>;
  notes?: string[];
};

type ExpansionFile = {
  version: string;
  sources: Array<{
    id: string;
    publisher: string;
    url: string;
    protocol?: string;
  }>;
  devices: ExpansionRow[];
};

function metricToWorkload(metric: string) {
  if (metric.toLowerCase().includes('browsing')) return 'web_browsing' as const;
  if (metric.toLowerCase().includes('video')) return 'video_playback' as const;
  if (metric.toLowerCase().includes('gaming')) return 'gaming' as const;
  if (metric.toLowerCase().includes('charge')) return 'charging' as const;
  return 'benchmark' as const;
}

function metricUnit(metric: string) {
  if (metric.toLowerCase().includes('hours')) return 'hours';
  if (metric.toLowerCase().includes('minutes')) return 'minutes';
  if (metric.toLowerCase().includes('percent')) return 'percent';
  if (metric.toLowerCase().includes('watts')) return 'W';
  return 'value';
}

export function buildBrandExpansionCorpus(): DeviceCorpus {
  const sourceFile = cohortJson as unknown as ExpansionFile;
  const sources: CorpusSource[] = sourceFile.sources.map((source) => ({
    ...source,
  }));

  const devices: DeviceCorpusRecord[] = sourceFile.devices.map((row) => ({
    variant: {
      id: row.id,
      identity: {
        manufacturer: row.manufacturer,
        family: row.model,
        modelName: row.model,
        ...(row.region ? { region: row.region } : {}),
      },
      ...(row.batteryMah
        ? { battery: { capacityMah: row.batteryMah } }
        : {}),
      ...(row.notes ? { notes: row.notes } : {}),
    },
    sourceIds: row.sourceIds,
  }));

  const measurements: CorpusMeasurement[] = [];

  for (const row of sourceFile.devices) {
    for (const [metric, value] of Object.entries(row.measurements ?? {})) {
      measurements.push({
        id: `${row.id}-${metric}`,
        deviceVariantId: row.id,
        workload: metricToWorkload(metric),
        metric,
        value,
        unit: metricUnit(metric),
        sourceId: row.sourceIds[0],
        evidenceKind: 'measured',
      });
    }

    for (const [metric, value] of Object.entries(row.charging ?? {})) {
      measurements.push({
        id: `${row.id}-${metric}`,
        deviceVariantId: row.id,
        workload: 'charging',
        metric,
        value,
        unit: metricUnit(metric),
        sourceId: row.sourceIds[0],
        evidenceKind:
          metric.toLowerCase().includes('advertised')
            ? 'official'
            : 'measured',
      });
    }
  }

  return {
    version: sourceFile.version,
    sources,
    devices,
    measurements,
  };
}
