import { buildCalibrationRegistry } from './calibration-registry';
import { suggestDeviceComparisons, suggestCompetingDevices } from './device-comparison-suggestions';

/** Uses the same evidence registry as simulation results; missing entries stay unverified. */
export function suggestLiveDeviceComparisons(concept: string) {
  return suggestDeviceComparisons(buildCalibrationRegistry(),concept);
}

export function suggestLiveCompetingDevices(options: {manufacturer?: string; batteryMah?: number; displayInches?: number; socName?: string; limit?: number}) {
  return suggestCompetingDevices(buildCalibrationRegistry(), options);
}
