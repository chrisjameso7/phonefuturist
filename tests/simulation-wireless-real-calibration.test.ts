import { describe, expect, it } from 'vitest';
import { buildChargingModeCorpus } from '../src/lib/simulation/modules/charging-mode-corpus';
import { estimateWirelessChargingFromCorpus } from '../src/lib/simulation/modules/wireless-charging-estimator';

describe('real wireless charging calibration', () => {
  it('loads measured Pixel 10 Pro XL Qi2 charging', () => {
    const corpus = buildChargingModeCorpus();

    const result = estimateWirelessChargingFromCorpus(corpus, {
      batteryMah: 5200,
      wirelessChargingWatts: 25,
      manufacturer: 'Google',
      chargingStandard: 'Qi2',
    });

    expect(result.status).toBe('resolved');
    expect(result.expectedFullChargeMinutes).toBeCloseTo(157, 0);
  });

  it('keeps poor generic Qi2 behavior on Find X9 Pro distinct from AirVOOC marketing wattage', () => {
    const corpus = buildChargingModeCorpus();

    const result = estimateWirelessChargingFromCorpus(corpus, {
      batteryMah: 7500,
      wirelessChargingWatts: 25,
      manufacturer: 'Oppo',
      chargingStandard: 'Qi2',
    });

    expect(result.status).toBe('resolved');
    expect(result.expectedFullChargeMinutes).toBeGreaterThan(400);
  });
});
