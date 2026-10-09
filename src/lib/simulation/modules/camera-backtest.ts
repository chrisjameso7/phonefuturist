import type { DeviceCorpus } from './device-corpus';
import {
  calibrateCameraOutcome,
  type CameraOutcomeDomain,
} from './camera-calibration';

export const CAMERA_BACKTEST_VERSION =
  'camera-backtest-0.1.0';

export interface CameraBacktestRow {
  deviceVariantId: string;
  actualScore: number;
  predictedScore: number;
  absoluteError: number;
  referenceCount: number;
}

export interface CameraBacktestSummary {
  version: string;
  domain: CameraOutcomeDomain;
  metric: string;
  evaluatedDevices: number;
  skippedDevices: number;
  maeScore?: number;
  p90AbsoluteError?: number;
  health: 'healthy' | 'borderline' | 'poor' | 'insufficient';
  rows: CameraBacktestRow[];
}

function percentile(values: number[], fraction: number) {
  if (!values.length) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil(sorted.length * fraction) - 1),
  );
  return sorted[index];
}

export function backtestCameraOutcome(
  corpus: DeviceCorpus,
  options: {
    domain: CameraOutcomeDomain;
    metric: string;
    cameraRole?: string;
  },
): CameraBacktestSummary {
  const role = options.cameraRole ?? 'wide';
  const candidates = corpus.measurements.filter(
    (measurement) =>
      measurement.workload === 'camera' &&
      measurement.metric === options.metric &&
      measurement.cameraRole?.toLowerCase() ===
        role.toLowerCase() &&
      Number.isFinite(measurement.value),
  );

  const rows: CameraBacktestRow[] = [];
  let skippedDevices = 0;

  for (const measurement of candidates) {
    const device = corpus.devices.find(
      (row) =>
        row.variant.id === measurement.deviceVariantId,
    );
    const camera = device?.cameras?.find(
      (row) =>
        row.role.toLowerCase() === role.toLowerCase(),
    );

    if (!device || !camera) {
      skippedDevices += 1;
      continue;
    }

    const holdout: DeviceCorpus = {
      version: `${corpus.version}-holdout-${measurement.deviceVariantId}`,
      sources: corpus.sources,
      devices: corpus.devices.filter(
        (row) =>
          row.variant.id !== measurement.deviceVariantId,
      ),
      measurements: corpus.measurements.filter(
        (row) =>
          row.deviceVariantId !== measurement.deviceVariantId,
      ),
    };

    const result = calibrateCameraOutcome(
      holdout,
      {
        type: role as 'wide' | 'ultrawide' | 'telephoto' | 'periscope' | 'front' | 'other',
        sensorFormatDenominator:
          camera.sensorFormatDenominator,
        resolutionMp: camera.resolutionMp,
        apertureFNumber: camera.apertureFNumber,
        equivalentFocalLengthMm:
          camera.equivalentFocalLengthMm,
        manufacturer:
          device.variant.identity.manufacturer,
      },
      options.domain,
    );

    if (
      result.status !== 'resolved' ||
      result.expected?.value === undefined
    ) {
      skippedDevices += 1;
      continue;
    }

    rows.push({
      deviceVariantId: measurement.deviceVariantId,
      actualScore: measurement.value,
      predictedScore: result.expected.value,
      absoluteError: Math.abs(
        result.expected.value - measurement.value,
      ),
      referenceCount: result.references.length,
    });
  }

  const errors = rows.map((row) => row.absoluteError);
  const maeScore = rows.length
    ? errors.reduce((sum, value) => sum + value, 0) /
      rows.length
    : undefined;
  const p90AbsoluteError = percentile(errors, 0.9);

  const health: CameraBacktestSummary['health'] =
    rows.length < 4 ||
    maeScore === undefined ||
    p90AbsoluteError === undefined
      ? 'insufficient'
      : maeScore <= 6 && p90AbsoluteError <= 10
        ? 'healthy'
        : maeScore <= 10 && p90AbsoluteError <= 16
          ? 'borderline'
          : 'poor';

  return {
    version: CAMERA_BACKTEST_VERSION,
    domain: options.domain,
    metric: options.metric,
    evaluatedDevices: rows.length,
    skippedDevices,
    maeScore,
    p90AbsoluteError,
    health,
    rows,
  };
}


export function backtestCameraSharpnessTiming(
  corpus: DeviceCorpus,
): CameraBacktestSummary {
  return backtestCameraOutcome(corpus, {
    domain: 'sharpness_timing',
    metric: 'sharpness_timing_score',
    cameraRole: 'wide',
  });
}

export function backtestCameraVideoStabilization(
  corpus: DeviceCorpus,
): CameraBacktestSummary {
  return backtestCameraOutcome(corpus, {
    domain: 'video_stabilization',
    metric: 'video_stabilization_score',
    cameraRole: 'wide',
  });
}
