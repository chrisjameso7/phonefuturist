import { describe, expect, it } from 'vitest';
import { buildChargingModeCorpus } from '../src/lib/simulation/modules/charging-mode-corpus';
import {
  resolveChargingPowerResponse,
} from '../src/lib/simulation/modules/charging-power-response';
import { estimateChargingFromCorpus } from '../src/lib/simulation/modules/charging-corpus-estimator';

describe('separate early and full charging power response', () => {
  it('learns a much weaker early-charge response for Find X9 Pro than its full-charge response', () => {
    const corpus = buildChargingModeCorpus();

    const response = resolveChargingPowerResponse(corpus, {
      manufacturer: 'Oppo',
      targetWatts: 60,
    });

    expect(response.status).toBe('resolved');
    expect(response.elasticity).toBeGreaterThan(0);
    expect(response.earlyChargeElasticity).toBeDefined();
    expect(response.earlyChargeElasticity!).toBeLessThan(
      response.elasticity!,
    );
  });

  it('keeps 30-minute charge comparatively stable while full-charge time responds to wattage', () => {
    const corpus = buildChargingModeCorpus();

    const at55 = estimateChargingFromCorpus(corpus, {
      batteryMah: 7500,
      wiredChargingWatts: 55,
      manufacturer: 'Oppo',
    });
    const at80 = estimateChargingFromCorpus(corpus, {
      batteryMah: 7500,
      wiredChargingWatts: 80,
      manufacturer: 'Oppo',
    });

    expect(at55.status).toBe('resolved');
    expect(at80.status).toBe('resolved');

    const p30At55 = at55.estimate?.charge30mPercent?.expected;
    const p30At80 = at80.estimate?.charge30mPercent?.expected;
    const fullAt55 = at55.estimate?.timeTo100Minutes?.expected;
    const fullAt80 = at80.estimate?.timeTo100Minutes?.expected;

    expect(p30At55).toBeDefined();
    expect(p30At80).toBeDefined();
    expect(fullAt55).toBeDefined();
    expect(fullAt80).toBeDefined();

    expect(Math.abs(p30At80! - p30At55!)).toBeLessThan(8);
    expect(fullAt80!).toBeLessThan(fullAt55!);
  });
});
