import { describe, expect, it } from 'vitest';
import { buildChargingModeCorpus } from '../src/lib/simulation/modules/charging-mode-corpus';
import { estimateChargingFromCorpus } from '../src/lib/simulation/modules/charging-corpus-estimator';

describe('exact wired charging mode precedence', () => {
  it('uses exact measured device mode when explicit identity matches', () => {
    const corpus = buildChargingModeCorpus();

    const result = estimateChargingFromCorpus(corpus, {
      deviceVariantId: 'oppo-find-x9-pro-global-7500',
      batteryMah: 7500,
      wiredChargingWatts: 80,
      manufacturer: 'Oppo',
      chargingStandard: 'SuperVOOC',
    });

    expect(result.status).toBe('resolved');
    expect(result.estimate?.evidenceMode).toBe('measured-match');
    expect(result.estimate?.timeTo100Minutes?.expected).toBe(67);
    expect(result.estimate?.charge30mPercent?.expected).toBe(54);
    expect(result.estimate?.confidence).toBe(1);
  });

  it('does not claim measured evidence without explicit device identity', () => {
    const corpus = buildChargingModeCorpus();

    const result = estimateChargingFromCorpus(corpus, {
      batteryMah: 7500,
      wiredChargingWatts: 80,
      manufacturer: 'Oppo',
      chargingStandard: 'SuperVOOC',
    });

    expect(result.status).toBe('resolved');
    expect(result.estimate?.evidenceMode).not.toBe('measured-match');
  });
});
