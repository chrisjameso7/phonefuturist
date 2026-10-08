import { describe, expect, it } from 'vitest';
import {
  collectChargingPowerResponseEvidence,
  resolveChargingPowerResponse,
  chargingTimePowerScale,
} from '../src/lib/simulation/modules/charging-power-response';
import { buildChargingModeCorpus } from '../src/lib/simulation/modules/charging-mode-corpus';

describe('charging power response', () => {
  it('derives diminishing-return evidence from same-device charger tests', () => {
    const corpus = buildChargingModeCorpus();
    const evidence = collectChargingPowerResponseEvidence(corpus);

    expect(
      evidence.some(
        (row) =>
          row.deviceVariantId === 'oppo-find-x9-pro-global-7500' &&
          row.lowWatts === 55 &&
          row.highWatts === 80 &&
          row.lowFullChargeMinutes === 80 &&
          row.highFullChargeMinutes === 67,
      ),
    ).toBe(true);
  });

  it('resolves a non-linear local elasticity', () => {
    const corpus = buildChargingModeCorpus();
    const response = resolveChargingPowerResponse(corpus, {
      manufacturer: 'Oppo',
      targetWatts: 60,
    });

    expect(response.status).toBe('resolved');
    expect(response.elasticity).toBeGreaterThan(0);
    expect(response.elasticity).toBeLessThan(1);
  });

  it('does not treat a doubling of watts as a halving of time', () => {
    const scale = chargingTimePowerScale(60, 120, 0.35);
    expect(scale).toBeGreaterThan(0.5);
    expect(scale).toBeLessThan(1);
  });
});
