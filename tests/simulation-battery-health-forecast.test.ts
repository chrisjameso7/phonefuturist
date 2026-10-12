import { describe, expect, it } from 'vitest';
import {
  forecastBatteryHealthThreshold,
} from '../src/lib/simulation/modules/battery-health-forecast';

describe('battery health threshold forecast', () => {
  it('projects a target health threshold from explicit calendar and cycle fade assumptions', () => {
    const result =
      forecastBatteryHealthThreshold({
        targetRetentionPercent: 80,
        currentAgeYears: 1,
        annualCalendarFadePercent: 2,
        cycleFadePercentPer100Cycles: 1,
        equivalentFullCyclesPerYear: 300,
      });

    expect(result.status).toBe('resolved');
    expect(
      result.annualCombinedRetentionFraction,
    ).toBeLessThan(1);
    expect(
      result.yearsFromNewToThreshold,
    ).toBeGreaterThan(0);
    expect(
      result.remainingYearsFromCurrentAge,
    ).toBeGreaterThanOrEqual(0);
    expect(
      result.equivalentFullCyclesToThreshold,
    ).toBeGreaterThan(0);
  });

  it('works with calendar fade alone', () => {
    const result =
      forecastBatteryHealthThreshold({
        targetRetentionPercent: 80,
        annualCalendarFadePercent: 3,
      });

    expect(result.status).toBe('resolved');
    expect(
      result.yearsFromNewToThreshold,
    ).toBeGreaterThan(0);
    expect(
      result.equivalentFullCyclesToThreshold,
    ).toBeUndefined();
  });

  it('fails closed without a non-zero fade mechanism', () => {
    const result =
      forecastBatteryHealthThreshold({
        targetRetentionPercent: 80,
      });

    expect(result.status).toBe('unresolved');
    expect(result.note).toContain(
      'No universal degradation rate is assumed',
    );
  });
});
