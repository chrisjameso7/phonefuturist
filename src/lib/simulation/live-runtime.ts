import { buildCalibrationRegistry } from './modules/calibration-registry';
import {
  resolveCorpusRuntimeBand,
  type RuntimeWorkload,
} from './modules/corpus-runtime';
import type { SimulationInput } from './types';

export const LIVE_RUNTIME_SIMULATOR_VERSION = 'live-runtime-simulator-0.1.0';

export function resolveLiveRuntimeBand(
  input: SimulationInput,
  workload: RuntimeWorkload,
) {
  const corpus = buildCalibrationRegistry();
  return {
    ...resolveCorpusRuntimeBand(corpus, input, workload),
    simulatorVersion: LIVE_RUNTIME_SIMULATOR_VERSION,
    corpusVersion: corpus.version,
  };
}
