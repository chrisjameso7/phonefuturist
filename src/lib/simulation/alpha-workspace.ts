import {buildProfile, COMPONENT_WORKLOADS, numeric, WORKLOAD_LABEL, type Profile, type WorkloadFields, type WorkspaceRun} from './beta-workspace';
import {POWER_EVIDENCE_VERSION, resolvePowerEvidence, workloadProvenance, type EvidenceDevice, type ResolvedPowerEvidence} from './power-evidence';

export const USAGE_VERSION = 'daily-usage-1';
export const ACTIVE_WORKLOADS = ['web_browsing','video_playback','gaming','camera_use'] as const;
export type Usage = Record<typeof ACTIVE_WORKLOADS[number], string>;
export type UsagePreset = 'Light'|'Typical'|'Heavy'|'Custom';
// Editorial usage scenarios in minutes/day, never device measurements or power coefficients.
export const USAGE_PRESETS: Record<Exclude<UsagePreset,'Custom'>, Usage> = {
  Light:{web_browsing:'60',video_playback:'30',gaming:'0',camera_use:'10'},
  Typical:{web_browsing:'120',video_playback:'90',gaming:'45',camera_use:'15'},
  Heavy:{web_browsing:'180',video_playback:'180',gaming:'120',camera_use:'30'},
};
export type Experience = {mode:'simple'|'advanced';preset:UsagePreset;custom:Usage;useEnteredPower:boolean};
export const INITIAL_EXPERIENCE:Experience={mode:'simple',preset:'Typical',custom:{...USAGE_PRESETS.Typical},useEnteredPower:false};
export type ExperienceAction = {type:'mode';value:Experience['mode']}|{type:'preset';value:UsagePreset}|{type:'duration';key:keyof Usage;value:string}|{type:'power';value:boolean}|{type:'reset'};
export function experienceReducer(state:Experience,action:ExperienceAction):Experience {
  switch(action.type){
    case 'mode':return {...state,mode:action.value};
    case 'preset':return {...state,preset:action.value};
    case 'duration':return {...state,preset:'Custom',custom:{...state.custom,[action.key]:action.value}};
    case 'power':return {...state,useEnteredPower:action.value};
    case 'reset':return {...INITIAL_EXPERIENCE,custom:{...INITIAL_EXPERIENCE.custom}};
  }
}
export function deriveUsage(usage:Usage) {
  const issues:string[]=[];
  const minutes=ACTIVE_WORKLOADS.map(key=>{
    const value=numeric(usage[key]);
    if(value===undefined||value<0||value>1440) issues.push(`${WORKLOAD_LABEL[key]}: enter minutes from 0 to 1440 (use 0 for none).`);
    return value??0;
  });
  const active=minutes.reduce((sum,n)=>sum+n,0);
  if(active>1440) issues.push('Active usage exceeds 24 hours. Enter non-overlapping daily durations.');
  const shares:WorkloadFields={mixed_use:'',web_browsing:'0',video_playback:'0',gaming:'0',camera_use:'0',standby:'0'};
  if(!issues.length){ACTIVE_WORKLOADS.forEach((key,i)=>shares[key]=String(minutes[i]/1440*100));shares.standby=String((1440-active)/1440*100);}
  return {shares,issues,activeMinutes:active,idleMinutes:Math.max(0,1440-active)};
}
/** Shown when the seed evidence genuinely cannot support a configuration. */
export const INSUFFICIENT_EVIDENCE_MESSAGE="We don't have enough reference data to simulate this configuration yet.";

/** Build the Simple Mode mixture from reference power evidence. Never invents watts. */
function evidenceProfile(evidence:ResolvedPowerEvidence,shares:WorkloadFields):Profile {
  const profile:Profile={mode:'percent',totalPercent:0,issues:[],workloads:{},terms:[]};
  for(const key of COMPONENT_WORKLOADS){
    const share=(numeric(shares[key])??0)/100;
    profile.totalPercent+=share*100;
    if(share<=0) continue;
    const power=key==='standby'?evidence.idlePowerW:evidence.screenOnPowerW;
    const midpoint=(power.min+power.max)/2;
    profile.terms.push({workload:key,power:midpoint,share});
    // Whole-device power is explicitly named, never misrepresented as SoC/compute power.
    profile.workloads[key]={subsystems:{workloadSpecific:{whole_device:{range:{min:power.min,max:power.max},provenance:workloadProvenance(key,evidence)}}},weight:share};
  }
  if(!profile.terms.length) profile.issues=[INSUFFICIENT_EVIDENCE_MESSAGE];
  return profile;
}

/**
 * Simple Mode never asks the user for workload wattage.
 *
 * Power comes from the PhoneFuturist calibration evidence for the
 * simulated device; the user's usage profile supplies the mixture. A
 * user can still explicitly opt into their own Advanced values, which
 * keeps the unverified input labelled as theirs.
 */
export function simpleProfile(experience:Experience,power:WorkloadFields,device:EvidenceDevice={},references?:Parameters<typeof resolvePowerEvidence>[1]) {
  const usage=experience.preset==='Custom'?experience.custom:USAGE_PRESETS[experience.preset];
  const derived=deriveUsage(usage);
  if(derived.issues.length){const failed=buildProfile({...power,standby:''},derived.shares,'percent');failed.issues=derived.issues;return failed;}
  if(experience.useEnteredPower){
    const selected={...power};
    for(const key of COMPONENT_WORKLOADS) if(Number(derived.shares[key])===0) selected[key]='';
    return buildProfile(selected,derived.shares,'percent');
  }
  const evidence=resolvePowerEvidence(device,references);
  if(!evidence){const unknown=buildProfile({...power,standby:''},derived.shares,'percent');unknown.issues=[INSUFFICIENT_EVIDENCE_MESSAGE];return unknown;}
  return evidenceProfile(evidence,derived.shares);
}

export {POWER_EVIDENCE_VERSION};

/** A usage profile describes one day, so the day is the honest horizon. */
export const DAY_HOURS=24;

function trimNumber(value:number):string {return String(Number(value.toFixed(1)));}

/**
 * Present a Simple Mode runtime against a 24-hour day.
 *
 * The battery model answers "how long does this draw last", which for a
 * full-day profile is longer than a day. Saying "250 h of battery life"
 * would be a category error, so the consumer framing is days-per-charge
 * whenever the pack outlasts the day.
 */
export function simpleRuntimeFraming(runtime:{min?:number;max?:number}|undefined):string|undefined {
  if(runtime?.min===undefined||runtime.max===undefined||!Number.isFinite(runtime.min)||!Number.isFinite(runtime.max)) return undefined;
  const [min,max]=[runtime.min,runtime.max].sort((a,b)=>a-b);
  if(max>=DAY_HOURS){
    return `A full charge covers the whole ${DAY_HOURS}-hour day — roughly ${trimNumber(min/DAY_HOURS)}–${trimNumber(max/DAY_HOURS)} days of this usage per charge. Treat it as an optimistic upper bound.`;
  }
  return `A full charge runs out after about ${trimNumber(min)}–${trimNumber(max)} h, partway through a ${DAY_HOURS}-hour day on this usage pattern.`;
}
export type AlphaContext = {mode:Experience['mode'];usageProfile:string;usageVersion:string;usage?:Usage;powerSource:string;usablePercent:string;calibrationVersion:string};
export type AlphaRun = WorkspaceRun & {context:AlphaContext};
export function freezeRun(run:WorkspaceRun,context:AlphaContext):AlphaRun {
  const snapshot=structuredClone({...run,context});
  function freeze(value:unknown){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}}
  freeze(snapshot);return snapshot;
}
