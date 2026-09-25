import {simulateDevice} from './engine';
import type {SimulationInput, SimulationResult} from './types';
import {simulateBatteryExperience, type BatteryExperienceWorkload, type WorkloadDefinition} from './modules/battery-experience';

export const WORKLOAD_LABEL: Record<BatteryExperienceWorkload,string> = {
  mixed_use:'Mixed use',web_browsing:'Web browsing',video_playback:'Video playback',gaming:'Gaming',camera_use:'Camera use',standby:'Standby',
};
export const COMPONENT_WORKLOADS = ['web_browsing','video_playback','gaming','camera_use','standby'] as const;
export type ProfileMode = 'equal'|'percent'|'manual';
export type WorkloadFields = Record<BatteryExperienceWorkload,string>;
export type Profile = {
  mode:ProfileMode; totalPercent:number; issues:string[];
  workloads:Partial<Record<BatteryExperienceWorkload,WorkloadDefinition>>;
  terms:{workload:BatteryExperienceWorkload;power:number;share:number}[];
};

export function numeric(value:string):number|undefined {
  if(!value.trim()) return undefined;
  const n=Number(value); return Number.isFinite(n)?n:undefined;
}

/** Copy the primitive synchronously; a deferred React updater never owns the event. */
export function captureValue(consume:(value:string)=>void) {
  return (event:{currentTarget:{value:string}})=>{const value=event.currentTarget.value;consume(value);};
}
export const INVALID_NUMBER='__invalid_number__';
export function captureNumericValue(consume:(value:string)=>void) {
  return (event:{currentTarget:{value:string;validity?:{badInput:boolean}}})=>{
    const {value,validity}=event.currentTarget;
    consume(validity?.badInput?INVALID_NUMBER:value);
  };
}

export function numericIssues(fields:Record<string,string>,prefix=''):string[] {
  const issues:string[]=[];
  for(const [key,raw] of Object.entries(fields)) {
    if(!raw.trim()) continue;
    const n=numeric(raw);
    const label=prefix+key.replace(/([a-z])([A-Z])/g,'$1 $2');
    const zeroAllowed=/bezel|Mm3|reservedVolumePercent/i.test(key);
    if(n===undefined || (zeroAllowed?n<0:n<=0)) issues.push(`${label}: enter a ${zeroAllowed?'non-negative':'positive'} finite number, or leave it unknown.`);
    else if(key.endsWith('Percent') && n>100) issues.push(`${label}: use a percentage no greater than 100.`);
    else if(key.includes('resolution')&&key.endsWith('Px')&&!Number.isInteger(n)) issues.push(`${label}: pixel counts must be whole numbers.`);
  }
  return issues;
}

export function buildProfile(power:WorkloadFields,shares:WorkloadFields,mode:ProfileMode):Profile {
  const profile:Profile={mode,totalPercent:0,issues:[],workloads:{},terms:[]};
  const keys:BatteryExperienceWorkload[]=mode==='manual'?['mixed_use']:[...COMPONENT_WORKLOADS];
  const supplied=keys.filter(k=>power[k].trim()!=='');
  for(const key of keys) {
    const p=numeric(power[key]);
    const rawShare=shares[key].trim();
    const s=numeric(rawShare);
    if(power[key].trim() && (p===undefined||p<=0)) profile.issues.push(`${WORKLOAD_LABEL[key]}: average device power must be a positive finite number.`);
    if(mode==='percent') {
      if(rawShare && (s===undefined||s<0||s>100)) profile.issues.push(`${WORKLOAD_LABEL[key]}: share must be between 0% and 100%.`);
      else if(s!==undefined) profile.totalPercent+=s;
      if(!rawShare && power[key].trim()) profile.issues.push(`${WORKLOAD_LABEL[key]}: add its share, or enter 0% to exclude it.`);
      if(s!==undefined&&s>0&&(p===undefined||p<=0)) profile.issues.push(`${WORKLOAD_LABEL[key]}: supply average device power for its ${s}% share.`);
    }
    const share=mode==='percent'?(s??0)/100:(supplied.length?1/supplied.length:0);
    if(p!==undefined && p>0 && share>0) {
      profile.terms.push({workload:key,power:p,share});
      // Whole-device power is explicitly named, never misrepresented as SoC/compute power.
      profile.workloads[key]={subsystems:{workloadSpecific:{whole_device:p}},weight:share};
    }
  }
  if(mode==='percent' && Math.abs(profile.totalPercent-100)>1e-8) profile.issues.push(`Shares total ${profile.totalPercent.toFixed(2)}%. ${profile.totalPercent<100?'Allocate the remaining share':'Reduce the shares'} to reach 100%.`);
  if(!profile.terms.length) profile.issues.push('Supply average device power for at least one workload.');
  return profile;
}

export function hasNonFinite(value:unknown):boolean {
  if(typeof value==='number') return !Number.isFinite(value);
  return !!value&&typeof value==='object'&&Object.values(value).some(hasNonFinite);
}

export type WorkspaceRun = {
  input:SimulationInput; profile:Profile; issues:string[]; device?:SimulationResult;
  battery?:ReturnType<typeof simulateBatteryExperience>;
};

/** Snapshot current inputs together; never combine current power with a previous device result. */
export function runWorkspace(input:SimulationInput,usablePercent:string,profile:Profile,inputIssues:string[]=[]):WorkspaceRun {
  const run:WorkspaceRun={input,profile,issues:[...inputIssues]};
  if(inputIssues.length) return run;
  try {
    const device=simulateDevice(input);
    if(hasNonFinite(device)) {run.issues.push('These values exceed the supported numerical range. Check dimensions, energy and camera inputs.');return run;}
    run.device=device;
    run.issues.push(...profile.issues);
    const usable=numeric(usablePercent);
    if(usablePercent.trim()&&(usable===undefined||usable<=0||usable>100)) run.issues.push('Usable pack energy must be above 0% and at most 100%, or blank for the full rated pack.');
    if(run.issues.length) return run;
    const battery=simulateBatteryExperience({energy:{totalEnergyWh:device.battery?.totalEnergyWh,...(usable!==undefined?{usablePercent:usable}:{})},workloads:profile.workloads});
    if(hasNonFinite(battery)) {run.issues.push('Runtime exceeds the supported numerical range. Check the supplied energy and power values.');return run;}
    run.battery=battery;
    if(battery.result.status==='unresolved') run.issues.push(device.battery?.totalEnergyWh===undefined?'Battery energy is missing. Supply battery capacity (mAh) and a positive nominal voltage (V).':battery.result.unresolved?.message??'Battery inputs are unresolved.');
  } catch {
    run.issues.push('This configuration could not be calculated. Check incomplete or malformed values and run again.');
  }
  return run;
}
