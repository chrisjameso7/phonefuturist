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
  note: string;
}

const DOMAINS: CameraOutcomeDomain[] = [
  'low_light_exposure',
  'shutter_lag',
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
    note:
      'Optical geometry is calculated directly from supplied camera specifications. Observed camera outcomes are estimated only when comparable measured evidence exists; unsupported outcomes remain unresolved.',
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
