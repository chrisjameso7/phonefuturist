import { buildCalibrationRegistry } from './modules/calibration-registry';
import {
  calculateCamera,
  type CameraInput,
  type CameraWarning,
  type CalculatedCamera,
} from './modules/camera';
import {
  calibrateCameraOutcome,
  type CameraOutcomeDomain,
} from './modules/camera-calibration';
import type { DeviceCorpus } from './modules/device-corpus';

export const LIVE_CAMERA_EXPERIENCE_VERSION =
  'live-camera-experience-0.1.0';

export interface LiveCameraExperienceInput
  extends CameraInput {
  manufacturer?: string;
}

export interface LiveCameraOutcome {
  domain: CameraOutcomeDomain;
  status: 'resolved' | 'unresolved';
  value?: number;
  unit?: string;
  min?: number;
  max?: number;
  confidence?: number;
  averageSimilarity?: number;
  averageCoverage?: number;
  protocolKey?: string;
  sourceRecordCount?: number;
  publisherCount?: number;
  referenceCount: number;
  neighborIds: string[];
  unresolvedReason?: string;
}

export interface LiveCameraExperienceResult {
  version: string;
  status: 'resolved';
  physics: CalculatedCamera;
  warnings: CameraWarning[];
  outcomes: LiveCameraOutcome[];
  sensitivity: Array<{
    scenario:
      | 'larger-sensor'
      | 'faster-aperture'
      | 'higher-resolution'
      | 'longer-exposure'
      | 'pixel-binning';
    label: string;
    physics: CalculatedCamera;
    deltaSensorAreaPercent?: number;
    deltaTotalLightPercent?: number;
    deltaPerPixelLightPercent?: number;
    deltaExposureLightPercent?: number;
    deltaBinnedOutputPixelLightPercent?: number;
    deltaSubjectMotionBlurPercent?: number;
    deltaCameraShakeBlurPercent?: number;
    deltaRollingShutterCameraSkewPercent?: number;
    deltaRollingShutterSubjectSkewPercent?: number;
    deltaPixelPitchPercent?: number;
    deltaEquivalentAperturePercent?: number;
    sensorFootprintPressurePercent?: number;
  }>;
  note: string;
}


function percentDelta(
  next: number | undefined,
  baseline: number | undefined,
) {
  if (
    next === undefined ||
    baseline === undefined ||
    !Number.isFinite(next) ||
    !Number.isFinite(baseline) ||
    baseline === 0
  ) {
    return undefined;
  }

  return ((next / baseline) - 1) * 100;
}

function cameraSensitivityScenarios(
  input: LiveCameraExperienceInput,
  baseline: CalculatedCamera,
): LiveCameraExperienceResult['sensitivity'] {
  const scenarios: Array<{
    scenario: LiveCameraExperienceResult['sensitivity'][number]['scenario'];
    label: string;
    input: LiveCameraExperienceInput;
  }> = [];

  if (
    input.sensorFormatDenominator !== undefined &&
    Number.isFinite(input.sensorFormatDenominator) &&
    input.sensorFormatDenominator > 0
  ) {
    scenarios.push({
      scenario: 'larger-sensor',
      label: 'Sensor linear size +15%',
      input: {
        ...input,
        sensorFormatDenominator:
          input.sensorFormatDenominator / 1.15,
      },
    });
  }

  if (
    input.apertureFNumber !== undefined &&
    Number.isFinite(input.apertureFNumber) &&
    input.apertureFNumber > 0
  ) {
    scenarios.push({
      scenario: 'faster-aperture',
      label: 'F-number -15%',
      input: {
        ...input,
        apertureFNumber: input.apertureFNumber * 0.85,
      },
    });
  }

  if (
    input.resolutionMp !== undefined &&
    Number.isFinite(input.resolutionMp) &&
    input.resolutionMp > 0
  ) {
    scenarios.push({
      scenario: 'higher-resolution',
      label: 'Resolution x2',
      input: {
        ...input,
        resolutionMp: input.resolutionMp * 2,
      },
    });

    scenarios.push({
      scenario: 'pixel-binning',
      label: '2×2 pixel binning',
      input: {
        ...input,
        binningLinearFactor: 2,
      },
    });
  }

  if (
    input.exposureTimeSeconds !== undefined &&
    Number.isFinite(input.exposureTimeSeconds) &&
    input.exposureTimeSeconds > 0
  ) {
    scenarios.push({
      scenario: 'longer-exposure',
      label: 'Exposure time ×4',
      input: {
        ...input,
        exposureTimeSeconds:
          input.exposureTimeSeconds * 4,
      },
    });
  }

  return scenarios.map((entry) => {
    const physics = calculateCamera(entry.input).result;
    const baselineArea = baseline.approximateSensorAreaMm2;
    const nextArea = physics.approximateSensorAreaMm2;

    return {
      scenario: entry.scenario,
      label: entry.label,
      physics,
      deltaSensorAreaPercent:
        percentDelta(nextArea, baselineArea),
      deltaTotalLightPercent:
        percentDelta(
          physics.geometricLightCaptureIndex,
          baseline.geometricLightCaptureIndex,
        ),
      deltaPerPixelLightPercent:
        percentDelta(
          physics.perPixelLightCaptureIndex,
          baseline.perPixelLightCaptureIndex,
        ),
      deltaExposureLightPercent:
        percentDelta(
          physics.exposureLightCaptureIndex,
          baseline.exposureLightCaptureIndex,
        ),
      deltaBinnedOutputPixelLightPercent:
        percentDelta(
          physics.binnedOutputPixelExposureIndex,
          baseline.binnedOutputPixelExposureIndex ??
            baseline.nativePixelExposureIndex,
        ),
      deltaSubjectMotionBlurPercent:
        percentDelta(
          physics.subjectMotionBlurPixels,
          baseline.subjectMotionBlurPixels,
        ),
      deltaCameraShakeBlurPercent:
        percentDelta(
          physics.cameraShakeBlurPixelsAfterOis,
          baseline.cameraShakeBlurPixelsAfterOis,
        ),
      deltaRollingShutterCameraSkewPercent:
        percentDelta(
          physics.rollingShutterCameraSkewPixels,
          baseline.rollingShutterCameraSkewPixels,
        ),
      deltaRollingShutterSubjectSkewPercent:
        percentDelta(
          physics.rollingShutterSubjectSkewPixels,
          baseline.rollingShutterSubjectSkewPixels,
        ),
      deltaPixelPitchPercent:
        percentDelta(
          physics.approximatePixelPitchMicrons,
          baseline.approximatePixelPitchMicrons,
        ),
      deltaEquivalentAperturePercent:
        percentDelta(
          physics.equivalentApertureFNumber,
          baseline.equivalentApertureFNumber,
        ),
      sensorFootprintPressurePercent:
        percentDelta(
          nextArea !== undefined ? Math.sqrt(nextArea) : undefined,
          baselineArea !== undefined ? Math.sqrt(baselineArea) : undefined,
        ),
    };
  });
}

const DOMAINS: CameraOutcomeDomain[] = [
  'low_light_exposure',
  'shutter_lag',
  'sharpness_timing',
  'video_stabilization',
  'photo_texture',
  'stabilization_crop',
  'video_thermal_limit',
  'resolved_detail',
];

export function simulateCameraExperience(
  corpus: DeviceCorpus,
  input: LiveCameraExperienceInput,
): LiveCameraExperienceResult {
  const calculation = calculateCamera(input);

  const outcomes = DOMAINS.map((domain) => {
    const calibrated = calibrateCameraOutcome(
      corpus,
      {
        type: input.type,
        sensorFormatDenominator:
          input.sensorFormatDenominator,
        resolutionMp: input.resolutionMp,
        apertureFNumber: input.apertureFNumber,
        equivalentFocalLengthMm:
          input.equivalentFocalLengthMm,
        manufacturer: input.manufacturer,
      },
      domain,
    );

    if (
      calibrated.status !== 'resolved' ||
      !calibrated.expected
    ) {
      return {
        domain,
        status: 'unresolved' as const,
        referenceCount: 0,
        neighborIds: [],
        unresolvedReason:
          calibrated.unresolvedReason,
      };
    }

    return {
      domain,
      status: 'resolved' as const,
      value: calibrated.expected.value,
      unit: calibrated.expected.unit,
      min: calibrated.expected.min,
      max: calibrated.expected.max,
      confidence: calibrated.expected.confidence,
      averageSimilarity:
        calibrated.expected.averageSimilarity,
      averageCoverage:
        calibrated.expected.averageCoverage,
      protocolKey: calibrated.expected.protocolKey,
      sourceRecordCount:
        calibrated.expected.sourceRecordCount,
      publisherCount:
        calibrated.expected.publisherCount,
      referenceCount: calibrated.references.length,
      neighborIds: [
        ...new Set(
          calibrated.references.map(
            (reference) => reference.deviceVariantId,
          ),
        ),
      ],
    };
  });

  return {
    version: LIVE_CAMERA_EXPERIENCE_VERSION,
    status: 'resolved',
    physics: calculation.result,
    warnings: calculation.warnings,
    outcomes,
    sensitivity: cameraSensitivityScenarios(
      input,
      calculation.result,
    ),
    note:
      'Optical geometry, exposure-aware light, subject-motion blur, camera-shake blur and rolling-shutter skew are calculated directly from supplied camera specifications. ISO/gain is not treated as photon capture. OIS only reduces camera-shake blur, never subject motion. Sensor readout time is separate from exposure time. Observed camera outcomes are estimated only when comparable measured evidence exists; unsupported outcomes remain unresolved.',
  };
}

export function simulateLiveCameraExperience(
  input: LiveCameraExperienceInput,
): LiveCameraExperienceResult {
  return simulateCameraExperience(
    buildCalibrationRegistry(),
    input,
  );
}
