import {buildProfile, COMPONENT_WORKLOADS, numeric, WORKLOAD_LABEL, type Profile, type WorkloadFields, type WorkspaceRun} from './beta-workspace';
import {POWER_EVIDENCE_VERSION, resolveEndurance, resolvePowerEvidence, workloadEvidence, type EvidenceDevice, type ResolvedPowerEvidence, type SimpleEndurance} from './power-evidence';

export const USAGE_VERSION = 'daily-usage-1';
export const ACTIVE_WORKLOADS = ['web_browsing','video_playback','gaming','camera_use'] as const;
export type Usage = Record<typeof ACTIVE_WORKLOADS[number], string>;
export type UsagePreset = 'Light'|'Typical'|'Heavy'|'Gaming'|'Camera'|'Custom';
// Editorial usage scenarios in minutes/day, never device measurements or power coefficients.
export const USAGE_PRESETS: Record<Exclude<UsagePreset,'Custom'>, Usage> = {
  Light:{web_browsing:'60',video_playback:'30',gaming:'0',camera_use:'10'},
  Typical:{web_browsing:'120',video_playback:'90',gaming:'45',camera_use:'15'},
  Heavy:{web_browsing:'180',video_playback:'180',gaming:'120',camera_use:'30'},
  Gaming:{web_browsing:'90',video_playback:'60',gaming:'240',camera_use:'10'},
  Camera:{web_browsing:'90',video_playback:'60',gaming:'20',camera_use:'120'},
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

/**
 * Build the Simple Mode profile from reference power evidence.
 *
 * Only workloads the calibration set can actually account for are given a
 * power value. Video, gaming, camera and idle have no measured duty cycle
 * in this repository, so they are left out of the mixture entirely rather
 * than filled in from web browsing. The profile therefore evaluates the
 * one continuous duty cycle the evidence supports, and the usage profile
 * is accounted for separately by resolveEndurance.
 */
function evidenceProfile(evidence:ResolvedPowerEvidence):Profile {
  const power=evidence.webPowerW;
  const profile:Profile={mode:'percent',totalPercent:100,issues:[],workloads:{},terms:[]};
  profile.terms.push({workload:'web_browsing',power:(power.min+power.max)/2,share:1});
  // Whole-device power is explicitly named, never misrepresented as SoC/compute power.
  profile.workloads.web_browsing={subsystems:{workloadSpecific:{whole_device:{range:{min:power.min,max:power.max},provenance:workloadEvidence(evidence).web_browsing.provenance}}},weight:1};
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
  return evidenceProfile(evidence);
}

/**
 * Resolve Simple Mode endurance for the selected usage pattern.
 *
 * Returns undefined when the evidence cannot support any estimate, which
 * is the single condition under which Simple Mode reports that it does
 * not have enough reference data.
 */
export function simpleEndurance(experience:Experience,usableEnergyWh:number|undefined,device:EvidenceDevice={},references?:Parameters<typeof resolvePowerEvidence>[1]):SimpleEndurance|undefined {
  if(usableEnergyWh===undefined||!Number.isFinite(usableEnergyWh)||usableEnergyWh<=0) return undefined;
  const usage=experience.preset==='Custom'?experience.custom:USAGE_PRESETS[experience.preset];
  const derived=deriveUsage(usage);
  if(derived.issues.length) return undefined;
  const evidence=resolvePowerEvidence(device,references);
  if(!evidence) return undefined;
  return resolveEndurance({evidence,minutesPerDay:usage,usableEnergyWh});
}

export {POWER_EVIDENCE_VERSION};

/** A usage profile describes one day, so the day is the honest horizon. */
export const DAY_HOURS=24;

function trimNumber(value:number):string {return String(Number(value.toFixed(1)));}

/** Daily endurance requires evidence for every positive-duration workload. */
export function simpleEnduranceHeadline(endurance:SimpleEndurance|undefined):{headline:string;detail:string}|undefined {
  if(!endurance) return undefined;
  if(endurance.verdict==='insufficient-evidence') return {
    headline: INSUFFICIENT_EVIDENCE_MESSAGE,
    detail: `Missing power evidence for ${endurance.dailyBudget.filter(line=>line.hours>0&&!line.energyWh).map(line=>line.workload.replaceAll('_',' ')).join(', ')}. Continuous Wi-Fi web reference hours cannot establish daily battery life.`,
  };
  const energy=endurance.accountedEnergyWh;
  return {headline:energy?`${trimNumber(endurance.usableEnergyWh/energy.max)}-${trimNumber(endurance.usableEnergyWh/energy.min)} days per charge`:'Unknown',detail:'All 24 hours accounted for under the reference web protocol; this is not a measured real-world endurance result.'};
}
export type AlphaContext = {mode:Experience['mode'];usageProfile:string;usageVersion:string;usage?:Usage;powerSource:string;usablePercent:string;calibrationVersion:string};
export type AlphaRun = WorkspaceRun & {context:AlphaContext; endurance?:SimpleEndurance; evidence?:ResolvedPowerEvidence};
export function freezeRun(run:WorkspaceRun,context:AlphaContext,extras?:{endurance?:SimpleEndurance;evidence?:ResolvedPowerEvidence}):AlphaRun {
  const snapshot=structuredClone({...run,context,...(extras?.endurance?{endurance:extras.endurance}:{}),...(extras?.evidence?{evidence:extras.evidence}:{})});
  function freeze(value:unknown){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}}
  freeze(snapshot);return snapshot;
}
