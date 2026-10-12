import { buildCalibrationRegistry } from './modules/calibration-registry';
import type { CameraComparableQuery } from './modules/camera-comparables';
import {
  calibrateCameraOutcome,
  type CameraOutcomeDomain,
} from './modules/camera-calibration';

export const LIVE_CAMERA_CALIBRATION_VERSION = 'live-camera-calibration-0.1.0';

export function calibrateLiveCameraOutcome(
  input: CameraComparableQuery,
  domain: CameraOutcomeDomain,
) {
  const corpus = buildCalibrationRegistry();

  return {
    ...calibrateCameraOutcome(corpus, input, domain),
    simulatorVersion: LIVE_CAMERA_CALIBRATION_VERSION,
    corpusVersion: corpus.version,
  };
}
