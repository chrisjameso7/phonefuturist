import { describe, expect, it } from 'vitest';
import { projectTaperedChargingMinutes } from '../src/lib/simulation/modules/charging-scenario';

describe('illustrative charging scenario safety', () => {
  it.each([NaN, Infinity, -1, 0])('withholds invalid energy or power: %s', value => {
    expect(projectTaperedChargingMinutes({ energyWh: value, ratedWatts: 45 })).toBeUndefined();
    expect(projectTaperedChargingMinutes({ energyWh: 20, ratedWatts: value })).toBeUndefined();
  });
  it('withholds arithmetic overflow instead of exporting infinite minutes', () => {
    expect(projectTaperedChargingMinutes({ energyWh: 1e308, ratedWatts: 1e-308 })).toBeUndefined();
  });
  it('preserves capacity and power direction without a zero-minute full charge', () => {
    const base = projectTaperedChargingMinutes({ energyWh: 20, ratedWatts: 45 })!;
    expect(projectTaperedChargingMinutes({ energyWh: 40, ratedWatts: 45 })).toBeGreaterThan(base);
    expect(projectTaperedChargingMinutes({ energyWh: 20, ratedWatts: 90 })).toBeLessThan(base);
    expect(projectTaperedChargingMinutes({ energyWh: 0.001, ratedWatts: 1000 })).toBe(1);
  });
});
