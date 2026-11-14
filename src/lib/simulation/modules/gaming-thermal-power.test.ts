import { describe, expect, it } from 'vitest';
import { projectedGamingThermalPowerFactor } from './battery-experience-engine';

describe('experimental sustained gaming thermal power model', () => {
  it('allows better cooling to sustain greater gaming power draw', () => {
    expect(projectedGamingThermalPowerFactor('active-fan', 10)).toBeGreaterThan(
      projectedGamingThermalPowerFactor('passive-graphite', 10),
    );
  });
  it('responds to SoC power budget without extreme jumps', () => {
    expect(projectedGamingThermalPowerFactor('vapor-chamber', 12)).toBeGreaterThan(
      projectedGamingThermalPowerFactor('vapor-chamber', 5),
    );
    expect(projectedGamingThermalPowerFactor('active-fan', 1000)).toBeLessThanOrEqual(1.3);
  });
  it('leaves unspecified cooling and power neutral', () => {
    expect(projectedGamingThermalPowerFactor()).toBe(1);
  });
});
