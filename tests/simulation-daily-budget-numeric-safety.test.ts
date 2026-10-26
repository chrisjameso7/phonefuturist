import { expect, it } from 'vitest';
import { estimateDailyBatteryBudget } from '../src/lib/simulation/modules/battery-daily-budget';
it('rejects overflowing standby demand instead of reporting zero days', () => {
  expect(estimateDailyBatteryBudget({ usableEnergyWh: 20, activeHoursPerDay: 2, activeEnergyWhPerDay: 8, standbyPowerW: Number.MAX_VALUE }).status).toBe('unresolved');
});
it('rejects overflowing endurance instead of reporting infinite days', () => {
  expect(estimateDailyBatteryBudget({ usableEnergyWh: Number.MAX_VALUE, activeHoursPerDay: 24, activeEnergyWhPerDay: Number.MIN_VALUE, standbyPowerW: 0 }).status).toBe('unresolved');
});
it('preserves an explicit 24-hour energy budget', () => {
  const result = estimateDailyBatteryBudget({ usableEnergyWh: 20, activeHoursPerDay: 4, activeEnergyWhPerDay: 8, standbyPowerW: .1 });
  expect(result.status).toBe('resolved');
  if(result.status === 'resolved') expect(result.expectedCalendarDaysPerCharge).toBe(2);
});
