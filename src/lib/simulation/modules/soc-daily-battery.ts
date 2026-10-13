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
  let activeHoursPerDay=0;
  let dailyActiveEnergyWh=0;
  const workloads: Array<{kind: WorkloadSession['kind']; powerW:number; energyWh:number}> = [];
  for (const session of input.sessions) {
    if (!Number.isFinite(session.hoursPerDay) || session.hoursPerDay < 0)
      return {status:'unresolved',reason:'Session duration must be finite and nonnegative.'};
    const result=estimateSocWorkloadPower({...session.electrical,batteryEnergyWh:input.batteryEnergyWh,
      usableFraction:input.usableFraction});
    if (result.status !== 'scenario') return {status:'unresolved',reason:session.kind+': '+result.reason};
    const energyWh=result.totalPowerW*session.hoursPerDay;
    workloads.push({kind:session.kind,powerW:result.totalPowerW,energyWh});
    activeHoursPerDay+=session.hoursPerDay;
    dailyActiveEnergyWh+=energyWh;
  }
  if (activeHoursPerDay > 24) return {status:'unresolved',reason:'Active daily sessions exceed 24 hours.'};
  const base={status:'scenario' as const,dailyActiveEnergyWh,activeHoursPerDay,workloads};
  const daily=estimateDailyBatteryBudget({usableEnergyWh:input.batteryEnergyWh*input.usableFraction,
    activeHoursPerDay,activeEnergyWhPerDay:dailyActiveEnergyWh,standbyPowerW:input.standbyPowerW});
  if (daily.status === 'unresolved') return base;
  return {...base,dailyStandbyEnergyWh:daily.standbyEnergyWhPerDay,
    dailyTotalEnergyWh:daily.totalEnergyWhPerDay,expectedCalendarDaysPerCharge:daily.expectedCalendarDaysPerCharge};
}
