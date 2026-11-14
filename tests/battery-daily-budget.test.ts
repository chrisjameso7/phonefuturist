import { describe, expect, it } from 'vitest';
import { estimateDailyBatteryBudget } from '../src/lib/simulation/modules/battery-daily-budget';

describe('standby-aware daily battery budget', () => {
  it('does not invent screen-off consumption', () => {
    expect(estimateDailyBatteryBudget({usableEnergyWh: 20,activeHoursPerDay: 4,activeEnergyWhPerDay: 6}).status).toBe('unresolved');
  });
  it('counts all 24 hours once, without double-counting active time', () => {
    const result=estimateDailyBatteryBudget({usableEnergyWh: 24,activeHoursPerDay: 4,activeEnergyWhPerDay: 8,standbyPowerW: 0.2});
    expect(result.status).toBe('resolved');
    if (result.status !== 'resolved') return;
    expect(result.standbyHoursPerDay).toBe(20);
    expect(result.standbyEnergyWhPerDay).toBeCloseTo(4);
    expect(result.totalEnergyWhPerDay).toBeCloseTo(12);
    expect(result.expectedCalendarDaysPerCharge).toBeCloseTo(2);
  });
  it('rejects more than 24 active hours', () => {
    expect(estimateDailyBatteryBudget({usableEnergyWh:20,activeHoursPerDay:25,activeEnergyWhPerDay:5,standbyPowerW:0.2}).status).toBe('unresolved');
  });
});
