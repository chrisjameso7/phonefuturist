import { describe, expect, it } from 'vitest';
import { projectedSustainedGpuRetention } from './sustained-gpu-scenario';

describe('GPU thermal lab scenario', () => {
  it('retains full peak performance at zero duration', () => {
    expect(projectedSustainedGpuRetention({ durationMinutes: 0 })).toBe(100);
  });
  it('retains more performance with active cooling', () => {
    expect(projectedSustainedGpuRetention({ coolingClass: 'active-fan', socPowerW: 10 }))
      .toBeGreaterThan(projectedSustainedGpuRetention({ coolingClass: 'passive-graphite', socPowerW: 10 }));
  });
  it('responds to increased power and clamps extreme configurations', () => {
    expect(projectedSustainedGpuRetention({ socPowerW: 15 }))
      .toBeLessThan(projectedSustainedGpuRetention({ socPowerW: 5 }));
    expect(projectedSustainedGpuRetention({ socPowerW: 500, durationMinutes: 60 })).toBeGreaterThanOrEqual(50);
  });
});
