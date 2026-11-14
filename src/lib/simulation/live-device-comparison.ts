import { buildCalibrationRegistry } from './modules/calibration-registry';
import {
  compareSimulationToReleasedDevice,
} from './modules/real-device-comparison';
import type { SimulationSnapshot } from './simulation-snapshot';

export const LIVE_DEVICE_COMPARISON_VERSION = 'live-device-comparison-0.1.0';

export function compareLiveSimulationToDevice(
  snapshot: SimulationSnapshot,
  releasedQuery: string,
) {
  const corpus = buildCalibrationRegistry();

  return {
    ...compareSimulationToReleasedDevice(corpus, snapshot, releasedQuery),
    simulatorVersion: LIVE_DEVICE_COMPARISON_VERSION,
    corpusVersion: corpus.version,
  };
}
