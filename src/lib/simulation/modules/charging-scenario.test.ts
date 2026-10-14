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
  it('rejects non-finite charging efficiency', () => {
    expect(projectTaperedChargingMinutes({ energyWh: 22, ratedWatts: 60, efficiency: Number.NaN })).toBeUndefined();
    expect(projectTaperedChargingMinutes({ energyWh: 22, ratedWatts: 60, efficiency: Infinity })).toBeUndefined();
  });
  it('uses selected charging protocol and multi-cell structure in projected taper', () => {
    const baseline = projectTaperedChargingMinutes({ energyWh: 22, ratedWatts: 80, chargingStandard: 'USB PD', cellArchitecture: 'single-cell' })!;
    const rapid = projectTaperedChargingMinutes({ energyWh: 22, ratedWatts: 80, chargingStandard: 'OPPO SUPERVOOC', cellArchitecture: 'dual-cell' })!;
    expect(rapid).toBeLessThan(baseline);
  });

});
