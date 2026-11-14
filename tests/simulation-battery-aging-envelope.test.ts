import { describe, expect, it } from 'vitest';
import {
  calculateBatteryAgingEnvelope,
  equivalentFullCyclesFromUsage,
} from '../src/lib/simulation/modules/battery-aging-envelope';

describe('battery aging envelope', () => {
  it('compounds only explicitly supplied calendar and cycle fade', () => {
    const result =
      calculateBatteryAgingEnvelope({
        initialCapacityMah: 5000,
        initialEnergyWh: 19.4,
        ageYears: 2,
        equivalentFullCycles: 400,
        annualCalendarFadePercent: 2,
        cycleFadePercentPer100Cycles: 1,
      });

    const expectedRetention =
      0.98 ** 2 *
      0.99 ** 4;

    expect(result.status).toBe('resolved');
    expect(
      result.combinedRetentionFraction,
    ).toBeCloseTo(
      expectedRetention,
      8,
    );
    expect(
      result.estimatedCapacityMah,
    ).toBeCloseTo(
      5000 * expectedRetention,
      8,
    );
    expect(
      result.estimatedEnergyWh,
    ).toBeCloseTo(
      19.4 * expectedRetention,
      8,
    );
  });

  it('refuses to invent chemistry-specific fade without explicit rates', () => {
    const result =
      calculateBatteryAgingEnvelope({
        initialCapacityMah: 6000,
        ageYears: 3,
        equivalentFullCycles: 700,
      });

    expect(result.status).toBe('partial');
    expect(
      result.combinedRetentionPercent,
    ).toBeUndefined();
    expect(result.note).toContain(
      'No chemistry-specific degradation rate is guessed',
    );
  });

  it('converts daily depth of discharge into equivalent full cycles', () => {
    expect(
      equivalentFullCyclesFromUsage(
        365,
        80,
      ),
    ).toBeCloseTo(292, 8);
  });
});
