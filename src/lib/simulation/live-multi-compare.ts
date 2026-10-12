import { buildCalibrationRegistry } from './modules/calibration-registry';
import {
  compareSimulationAgainstDevices,
  compareSimulationToPreviousGeneration,
  type ComparisonTarget,
} from './modules/multi-device-comparison';
import { buildComparisonMatrix } from './modules/comparison-matrix';
import type { SimulationSnapshot } from './simulation-snapshot';

export const LIVE_MULTI_COMPARE_VERSION = 'live-multi-compare-0.1.0';

export function compareLiveSimulationAgainstDevices(
  snapshot: SimulationSnapshot,
  targets: ComparisonTarget[],
) {
  const corpus = buildCalibrationRegistry();
  const comparison = compareSimulationAgainstDevices(
    corpus,
    snapshot,
    targets,
  );

  return {
    ...comparison,
    matrix: buildComparisonMatrix(comparison.comparisons),
    simulatorVersion: LIVE_MULTI_COMPARE_VERSION,
    corpusVersion: corpus.version,
  };
}

export function compareLiveSimulationToPreviousGeneration(
  snapshot: SimulationSnapshot,
) {
  const corpus = buildCalibrationRegistry();
  return {
    ...compareSimulationToPreviousGeneration(corpus, snapshot),
    simulatorVersion: LIVE_MULTI_COMPARE_VERSION,
    corpusVersion: corpus.version,
  };
}
