import { buildCalibrationRegistry } from './calibration-registry';
import { suggestDeviceComparisons } from './device-comparison-suggestions';

/** Uses the same evidence registry as simulation results; missing entries stay unverified. */
export function suggestLiveDeviceComparisons(concept: string) {
  return suggestDeviceComparisons(buildCalibrationRegistry(),concept);
}
