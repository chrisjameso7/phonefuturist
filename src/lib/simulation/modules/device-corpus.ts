import type { DeviceVariantRecord } from './device-variant';
import type { SystemEfficiencyWorkload } from './system-efficiency';

export const DEVICE_CORPUS_MODEL_VERSION = 'device-corpus-0.1.0';

export type CorpusEvidenceKind =
  | 'official'
  | 'measured'
  | 'reported'
  | 'inferred';

export interface CorpusSource {
  id: string;
  publisher: string;
  url: string;
  protocol?: string;
  protocolVersion?: string;
  accessedDate?: string;
}

export interface CorpusMeasurement {
  id: string;
  deviceVariantId: string;
  workload: SystemEfficiencyWorkload | 'charging' | 'thermal' | 'benchmark';
  metric: string;
  value: number;
  unit: string;
  sourceId: string;
  evidenceKind: CorpusEvidenceKind;
  softwareBuild?: string;
  ambientTemperatureC?: number;
  displayBrightnessNits?: number;
  refreshRateHz?: number;
  notes?: string[];
}

export interface DeviceCorpusRecord {
  variant: DeviceVariantRecord;
  releaseDate?: string;
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
  cameras?: Array<{
    role: string;
    sensorName?: string;
    sensorFormatDenominator?: number;
    resolutionMp?: number;
    apertureFNumber?: number;
    equivalentFocalLengthMm?: number;
  }>;
  charging?: {
    advertisedWiredWatts?: number;
    advertisedWirelessWatts?: number;
    cellArchitecture?: 'single-cell' | 'dual-cell' | 'unknown';
  };
  cooling?: {
    class?: 'passive-graphite' | 'vapor-chamber' | 'large-vapor-chamber' | 'active-fan' | 'other';
    vaporChamberAreaMm2?: number;
    fan?: boolean;
  };
  sourceIds?: string[];
}

export interface DeviceCorpus {
  version: string;
  sources: CorpusSource[];
  devices: DeviceCorpusRecord[];
  measurements: CorpusMeasurement[];
}

export interface CorpusValidationIssue {
  code:
    | 'DUPLICATE_VARIANT_ID'
    | 'DUPLICATE_MEASUREMENT_ID'
    | 'MISSING_VARIANT'
    | 'MISSING_SOURCE'
    | 'INVALID_MEASUREMENT'
    | 'INVALID_CAPACITY';
  message: string;
}

export function validateDeviceCorpus(
  corpus: DeviceCorpus,
): CorpusValidationIssue[] {
  const issues: CorpusValidationIssue[] = [];
  const variantIds = new Set<string>();
  const measurementIds = new Set<string>();
  const sourceIds = new Set(corpus.sources.map((source) => source.id));

  for (const device of corpus.devices) {
    const id = device.variant.id;

    if (variantIds.has(id)) {
      issues.push({
        code: 'DUPLICATE_VARIANT_ID',
        message: `Duplicate device variant id: ${id}`,
      });
    }
    variantIds.add(id);

    const capacity =
      device.variant.battery?.capacityMah ??
      device.variant.battery?.typicalCapacityMah;

    if (
      capacity !== undefined &&
      (!Number.isFinite(capacity) || capacity <= 0)
    ) {
      issues.push({
        code: 'INVALID_CAPACITY',
        message: `Invalid battery capacity for variant: ${id}`,
      });
    }

    for (const sourceId of device.sourceIds ?? []) {
      if (!sourceIds.has(sourceId)) {
        issues.push({
          code: 'MISSING_SOURCE',
          message: `Device ${id} references unknown source: ${sourceId}`,
        });
      }
    }
  }

  for (const measurement of corpus.measurements) {
    if (measurementIds.has(measurement.id)) {
      issues.push({
        code: 'DUPLICATE_MEASUREMENT_ID',
        message: `Duplicate measurement id: ${measurement.id}`,
      });
    }
    measurementIds.add(measurement.id);

    if (!variantIds.has(measurement.deviceVariantId)) {
      issues.push({
        code: 'MISSING_VARIANT',
        message: `Measurement ${measurement.id} references unknown variant: ${measurement.deviceVariantId}`,
      });
    }

    if (!sourceIds.has(measurement.sourceId)) {
      issues.push({
        code: 'MISSING_SOURCE',
        message: `Measurement ${measurement.id} references unknown source: ${measurement.sourceId}`,
      });
    }

    if (
      !Number.isFinite(measurement.value) ||
      !measurement.unit.trim() ||
      !measurement.metric.trim()
    ) {
      issues.push({
        code: 'INVALID_MEASUREMENT',
        message: `Measurement ${measurement.id} is invalid.`,
      });
    }
  }

  return issues;
}
