import { z } from 'zod';
import { virtualDeviceConfigurationSchema, toLegacyParameter, type VirtualParameter } from './virtual-device';
import { isAcceptedVirtualDevice, type AcceptedVirtualDevice } from './virtual-device-inference';
import { canonical, deepFreeze, sameConditions } from './virtual-device-evidence';
import { BATTERY_WORKLOADS, batteryDailyMinutes, batteryConditions, virtualBatteryScenarioSchema,
  VIRTUAL_BATTERY_POLICY_VERSION, type VirtualBatteryWorkload } from './virtual-battery-policy';
import { simulateBatteryExperience, type BatteryExperienceInput } from './modules/battery-experience';
import { USAGE_VERSION } from './alpha-workspace';

export const VIRTUAL_BATTERY_RUNNER_VERSION = '1.0.0';
export const virtualBatteryRunRequestSchema = z.object({
  currentConfiguration: virtualDeviceConfigurationSchema,
  modelId: z.string().min(1), modelRevision:z.number().int().positive(),
  evidenceSnapshotId:z.string().min(1), evidenceSnapshotRevision:z.number().int().positive(),
  scenario:virtualBatteryScenarioSchema,
}).strict();
export type VirtualBatteryRunRequest = z.infer<typeof virtualBatteryRunRequestSchema>;
type KnownParameter = Exclude<VirtualParameter,{status:'unknown'}>;
type Ready = {status:'ready'; accepted:AcceptedVirtualDevice; request:VirtualBatteryRunRequest;
  energy:KnownParameter; usable:KnownParameter; powers:Array<{workload:VirtualBatteryWorkload;minutes:number;parameter:KnownParameter}>};
type NotReady = {status:'invalid'|'unresolved'; issues:string[]};

/** Only genuine in-process accepted receipts are runnable. This is not a persisted-model trust mechanism. */
export function evaluateVirtualBatteryReadiness(accepted:unknown, input:unknown): Ready | NotReady {
  if (!isAcceptedVirtualDevice(accepted)) return {status:'invalid',issues:['A server-accepted model receipt is required.']};
  const parsed=virtualBatteryRunRequestSchema.safeParse(input);
  if (!parsed.success) return {status:'invalid',issues:parsed.error.issues.map(i=>`${i.path.join('.')}: ${i.message}`)};
  const request=parsed.data;
  if (canonical(request.currentConfiguration)!==canonical(accepted.configuration) || request.modelId!==accepted.model.modelId || request.modelRevision!==accepted.model.revision ||
    request.evidenceSnapshotId!==accepted.evidence.snapshot.id || request.evidenceSnapshotRevision!==accepted.evidence.snapshotRevision)
    return {status:'invalid',issues:['Stale or mismatched configuration, model or evidence snapshot revision.']};
  const known=accepted.model.parameters.filter((p):p is KnownParameter=>p.status!=='unknown');
  const find=(key:KnownParameter['key'],workload:string)=>{
    const conditions=batteryConditions(accepted.configuration,request.scenario,workload);
    const matches=known.filter(p=>p.key===key && sameConditions(p.conditions,conditions));
    return matches.length===1?matches[0]:undefined;
  };
  const energy=find('battery.energy','pack'), usable=find('battery.usableFraction','pack');
  const issues:string[]=[];
  if (!energy) issues.push('Rated energy is unknown or ambiguous at these conditions.');
  if (!usable) issues.push('Usable fraction is unknown or ambiguous; no full-pack default is applied.');
  const minutes=batteryDailyMinutes(request.scenario);
  const powers:Ready['powers']=[];
  for(const workload of BATTERY_WORKLOADS) {
    if(minutes[workload]===0) continue;
    const parameter=find('battery.averagePower',workload);
    if(!parameter) issues.push(`${workload} power is unknown or ambiguous; its duration is not discarded.`);
    else powers.push({workload,minutes:minutes[workload],parameter});
  }
  if (issues.length || !energy || !usable) return {status:'unresolved',issues};
  return {status:'ready',accepted,request,energy,usable,powers};
}

export function adaptVirtualBatteryToExperience(ready: Ready): BatteryExperienceInput {
  const input:BatteryExperienceInput={energy:{totalEnergyWh:toLegacyParameter(ready.energy),
    usablePercent:{range:{min:ready.usable.range.min*100,max:ready.usable.range.max*100},provenance:toLegacyParameter(ready.usable)?.provenance}},workloads:{},workloadOrder:[]};
  for(const {workload,minutes,parameter} of ready.powers) {
    const power=toLegacyParameter(parameter);
    if (!power) throw new Error('Readiness invariant violated.');
    input.workloads[workload]={weight:minutes,subsystems:{workloadSpecific:{whole_device:power}}};
    input.workloadOrder?.push(workload);
  }
  return input;
}

/** Runs only the existing deterministic BatteryExperience engine; no endurance formula lives here. */
export function runVirtualBattery(accepted:unknown, input:unknown) {
  const readiness=evaluateVirtualBatteryReadiness(accepted,input);
  if(readiness.status!=='ready') return readiness;
  const engineInput=adaptVirtualBatteryToExperience(readiness);
  const calculation=simulateBatteryExperience(engineInput);
  const bounds=calculation.result.estimate?.runtimeHours;
  if(calculation.result.status!=='resolved' || bounds?.min===undefined || bounds.max===undefined)
    return {status:'unresolved' as const,issues:[calculation.result.unresolved?.message ?? 'The deterministic engine could not establish both endurance bounds.']};
  const {model,evidence,configuration}=readiness.accepted;
  const required=[readiness.energy,readiness.usable,...readiness.powers.map(p=>p.parameter)];
  const used=new Set(required.map(p=>p.id));
  // Include transitive dependencies so derived/predicted lineage is reproducible.
  const visit=(p:KnownParameter)=>{for(const id of p.dependencies){if(used.has(id))continue;used.add(id);const dep=model.parameters.find(q=>q.id===id);if(dep && dep.status!=='unknown')visit(dep);}};
  required.forEach(visit);
  const parameters=model.parameters.filter(p=>used.has(p.id));
  const refs=new Set(parameters.flatMap(p=>p.status==='unknown'?[]:p.evidence.map(r=>`${r.id}@${r.revision}`)));
  const assumptions=[...new Set([
    ...parameters.flatMap(p=>p.status==='predicted'?[p.rationale,...p.assumptions]:p.status==='derived'?[p.rationale]:[]),
    'Runtime is elapsed time for a repeating complete 24-hour usage mixture, not continuous screen-on time.',
    'Bounds propagate conservative input envelopes; no distribution or statistical coverage probability is claimed.',
  ])];
  const predicted=parameters.some(p=>p.status==='predicted'||(p.status==='derived'&&p.lineage==='predicted'));
  return deepFreeze({status:'resolved' as const,kind:predicted?'predicted-endurance' as const:'evidence-based-endurance' as const,
    expectedRangeHours:{min:bounds.min,max:bounds.max},
    modelConfidence:predicted?'low' as const:'not-assessed' as const,
    evidenceQuality:predicted?'analogical-with-explicit-transfer-assumptions' as const:'direct-or-derived' as const,
    readiness:'ready' as const,assumptions,
    parameters,comparables:evidence.snapshot.records.filter(r=>refs.has(`${r.id}@${r.revision}`)),
    // Engine confidence grades numerical/provenance completeness, not prediction correctness.
    calculation,
    receipt:{schemaVersion:'1.0.0',runnerVersion:VIRTUAL_BATTERY_RUNNER_VERSION,engineVersion:calculation.result.engineVersion,
      usageVersion:USAGE_VERSION,policyVersion:VIRTUAL_BATTERY_POLICY_VERSION,
      configuration,configurationRevision:configuration.revision,modelId:model.modelId,modelRevision:model.revision,
      evidenceSnapshotId:evidence.snapshot.id,evidenceSnapshotRevision:evidence.snapshotRevision,
      conditions:readiness.request.scenario,dailyMinutes:batteryDailyMinutes(readiness.request.scenario),
      parameters,assumptions,uncertainty:{kind:'prediction-envelope',expectedRangeHours:{min:bounds.min,max:bounds.max}},
      engineInput,acceptedModel:model,evidence,
    },
  });
}
