import { describe, expect, it } from 'vitest';
import { projectedSustainedCpuScore } from './sustained-cpu-scenario';

describe('sustained CPU scenario', () => {
  it('preserves peak at time zero and reduces performance under load', () => {
    expect(projectedSustainedCpuScore({ peakScore: 14000, durationMinutes: 0 })).toBe(14000);
    expect(projectedSustainedCpuScore({ peakScore: 14000, durationMinutes: 15 })!).toBeLessThan(14000);
  });
  it('makes better cooling retain more performance for the same CPU', () => {
    const passive = projectedSustainedCpuScore({ peakScore: 14000, coolingClass: 'passive-graphite', socPowerW: 10 });
    const active = projectedSustainedCpuScore({ peakScore: 14000, coolingClass: 'active-fan', socPowerW: 10 });
    expect(active!).toBeGreaterThan(passive!);
  });
  it('penalizes higher sustained power and rejects invalid peak scores', () => {
    expect(projectedSustainedCpuScore({ peakScore: 13000, socPowerW: 14 })!).toBeLessThan(
      projectedSustainedCpuScore({ peakScore: 13000, socPowerW: 6 })!,
    );
    expect(projectedSustainedCpuScore({ peakScore: NaN })).toBeUndefined();
  });
});
