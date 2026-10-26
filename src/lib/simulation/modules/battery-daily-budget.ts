/**
 * Converts independently measured active-use drain and screen-off draw into
 * a real 24-hour energy budget. Never invent standby consumption.
 */
export type DailyBatteryBudgetInput = {
  usableEnergyWh: number;
  activeHoursPerDay: number;
  activeEnergyWhPerDay: number;
  /** Measured device screen-off baseline including background tasks. */
  standbyPowerW?: number;
};
export type DailyBatteryBudgetResult =
  | { status: 'unresolved'; reason: string }
  | {
      status: 'resolved';
      activeEnergyWhPerDay: number;
      standbyEnergyWhPerDay: number;
      totalEnergyWhPerDay: number;
      expectedCalendarDaysPerCharge: number;
      activeHoursPerDay: number;
      standbyHoursPerDay: number;
      evidence: 'explicit-standby-power';
    };
export function estimateDailyBatteryBudget(input: DailyBatteryBudgetInput): DailyBatteryBudgetResult {
  const { usableEnergyWh, activeHoursPerDay, activeEnergyWhPerDay, standbyPowerW } = input;
  if (![usableEnergyWh, activeHoursPerDay, activeEnergyWhPerDay].every(Number.isFinite) ||
      usableEnergyWh <= 0 || activeHoursPerDay < 0 || activeHoursPerDay > 24 || activeEnergyWhPerDay < 0)
    return { status: 'unresolved', reason: 'Invalid energy or active-use budget.' };
  if (standbyPowerW === undefined || !Number.isFinite(standbyPowerW) || standbyPowerW < 0)
    return { status: 'unresolved', reason: 'Measured standby power is required for calendar-day endurance.' };
  const standbyHoursPerDay = 24 - activeHoursPerDay;
  const standbyEnergyWhPerDay = standbyHoursPerDay * standbyPowerW;
  const totalEnergyWhPerDay = activeEnergyWhPerDay + standbyEnergyWhPerDay;
  const calendarDays = usableEnergyWh / totalEnergyWhPerDay;
  if (!Number.isFinite(totalEnergyWhPerDay) || !Number.isFinite(calendarDays) || calendarDays <= 0 || totalEnergyWhPerDay <= 0) return { status: 'unresolved', reason: 'Total daily energy demand must be positive.' };
  return {
    status: 'resolved', evidence: 'explicit-standby-power',
    activeEnergyWhPerDay, standbyEnergyWhPerDay, totalEnergyWhPerDay,
    expectedCalendarDaysPerCharge: calendarDays,
    activeHoursPerDay, standbyHoursPerDay,
  };
}
