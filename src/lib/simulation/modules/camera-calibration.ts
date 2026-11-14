import type { DeviceCorpus } from './device-corpus';
import {
  findComparableCameras,
  type CameraComparableQuery,
  type CameraComparableProfile,
} from './camera-comparables';

export const CAMERA_CALIBRATION_VERSION = 'camera-calibration-0.2.0';

export type CameraOutcomeDomain =
  | 'low_light_exposure'
  | 'shutter_lag'
  | 'sharpness_timing'
  | 'video_stabilization'
  | 'photo_texture'
  | 'stabilization_crop'
  | 'video_thermal_limit'
  | 'resolved_detail';

export interface CameraOutcomeReference {
  deviceVariantId: string;
  cameraRole?: string;
  cameraSensorName?: string;
  cameraCaptureMode?: string;
  protocolKey: string;
  sourceId: string;
  publisher: string;
  score: number;
  similarityScore: number;
  coverageScore: number;
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
    averageSimilarity: number;
    averageCoverage: number;
    protocolKey: string;
    sourceRecordCount: number;
    publisherCount: number;
  };
  unresolvedReason?: string;
}



function comparableProfileForDomain(
  domain: CameraOutcomeDomain,
): CameraComparableProfile {
  switch (domain) {
    case 'photo_texture':
    case 'resolved_detail':
      return 'photo-detail';
    case 'sharpness_timing':
    case 'shutter_lag':
      return 'capture-timing';
    case 'video_stabilization':
    case 'stabilization_crop':
      return 'video-stabilization';
    case 'low_light_exposure':
    case 'video_thermal_limit':
      return 'generic';
  }
}

function captureModeMatches(
  domain: CameraOutcomeDomain,
  captureMode: string | undefined,
) {
  if (!captureMode) return true;

  const mode = captureMode.trim().toLowerCase();

  switch (domain) {
    case 'sharpness_timing':
    case 'photo_texture':
    case 'low_light_exposure':
    case 'resolved_detail':
      return mode.startsWith('photo');
    case 'video_stabilization':
    case 'stabilization_crop':
    case 'video_thermal_limit':
      return mode.startsWith('video');
  }
}

function metricMatches(domain: CameraOutcomeDomain, metric: string) {
  const m = metric.toLowerCase();
  switch (domain) {
    case 'low_light_exposure':
      return m.includes('low_light') || m.includes('low light') || m.includes('night exposure');
    case 'shutter_lag':
      return m.includes('shutter') && m.includes('lag');
    case 'sharpness_timing':
      return m.includes('sharpness') && m.includes('timing');
    case 'video_stabilization':
      return m.includes('video') &&
        m.includes('stabilization') &&
        m.includes('score');
    case 'photo_texture':
      return m.includes('photo') &&
        m.includes('texture') &&
        m.includes('score');
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
  const eligibleVariantIds =
    new Set(
      corpus.measurements
        .filter(
          (measurement) =>
            measurement.workload ===
              'camera' &&
            measurement.evidenceKind ===
              'measured' &&
            captureModeMatches(
              domain,
              measurement.cameraCaptureMode,
            ) &&
            metricMatches(
              domain,
              measurement.metric,
            ) &&
            Number.isFinite(
              measurement.value,
            ),
        )
        .map(
          (measurement) =>
            measurement.deviceVariantId,
        ),
    );

  const evidenceCorpus: DeviceCorpus = {
    ...corpus,
    devices:
      corpus.devices.filter(
        (device) =>
          eligibleVariantIds.has(
            device.variant.id,
          ),
      ),
  };

  const comparables = findComparableCameras(evidenceCorpus, {
    ...query,
    profile: comparableProfileForDomain(domain),
    limit: Math.max(query.limit ?? 8, 8),
  });

  const sourceById = new Map(
    corpus.sources.map((source) => [source.id, source]),
  );

  const references = comparables.flatMap((match) =>
    corpus.measurements
      .filter(
        (measurement) =>
          measurement.deviceVariantId === match.deviceVariantId &&
          measurement.workload === 'camera' &&
          measurement.evidenceKind === 'measured' &&
          (!measurement.cameraRole ||
            measurement.cameraRole.trim().toLowerCase() ===
              match.role.trim().toLowerCase()) &&
          captureModeMatches(
            domain,
            measurement.cameraCaptureMode,
          ) &&
          metricMatches(domain, measurement.metric) &&
          Number.isFinite(measurement.value),
      )
      .map((measurement) => ({
        deviceVariantId: match.deviceVariantId,
        cameraRole: measurement.cameraRole,
        cameraSensorName: measurement.cameraSensorName,
        cameraCaptureMode: measurement.cameraCaptureMode,
        protocolKey: (() => {
          const source = sourceById.get(measurement.sourceId);
          return [
            source?.publisher ?? measurement.sourceId,
            source?.protocolVersion ?? source?.protocol ?? 'unspecified',
          ]
            .join('::')
            .trim()
            .toLowerCase();
        })(),
        sourceId: measurement.sourceId,
        publisher:
          sourceById.get(measurement.sourceId)
            ?.publisher ??
          measurement.sourceId,
        score: match.score,
        similarityScore: match.similarityScore,
        coverageScore: match.coverageScore,
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

  const groups = new Map<string, CameraOutcomeReference[]>();

  for (const reference of references) {
    const key = `${reference.unit.trim().toLowerCase()}::${reference.protocolKey}`;
    const current = groups.get(key) ?? [];
    current.push(reference);
    groups.set(key, current);
  }

  const compatible = [...groups.values()]
    .sort((a, b) => {
      const weightA = a.reduce(
        (sum, reference) =>
          sum + Math.max(reference.score, 0.05) ** 2,
        0,
      );
      const weightB = b.reduce(
        (sum, reference) =>
          sum + Math.max(reference.score, 0.05) ** 2,
        0,
      );
      return weightB - weightA;
    })[0];

  if (!compatible?.length) {
    return {
      version: CAMERA_CALIBRATION_VERSION,
      status: 'unresolved',
      domain,
      references: [],
      unresolvedReason:
        'No protocol-compatible camera outcome evidence was found.',
    };
  }

  const unit = compatible[0].unit;
  const weighted = compatible.map((reference) => ({
    value: reference.value,
    weight: Math.max(reference.score, 0.05) ** 2,
  }));
  const values = compatible.map((reference) => reference.value);
  const confidence =
    compatible.reduce((sum, reference) => sum + reference.score, 0) /
    compatible.length;
  const averageSimilarity =
    compatible.reduce(
      (sum, reference) => sum + reference.similarityScore,
      0,
    ) / compatible.length;
  const averageCoverage =
    compatible.reduce(
      (sum, reference) => sum + reference.coverageScore,
      0,
    ) / compatible.length;

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
      averageSimilarity: Math.min(
        1,
        Math.max(0, averageSimilarity),
      ),
      averageCoverage: Math.min(
        1,
        Math.max(0, averageCoverage),
      ),
      protocolKey: compatible[0].protocolKey,
      sourceRecordCount:
        new Set(
          compatible.map(
            (reference) => reference.sourceId,
          ),
        ).size,
      publisherCount:
        new Set(
          compatible.map(
            (reference) => reference.publisher,
          ),
        ).size,
    },
  };
}
