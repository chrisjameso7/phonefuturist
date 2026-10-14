import { estimateSocWorkloadPower, type SocWorkloadPowerInput } from './soc-workload-power';
import { estimateDailyBatteryBudget } from './battery-daily-budget';

/** Evidence-gated scenario: measured exact SoC curves + explicit workload and phone power inputs. */
export type WorkloadSession = {
  kind: 'web_browsing' | 'video_playback' | 'gaming';
  hoursPerDay: number;
  electrical: Omit<SocWorkloadPowerInput, 'batteryEnergyWh' | 'usableFraction'>;
};
export type SocDailyBatteryInput = {
  batteryEnergyWh: number;
  usableFraction: number;
  standbyPowerW?: number;
  sessions: WorkloadSession[];
};
export type SocDailyBatteryResult =
  | { status: 'unresolved'; reason: string }
  | { status: 'scenario'; dailyActiveEnergyWh: number; dailyStandbyEnergyWh?: number;
      dailyTotalEnergyWh?: number; expectedCalendarDaysPerCharge?: number;
      activeHoursPerDay: number; workloads: Array<{kind: WorkloadSession['kind']; powerW: number; energyWh: number}> };

export function estimateSocDailyBattery(input: SocDailyBatteryInput): SocDailyBatteryResult {
  if (!Number.isFinite(input.batteryEnergyWh) || input.batteryEnergyWh <= 0 ||
      !Number.isFinite(input.usableFraction) || input.usableFraction <= 0 || input.usableFraction > 1)
    return {status:'unresolved',reason:'Positive pack energy and a valid usable fraction are required.'};
  if (!input.sessions.length) return {status:'unresolved',reason:'At least one session is required.'};
  if (input.standbyPowerW !== undefined && (!Number.isFinite(input.standbyPowerW) || input.standbyPowerW < 0))
    return {status:'unresolved',reason:'Standby power must be finite and nonnegative when supplied.'};
  // Validate the complete schedule before looking up any processor evidence.
  // Otherwise an unknown SoC can mask an invalid zero-hour or >24-hour day.
  if (input.sessions.some(session => !Number.isFinite(session.hoursPerDay) || session.hoursPerDay < 0))
    return {status:'unresolved',reason:'Session duration must be finite and nonnegative.'};
  const activeHoursPerDay = input.sessions.reduce((total, session) => total + session.hoursPerDay, 0);
  if (activeHoursPerDay > 24) return {status:'unresolved',reason:'Active daily sessions exceed 24 hours.'};
  if (activeHoursPerDay === 0) return {status:'unresolved',reason:'A nonzero active session is required for this workload scenario.'};
  let dailyActiveEnergyWh=0;
  const workloads: Array<{kind: WorkloadSession['kind']; powerW:number; energyWh:number}> = [];
  for (const session of input.sessions) {
    const result=estimateSocWorkloadPower({...session.electrical,batteryEnergyWh:input.batteryEnergyWh,
      usableFraction:input.usableFraction});
    if (result.status !== 'scenario') return {status:'unresolved',reason:session.kind+': '+result.reason};
    const energyWh=result.totalPowerW*session.hoursPerDay;
    workloads.push({kind:session.kind,powerW:result.totalPowerW,energyWh});
    dailyActiveEnergyWh+=energyWh;
  }
  const base={status:'scenario' as const,dailyActiveEnergyWh,activeHoursPerDay,workloads};
  const daily=estimateDailyBatteryBudget({usableEnergyWh:input.batteryEnergyWh*input.usableFraction,
    activeHoursPerDay,activeEnergyWhPerDay:dailyActiveEnergyWh,standbyPowerW:input.standbyPowerW});
  if (daily.status === 'unresolved') return base;
  return {...base,dailyStandbyEnergyWh:daily.standbyEnergyWhPerDay,
    dailyTotalEnergyWh:daily.totalEnergyWhPerDay,expectedCalendarDaysPerCharge:daily.expectedCalendarDaysPerCharge};
}
