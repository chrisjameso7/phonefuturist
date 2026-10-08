import { buildCalibrationRegistry } from './modules/calibration-registry';
import {
  simulateCalibratedSocThermals,
  type CalibratedSocThermalInput,
} from './modules/calibrated-soc-thermal';

export const LIVE_THERMAL_SIMULATOR_VERSION = 'live-thermal-simulator-0.1.0';

export function simulateLiveThermals(input: CalibratedSocThermalInput) {
  const corpus = buildCalibrationRegistry();
  return {
    ...simulateCalibratedSocThermals(corpus, input),
    simulatorVersion: LIVE_THERMAL_SIMULATOR_VERSION,
    corpusVersion: corpus.version,
  };
}
