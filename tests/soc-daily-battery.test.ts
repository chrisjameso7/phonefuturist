import { describe, expect, it } from 'vitest';
import { estimateSocDailyBattery } from '../src/lib/simulation/modules/soc-daily-battery';

describe('SoC-specific daily workload accounting', () => {
  const base = {
    batteryEnergyWh: 22, usableFraction: .9,
    sessions: [{
      kind: 'gaming' as const, hoursPerDay: 2,
      electrical: {
        socName:'Unmeasured Future Concept Chip', protocol:'steelNomadLight' as const,
        targetBenchmarkScore:1000,activeDutyFraction:.4,
        inactiveBoardPowerW:.5, displayPowerW:1,
      },
    }],
  };
  it('does not borrow another SoC measurement for an unknown chip', () => {
    const result=estimateSocDailyBattery(base);
    expect(result.status).toBe('unresolved');
  });
  it('rejects a physically impossible daily usage schedule', () => {
    const result=estimateSocDailyBattery({...base,sessions:[{...base.sessions[0],hoursPerDay:25}]});
    expect(result.status).toBe('unresolved');
  });
  it('requires pack energy', () => {
    expect(estimateSocDailyBattery({...base,batteryEnergyWh:0}).status).toBe('unresolved');
  });
});
