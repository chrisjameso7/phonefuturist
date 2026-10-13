import { describe, expect, it } from 'vitest';
import { projectTaperedChargingMinutes } from './charging-scenario';

describe('tapered charging lab scenario', () => {
  it('charges larger batteries more slowly when power stays fixed', () => {
    expect(projectTaperedChargingMinutes({ energyWh: 26, ratedWatts: 60 })!).toBeGreaterThan(projectTaperedChargingMinutes({ energyWh: 19, ratedWatts: 60 })!);
  });
  it('responds to increased charger power', () => {
    expect(projectTaperedChargingMinutes({ energyWh: 21, ratedWatts: 90 })!).toBeLessThan(projectTaperedChargingMinutes({ energyWh: 21, ratedWatts: 45 })!);
  });
  it('does not fabricate values from invalid inputs', () => {
    expect(projectTaperedChargingMinutes({ energyWh: 0, ratedWatts: 60 })).toBeUndefined();
    expect(projectTaperedChargingMinutes({ energyWh: 21, ratedWatts: 0 })).toBeUndefined();
  });
});
