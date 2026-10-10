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
    expect(result.estimate?.basis).toBe('exact-measured-mode');
    expect(result.estimate?.timeTo100Minutes?.expected).toBe(67);
    expect(
      result.estimate?.timeTo100Minutes?.provenance,
    ).toBe('measured');
    expect(result.estimate?.charge30mPercent?.expected).toBe(54);
    expect(
      result.estimate?.charge30mPercent?.provenance,
    ).toBe('measured');
    expect(
      result.estimate?.timeTo50Minutes?.provenance,
    ).toBe('derived');
    expect(
      result.estimate?.timeTo80Minutes?.provenance,
    ).toBe('derived');
    expect(result.estimate?.referenceCount).toBe(1);
    expect(result.estimate?.referenceModeCount).toBe(1);
    expect(
      result.estimate?.measurementCount,
    ).toBeGreaterThan(1);
    expect(result.estimate?.confidence).toBe(1);
  });

  it('does not reuse exact measured time after the physical battery capacity changes', () => {
    const corpus = buildChargingModeCorpus();

    const result = estimateChargingFromCorpus(corpus, {
      deviceVariantId: 'oppo-find-x9-pro-global-7500',
      batteryMah: 8000,
      wiredChargingWatts: 80,
      manufacturer: 'Oppo',
      chargingStandard: 'SuperVOOC',
    });

    expect(result.status).toBe('resolved');
    expect(result.estimate?.evidenceMode).not.toBe('measured-match');
    expect(result.estimate?.basis).toBe('weighted-comparable-corpus');
    expect(result.estimate?.timeTo100Minutes?.expected).not.toBe(67);
  });

  it('does not claim exact measured mode when the charging protocol only partially matches', () => {
    const corpus = buildChargingModeCorpus();

    const result = estimateChargingFromCorpus(corpus, {
      deviceVariantId: 'oneplus-15-international-7300',
      batteryMah: 7300,
      wiredChargingWatts: 55,
      manufacturer: 'OnePlus',
      chargingStandard: 'USB PD',
    });

    expect(result.status).toBe('resolved');
    expect(result.estimate?.evidenceMode).not.toBe(
      'measured-match',
    );
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
