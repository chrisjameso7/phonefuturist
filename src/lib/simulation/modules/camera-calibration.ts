import type { DeviceCorpus } from './device-corpus';
import {
  findComparableCameras,
  type CameraComparableQuery,
} from './camera-comparables';

export const CAMERA_CALIBRATION_VERSION = 'camera-calibration-0.1.0';

export type CameraOutcomeDomain =
  | 'low_light_exposure'
  | 'shutter_lag'
  | 'stabilization_crop'
  | 'video_thermal_limit'
  | 'resolved_detail';

export interface CameraOutcomeReference {
  deviceVariantId: string;
  score: number;
  metric: string;
  value: number;
  unit: string;
  reasons: string[];
}

export interface CameraOutcomeCalibration {
  version: string;
  status: 'resolved' | 'unresolved';
  domain: CameraOutcomeDomain;
  references: CameraOutcomeReference[];
  expected?: {
    value: number;
    unit: string;
    min: number;
    max: number;
    confidence: number;
  };
  unresolvedReason?: string;
}

function metricMatches(domain: CameraOutcomeDomain, metric: string) {
  const m = metric.toLowerCase();
  switch (domain) {
    case 'low_light_exposure':
      return m.includes('low_light') || m.includes('low light') || m.includes('night exposure');
    case 'shutter_lag':
      return m.includes('shutter') && m.includes('lag');
    case 'stabilization_crop':
      return (m.includes('stabilization') || m.includes('eis')) && m.includes('crop');
    case 'video_thermal_limit':
      return m.includes('video') && (m.includes('thermal') || m.includes('recording limit'));
    case 'resolved_detail':
      return m.includes('detail') || m.includes('mtf') || m.includes('resolution score');
  }
}

function weightedMean(values: Array<{ value: number; weight: number }>) {
  const total = values.reduce((sum, item) => sum + item.weight, 0);
  return values.reduce((sum, item) => sum + item.value * item.weight, 0) /
    Math.max(total, Number.EPSILON);
}

export function calibrateCameraOutcome(
  corpus: DeviceCorpus,
  query: CameraComparableQuery,
  domain: CameraOutcomeDomain,
): CameraOutcomeCalibration {
  const comparables = findComparableCameras(corpus, {
    ...query,
    limit: Math.max(query.limit ?? 8, 8),
  });

  const references = comparables.flatMap((match) =>
    corpus.measurements
      .filter(
        (measurement) =>
          measurement.deviceVariantId === match.deviceVariantId &&
          measurement.workload === 'camera' &&
          metricMatches(domain, measurement.metric) &&
          Number.isFinite(measurement.value),
      )
      .map((measurement) => ({
        deviceVariantId: match.deviceVariantId,
        score: match.score,
        metric: measurement.metric,
        value: measurement.value,
        unit: measurement.unit,
        reasons: match.reasons,
      })),
  );

  if (!references.length) {
    return {
      version: CAMERA_CALIBRATION_VERSION,
      status: 'unresolved',
      domain,
      references: [],
      unresolvedReason:
        'No comparable cameras with matching measured outcome evidence were found.',
    };
  }

  const unit = references[0].unit;
  const compatible = references.filter((reference) => reference.unit === unit);
  const weighted = compatible.map((reference) => ({
    value: reference.value,
    weight: Math.max(reference.score, 0.05) ** 2,
  }));
  const values = compatible.map((reference) => reference.value);
  const confidence =
    compatible.reduce((sum, reference) => sum + reference.score, 0) /
    compatible.length;

  return {
    version: CAMERA_CALIBRATION_VERSION,
    status: 'resolved',
    domain,
    references: compatible.slice(0, query.limit ?? 5),
    expected: {
      value: weightedMean(weighted),
      unit,
      min: Math.min(...values),
      max: Math.max(...values),
      confidence: Math.min(1, Math.max(0, confidence)),
    },
  };
}
