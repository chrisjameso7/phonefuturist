import { buildCalibrationRegistry } from './modules/calibration-registry';
import {
  simulateBatteryExperience,
  type BatteryExperienceInput,
} from './modules/battery-experience-engine';

export const LIVE_BATTERY_EXPERIENCE_VERSION = 'live-battery-experience-0.1.0';

export function simulateLiveBatteryExperience(
  input: BatteryExperienceInput,
) {
  const corpus = buildCalibrationRegistry();

  return {
    ...simulateBatteryExperience(corpus, input),
    simulatorVersion: LIVE_BATTERY_EXPERIENCE_VERSION,
    corpusVersion: corpus.version,
  };
}
