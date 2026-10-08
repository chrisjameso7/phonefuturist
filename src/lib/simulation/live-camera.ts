import { buildCalibrationRegistry } from './modules/calibration-registry';
import { calculateCamera, type CameraInput } from './modules/camera';
import {
  findComparableCameras,
  type CameraComparableQuery,
} from './modules/camera-comparables';

export const LIVE_CAMERA_SIMULATOR_VERSION = 'live-camera-simulator-0.1.0';

export interface LiveCameraResult {
  version: string;
  corpusVersion: string;
  calculated: ReturnType<typeof calculateCamera>;
  comparables: ReturnType<typeof findComparableCameras>;
}

export function simulateLiveCamera(
  input: CameraInput & Pick<CameraComparableQuery, 'manufacturer' | 'limit'>,
): LiveCameraResult {
  const corpus = buildCalibrationRegistry();
  return {
    version: LIVE_CAMERA_SIMULATOR_VERSION,
    corpusVersion: corpus.version,
    calculated: calculateCamera(input),
    comparables: findComparableCameras(corpus, input),
  };
}
