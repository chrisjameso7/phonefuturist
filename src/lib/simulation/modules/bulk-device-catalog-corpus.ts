import bulkJson from '../../../../data/calibration/bulk-device-catalog-2026-10-11-0.1.json';
import type {
  DeviceCorpus,
  DeviceCorpusRecord,
  CorpusMeasurement,
  CorpusSource,
} from './device-corpus';
import type { SocVendor } from './device-variant';

type BulkSource = {
  id: string;
  publisher: string;
  url: string;
  protocol?: string;
  protocolVersion?: string;
  accessedDate?: string;
};

type BulkMeasurement = {
  metric: string;
  value: number;
  unit: string;
  workload:
    | 'web_browsing'
    | 'video_playback'
    | 'gaming'
    | 'charging'
    | 'thermal'
    | 'benchmark'
    | 'camera'
    | 'display';
  sourceId: string;
  evidenceKind:
    | 'official'
    | 'measured'
    | 'reported'
    | 'inferred';
  notes?: string[];
};

type BulkDevice = {
  id: string;
  manufacturer: string;
  family?: string;
  model: string;
  region?: string;
  releaseDate?: string;
  sourceIds: string[];
  battery?: {
    capacityMah?: number;
    typicalCapacityMah?: number;
    ratedCapacityMah?: number;
    typicalEnergyWh?: number;
    ratedEnergyWh?: number;
    nominalVoltageV?: number;
    chemistry?: string;
  };
  soc?: {
    vendor?: SocVendor;
    name?: string;
  };
  display?: {
    diagonalInches?: number;
    resolutionWidthPx?: number;
    resolutionHeightPx?: number;
    refreshRateHz?: number;
    panelTechnology?: string;
  };
  dimensions?: {
    widthMm?: number;
    heightMm?: number;
    thicknessMm?: number;
    weightG?: number;
  };
  charging?: {
    advertisedWiredWatts?: number;
    referenceWiredWatts?: number;
    advertisedWirelessWatts?: number;
    cellArchitecture?:
      | 'single-cell'
      | 'dual-cell'
      | 'unknown';
  };
  cameras?: Array<{
    role: string;
    sensorName?: string;
    sensorFormatDenominator?: number;
    resolutionMp?: number;
    apertureFNumber?: number;
    equivalentFocalLengthMm?: number;
  }>;
  measurements?: BulkMeasurement[];
  notes?: string[];
};

type BulkCatalog = {
  version: string;
  sources: BulkSource[];
  devices: BulkDevice[];
};

export function buildBulkDeviceCatalogCorpus(): DeviceCorpus {
  const raw =
    bulkJson as unknown as BulkCatalog;

  const sources: CorpusSource[] =
    raw.sources.map((source) => ({
      ...source,
    }));

  const devices: DeviceCorpusRecord[] =
    raw.devices.map((row) => ({
      variant: {
        id: row.id,
        identity: {
          manufacturer:
            row.manufacturer,
          family:
            row.family ?? row.model,
          modelName: row.model,
          ...(row.region
            ? { region: row.region }
            : {}),
        },
        ...(row.battery
          ? {
              battery: {
                ...row.battery,
              },
            }
          : {}),
        ...(row.soc?.vendor &&
        row.soc?.name
          ? {
              soc: {
                vendor:
                  row.soc.vendor,
                name: row.soc.name,
              },
            }
          : {}),
        ...(row.notes
          ? { notes: row.notes }
          : {}),
      },
      ...(row.releaseDate
        ? {
            releaseDate:
              row.releaseDate,
          }
        : {}),
      ...(row.display
        ? { display: row.display }
        : {}),
      ...(row.dimensions
        ? {
            dimensions:
              row.dimensions,
          }
        : {}),
      ...(row.charging
        ? {
            charging:
              row.charging,
          }
        : {}),
      ...(row.cameras
        ? { cameras: row.cameras }
        : {}),
      sourceIds: row.sourceIds,
    }));

  const measurements: CorpusMeasurement[] =
    raw.devices.flatMap((row) =>
      (row.measurements ?? []).map(
        (measurement, index) => ({
          id:
            `${row.id}-bulk-${index}-${measurement.metric}`,
          deviceVariantId: row.id,
          workload:
            measurement.workload,
          metric:
            measurement.metric,
          value:
            measurement.value,
          unit:
            measurement.unit,
          sourceId:
            measurement.sourceId,
          evidenceKind:
            measurement.evidenceKind,
          ...(measurement.notes
            ? {
                notes:
                  measurement.notes,
              }
            : {}),
        }),
      ),
    );

  return {
    version: raw.version,
    sources,
    devices,
    measurements,
  };
}
