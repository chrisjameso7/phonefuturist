import { buildCalibrationRegistry } from './modules/calibration-registry';
import {
  estimateWirelessChargingFromCorpus,
  type WirelessChargingQuery,
} from './modules/wireless-charging-estimator';

export const LIVE_WIRELESS_CHARGING_VERSION =
  'live-wireless-charging-0.1.0';

export function simulateWirelessChargingFromLiveCorpus(
  input: WirelessChargingQuery,
) {
  const corpus = buildCalibrationRegistry();

  return {
    ...estimateWirelessChargingFromCorpus(corpus, input),
    simulatorVersion: LIVE_WIRELESS_CHARGING_VERSION,
    corpusVersion: corpus.version,
  };
}
