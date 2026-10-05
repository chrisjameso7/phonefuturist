import data from '../../../data/virtual-device/launch-evidence.json';
import { buildVirtualBatteryCatalog, curatedBatteryEvidence, virtualBatteryScenarioSchema } from './virtual-battery-policy';
import { virtualDeviceConfigurationSchema, type ParameterKey, type TestConditions } from './virtual-device';
import { deepFreeze, virtualEvidenceCatalogSchema, type VirtualEvidenceCatalog } from './virtual-device-evidence';
export const LAUNCH_POLICY_VERSION='launch-model-1';
export function launchConditions(workload:string, ambientC:number, extra:Partial<TestConditions>={}):TestConditions {
  return {protocol:'phonefuturist-virtual-tests',version:LAUNCH_POLICY_VERSION,workload,ambientC,...extra};
}
export function buildVirtualLaunchCatalog(input:unknown,scenarioInput:unknown):VirtualEvidenceCatalog {
  const config=virtualDeviceConfigurationSchema.parse(input),scenario=virtualBatteryScenarioSchema.parse(scenarioInput);
  const battery=curatedBatteryEvidence();
  const catalog=buildVirtualBatteryCatalog(config,scenario,virtualEvidenceCatalogSchema.parse({version:`${battery.version}:${data.version}`,records:[...battery.records,...data.records],relationships:[],policies:[]}));
  if(!catalog.policies.length)return catalog;
  const policies=structuredClone(catalog.policies);
  const add=(key:ParameterKey,range:[number,number],conditions:TestConditions,refs:string[],sourceKeys:ParameterKey[],rationale:string)=>{
    if(new Set(catalog.records.filter(r=>refs.includes(r.id)).map(r=>r.subjectId)).size<2)return;
    policies.push({id:`${LAUNCH_POLICY_VERSION}:${key}:${conditions.workload}:${conditions.temperatureLocation??''}:${conditions.stateOfCharge??''}`,target:config.subjectId,key,conditions,
      allowedRange:{min:range[0],max:range[1]},referenceIds:refs,rationale,
      transfer:{version:LAUNCH_POLICY_VERSION,sourceKeys,rationale,assumptions:[
        'Conditional flagship-class hypothesis; the supplied chipset name is not verified and earns no automatic performance uplift.',
        'Expected ranges are conservative engineering transfer envelopes, not statistical confidence intervals or measured accuracy.',rationale,
      ]}});
  };
  const cpu=launchConditions('cpu-burst',scenario.ambientC);
  for(const [key,range] of [['cpu.singleCore',[2000,3800]],['cpu.multiCore',[6000,12000]]] as const)
    add(key,[...range],cpu,[`nc-s24-${key}`,`nc-s25-${key}`],[key],'PF CPU v1 predicts a Geekbench-6-family-equivalent burst range from published scores. It is not a Geekbench execution or a claim of exact patch-version equivalence.');
  const loads=['nc-s24-load','nc-s25-load'];
  add('cpu.power',[3,8],cpu,loads,['battery.averagePower'],'Component attribution is predicted from whole-system power anchors; core counts and clocks are not score predictors.');
  const gpuRefs=['nc-galaxy-s25-ultra-aztec','nc-honor-magic7-pro-aztec'];
  for(const [workload,resolution,quality,range,power] of [
    ['gpu-synthetic',{width:2560,height:1440},'High Tier offscreen',[60,130],[4,10]],
    ['gaming-balanced',{width:1920,height:1080},'PF generic raster scene, medium, 60 FPS cap',[40,60],[3,8]],
    ['gaming-demanding',{width:2560,height:1440},'PF generic raster scene, high, 120 FPS cap',[30,75],[4,10]],
  ] as const){
    const conditions=launchConditions(workload,scenario.ambientC,{resolution,quality});
    add('gpu.frameRate',[...range],conditions,gpuRefs,['gpu.frameRate'],'PF GPU v1 uses published Aztec High offscreen anchors; generic gaming scenes are explicit transfer scenarios, not predictions for named commercial games.');
    add('gpu.power',[...power],conditions,loads,['battery.averagePower'],'GPU power is a bounded component attribution from system-load observations, not a measured GPU rail.');
  }
  for(const location of ['junction','battery'] as const){
    const conditions=launchConditions(location==='junction'?'sustained-combined':'charging',scenario.ambientC,{temperatureLocation:location});
    add('thermal.resistance',location==='junction'?[3,6]:[1,3],conditions,loads,['battery.averagePower'],'Lumped RC resistance is a policy sensitivity assumption; source load power does not measure thermal resistance. No surface/junction/battery equivalence is asserted.');
    add('thermal.capacitance',location==='junction'?[10,30]:[100,250],conditions,loads,['battery.averagePower'],'Lumped RC heat capacity is a bounded engineering prediction, not a material measurement.');
    add('thermal.throttleTemperature',location==='junction'?[70,90]:[40,45],conditions,loads,['battery.averagePower'],'The controller threshold is a hypothetical operating policy, not a manufacturer safety limit or hardware rating.');
    if(location==='junction')add('thermal.sustainedPower',[4,7],conditions,loads,['battery.averagePower'],'Sustained combined power is a conservative controller budget for the flagship-class hypothesis.');
  }
  const chargingRefs=['nc-s24-charging','nc-s25-charging'];
  const charging=launchConditions('charging',scenario.ambientC);
  add('charging.peakPower',[25,45],charging,chargingRefs,['charging.peakPower'],'Device input limit is predicted from 45 W comparables; use a separate 45 W compatible charger test condition.');
  add('charging.efficiency',[0.75,0.93],charging,chargingRefs,['charging.peakPower'],'End-to-end charging efficiency is a conservative policy sensitivity range, not measured adapter/cell efficiency.');
  for(const [soc,range] of [[0,[12,30]],[0.5,[8,20]],[0.8,[3,10]],[0.95,[1,4]]] as const)
    add('charging.acceptedPower',[...range],{...charging,stateOfCharge:soc},chargingRefs,['charging.peakPower'],'Piecewise battery-side accepted-power taper is a predicted controller envelope. Final 100% means modeled usable capacity, not a measured CV termination time.');
  // The complete-use gaming envelope includes the same CPU/GPU/system budget used by sustained stress.
  const gaming=policies.find(p=>p.key==='battery.averagePower' && p.conditions.workload==='gaming');
  if(gaming){
    gaming.allowedRange={min:7.08,max:18.5};
    gaming.rationale='Combined gaming power envelope uses CPU 3–8 W + GPU 4–10 W + system overhead 0.08–0.5 W from this same reviewed model.';
    if(gaming.transfer)gaming.transfer.assumptions=[...gaming.transfer.assumptions.filter(a=>!a.startsWith('gaming:')),gaming.rationale];
  }
  return deepFreeze({...catalog,version:`${catalog.version}:${LAUNCH_POLICY_VERSION}`,policies});
}
