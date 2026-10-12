import { buildCalibrationRegistry } from './modules/calibration-registry';
import {
  backtestChargingCorpus,
} from './modules/charging-backtest';

export const LIVE_CHARGING_VALIDATION_VERSION =
  'live-charging-validation-0.1.0';

export function validateLiveChargingCalibration() {
  const corpus = buildCalibrationRegistry();
  const result = backtestChargingCorpus(corpus);

  return {
    ...result,
    validationVersion: LIVE_CHARGING_VALIDATION_VERSION,
    corpusVersion: corpus.version,
  };
}
