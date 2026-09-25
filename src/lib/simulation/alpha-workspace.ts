import {buildProfile, COMPONENT_WORKLOADS, numeric, WORKLOAD_LABEL, type WorkloadFields, type WorkspaceRun} from './beta-workspace';

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
/** No fitted power model exists in the seed runtime dataset. Never infer watts from usage hours. */
export function simpleProfile(experience:Experience,power:WorkloadFields) {
  const usage=experience.preset==='Custom'?experience.custom:USAGE_PRESETS[experience.preset];
  const derived=deriveUsage(usage);
  const selected={...power};
  for(const key of COMPONENT_WORKLOADS) if(!experience.useEnteredPower||Number(derived.shares[key])===0) selected[key]='';
  const profile=buildProfile(selected,derived.shares,'percent');
  if(derived.issues.length){profile.issues=derived.issues;return profile;}
  if(!experience.useEnteredPower) profile.issues=['Device-specific workload power evidence is not available yet. Your usage pattern is saved. Supply known power values in Advanced and explicitly enable them here, or wait for a validated device power model.',...derived.issues];
  return profile;
}
export type AlphaContext = {mode:Experience['mode'];usageProfile:string;usageVersion:string;usage?:Usage;powerSource:string;usablePercent:string;calibrationVersion:string};
export type AlphaRun = WorkspaceRun & {context:AlphaContext};
export function freezeRun(run:WorkspaceRun,context:AlphaContext):AlphaRun {
  const snapshot=structuredClone({...run,context});
  function freeze(value:unknown){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}}
  freeze(snapshot);return snapshot;
}
