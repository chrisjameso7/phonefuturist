import { describe, expect, it } from 'vitest';
import {
  calculateBatteryCycleExposure,
} from '../src/lib/simulation/modules/battery-cycle-exposure';

describe('battery active-use cycle exposure', () => {
  it('derives equivalent full cycles from Wh-normalized daily drain', () => {
    const result =
      calculateBatteryCycleExposure({
        ageYears: 2,
        dailyDrainWh: 10,
        batteryEnergyWh: 20,
      });

    expect(result.status).toBe('resolved');
    expect(result.basis).toBe('wh');
    expect(
      result.equivalentFullCyclesPerDay,
    ).toBeCloseTo(0.5, 8);
    expect(
      result.equivalentFullCyclesPerYear,
    ).toBeCloseTo(182.5, 8);
    expect(
      result.equivalentFullCycles,
    ).toBeCloseTo(365, 8);
  });

  it('falls back to mAh-normalized drain when Wh is unavailable', () => {
    const result =
      calculateBatteryCycleExposure({
        ageYears: 1,
        dailyDrainMah: 2500,
        batteryCapacityMah: 5000,
      });

    expect(result.status).toBe('resolved');
    expect(result.basis).toBe('mah');
    expect(
      result.equivalentFullCyclesPerYear,
    ).toBeCloseTo(182.5, 8);
  });

  it('fails closed without an age horizon', () => {
    const result =
      calculateBatteryCycleExposure({
        dailyDrainWh: 10,
        batteryEnergyWh: 20,
      });

    expect(result.status).toBe('unresolved');
  });
});
