import { buildCalibrationRegistry } from './modules/calibration-registry';
import {
  estimateChargingFromCorpus,
  type ChargingCurveEstimate,
} from './modules/charging-corpus-estimator';
import type { ChargingComparableQuery } from './modules/charging-comparables';
import {
  estimateObservedChargingInputPower,
  type ChargingInputPowerEstimate,
} from './modules/charging-input-power-estimator';

export const LIVE_CHARGING_SIMULATOR_VERSION = 'live-charging-simulator-0.1.0';

export interface LiveChargingInput extends ChargingComparableQuery {}

export interface LiveChargingResult extends ChargingCurveEstimate {
  simulatorVersion: string;
  corpusVersion?: string;
  observedInputPower: ChargingInputPowerEstimate;
}

export function simulateChargingFromLiveCorpus(
  input: LiveChargingInput,
): LiveChargingResult {
  const corpus = buildCalibrationRegistry();
  const result = estimateChargingFromCorpus(corpus, input);

  const observedInputPower =
    estimateObservedChargingInputPower(
      corpus,
      {
        advertisedWatts:
          input.wiredChargingWatts,
        manufacturer:
          input.manufacturer,
        chargingStandard:
          input.chargingStandard,
      },
    );

  return {
    ...result,
    simulatorVersion: LIVE_CHARGING_SIMULATOR_VERSION,
    corpusVersion: corpus.version,
    observedInputPower,
  };
}
