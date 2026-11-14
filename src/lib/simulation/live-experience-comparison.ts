import { buildCalibrationRegistry } from './modules/calibration-registry';
import {
  compareSimulationExperienceToReleasedDevice,
} from './modules/experience-comparison';
import type { SimulationSnapshot } from './simulation-snapshot';

export const LIVE_EXPERIENCE_COMPARISON_VERSION =
  'live-experience-comparison-0.1.0';

export function compareLiveSimulationExperience(
  snapshot: SimulationSnapshot,
  releasedQuery: string,
) {
  const corpus = buildCalibrationRegistry();

  return {
    ...compareSimulationExperienceToReleasedDevice(
      corpus,
      snapshot,
      releasedQuery,
    ),
    simulatorVersion: LIVE_EXPERIENCE_COMPARISON_VERSION,
    corpusVersion: corpus.version,
  };
}
