import currentJson from '../../../../data/calibration/current-generation-2026-10-08-0.1.json';
import expansionJson from '../../../../data/calibration/current-generation-expansion-2026-10-08-0.2.json';
import type {
  DeviceCorpus,
  DeviceCorpusRecord,
  CorpusMeasurement,
  CorpusSource,
} from './device-corpus';
import type { SocVendor } from './device-variant';

type RawSource = {
  id: string;
  publisher: string;
  url: string;
  protocol?: string;
};

type RawDevice = {
  id: string;
  manufacturer: string;
  model: string;
  releaseDate?: string;
  region?: string;
  batteryMah?: number;
  batteryChemistry?: string;
  socVendor?: SocVendor;
  socName?: string;
  sourceIds?: string[];
  measurements?: Record<string, number>;
  charging?: Record<string, number>;
  display?: {
    diagonalInches?: number;
    resolutionWidthPx?: number;
    resolutionHeightPx?: number;
    refreshRateHz?: number;
    maximumGamingRefreshRateHz?: number;
    panelTechnology?: string;
  };
  notes?: string[];
};

type RawFile = {
  version: string;
  source?: RawSource;
  sources?: RawSource[];
  devices: RawDevice[];
};

function metricToWorkload(metric: string) {
  const value = metric.toLowerCase();
  if (value.includes('browsing')) return 'web_browsing' as const;
  if (value.includes('video') || value.includes('youtube')) {
    return 'video_playback' as const;
  }
  if (value.includes('gaming')) return 'gaming' as const;
  if (value.includes('charge') || value.includes('wired')) return 'charging' as const;
  return 'benchmark' as const;
}

function unitFor(metric: string) {
  const value = metric.toLowerCase();
  if (value.includes('hours')) return 'hours';
  if (value.includes('minutes')) return 'minutes';
  if (value.includes('percent')) return 'percent';
  if (value.includes('watts')) return 'W';
  return 'value';
}

function normalizeRawFile(raw: RawFile): DeviceCorpus {
  const sourceList = raw.sources ?? (raw.source ? [raw.source] : []);
  const sources: CorpusSource[] = sourceList.map((source) => ({ ...source }));
  const fallbackSourceId = sources[0]?.id;

  const devices: DeviceCorpusRecord[] = raw.devices.map((row) => ({
    variant: {
      id: row.id,
      identity: {
        manufacturer: row.manufacturer,
        family: row.model,
        modelName: row.model,
        ...(row.region ? { region: row.region } : {}),
      },
      ...(row.batteryMah || row.batteryChemistry
        ? {
            battery: {
              ...(row.batteryMah ? { capacityMah: row.batteryMah } : {}),
              ...(row.batteryChemistry
                ? { chemistry: row.batteryChemistry }
                : {}),
            },
          }
        : {}),
      ...(row.socVendor && row.socName
        ? {
            soc: {
              vendor: row.socVendor,
              name: row.socName,
            },
          }
        : {}),
      ...(row.notes ? { notes: row.notes } : {}),
    },
    releaseDate: row.releaseDate,
    ...(row.display
      ? {
          display: {
            ...(row.display.diagonalInches !== undefined
              ? { diagonalInches: row.display.diagonalInches }
              : {}),
            ...(row.display.resolutionWidthPx !== undefined
              ? { resolutionWidthPx: row.display.resolutionWidthPx }
              : {}),
            ...(row.display.resolutionHeightPx !== undefined
              ? { resolutionHeightPx: row.display.resolutionHeightPx }
              : {}),
            ...(row.display.refreshRateHz !== undefined
              ? { refreshRateHz: row.display.refreshRateHz }
              : {}),
            ...(row.display.panelTechnology
              ? { panelTechnology: row.display.panelTechnology }
              : {}),
          },
        }
      : {}),
    ...(row.charging
      ? {
          charging: {
            ...(row.charging.advertisedWiredWatts !== undefined
              ? { advertisedWiredWatts: row.charging.advertisedWiredWatts }
              : {}),
            ...(row.charging.advertisedWirelessWatts !== undefined
              ? { advertisedWirelessWatts: row.charging.advertisedWirelessWatts }
              : {}),
          },
        }
      : {}),
    sourceIds: row.sourceIds ?? (fallbackSourceId ? [fallbackSourceId] : []),
  }));

  const measurements: CorpusMeasurement[] = [];

  for (const row of raw.devices) {
    const sourceId = row.sourceIds?.[0] ?? fallbackSourceId;
    if (!sourceId) continue;

    for (const [metric, value] of Object.entries(row.measurements ?? {})) {
      measurements.push({
        id: `${row.id}-${metric}`,
        deviceVariantId: row.id,
        workload: metricToWorkload(metric),
        metric,
        value,
        unit: unitFor(metric),
        sourceId,
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
        unit: unitFor(metric),
        sourceId,
        evidenceKind: metric.toLowerCase().includes('advertised')
          ? 'official'
          : 'measured',
      });
    }
  }

  return {
    version: raw.version,
    sources,
    devices,
    measurements,
  };
}

export function buildCurrentGenerationCorpus(): DeviceCorpus {
  const a = normalizeRawFile(currentJson as unknown as RawFile);
  const b = normalizeRawFile(expansionJson as unknown as RawFile);

  return {
    version: 'current-generation-merged-0.1.0',
    sources: [...a.sources, ...b.sources],
    devices: [...a.devices, ...b.devices],
    measurements: [...a.measurements, ...b.measurements],
  };
}
