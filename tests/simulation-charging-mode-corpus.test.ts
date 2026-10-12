import { describe, expect, it } from 'vitest';
import { buildChargingModeCorpus } from '../src/lib/simulation/modules/charging-mode-corpus';
import { selectChargingComparables } from '../src/lib/simulation/modules/charging-comparables';

describe('charger-mode corpus', () => {
  it('preserves multiple charging modes for one physical phone', () => {
    const corpus = buildChargingModeCorpus();

    const result = selectChargingComparables(corpus, {
      batteryMah: 7500,
      wiredChargingWatts: 80,
      manufacturer: 'Oppo',
      region: 'Global',
      limit: 10,
    });

    const findX9Modes = result.references.filter(
      (reference) =>
        reference.deviceVariantId === 'oppo-find-x9-pro-global-7500',
    );

    expect(findX9Modes.length).toBeGreaterThanOrEqual(2);
    expect(
      findX9Modes.some(
        (reference) =>
          reference.chargingStandard === 'SuperVOOC' &&
          reference.fullChargeMinutes === 67,
      ),
    ).toBe(true);
    expect(
      findX9Modes.some(
        (reference) =>
          reference.chargingStandard === 'USB PD' &&
          reference.fullChargeMinutes === 80,
      ),
    ).toBe(true);
  });

  it('keeps OnePlus 15 North America and international charging variants separate', () => {
    const corpus = buildChargingModeCorpus();

    const international = corpus.devices.find(
      (device) => device.variant.id === 'oneplus-15-international-7300',
    );
    const northAmerica = corpus.devices.find(
      (device) => device.variant.id === 'oneplus-15-na-7300',
    );

    expect(international?.charging?.advertisedWiredWatts).toBe(120);
    expect(northAmerica?.charging?.advertisedWiredWatts).toBe(80);
    expect(international?.charging?.cellArchitecture).toBe('dual-cell');
    expect(northAmerica?.charging?.cellArchitecture).toBe('dual-cell');
  });
});
