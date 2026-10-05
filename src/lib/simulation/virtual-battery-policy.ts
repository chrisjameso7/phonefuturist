import { z } from 'zod';
import data from '../../../data/virtual-device/battery-evidence.json';
import { USAGE_PRESETS, USAGE_VERSION, ACTIVE_WORKLOADS, deriveUsage } from './alpha-workspace';
import { virtualDeviceConfigurationSchema, type TestConditions, type ParameterKey } from './virtual-device';
import { virtualEvidenceCatalogSchema, deepFreeze, type VirtualEvidenceCatalog } from './virtual-device-evidence';

export const VIRTUAL_BATTERY_POLICY_VERSION = 'battery-transfer-1';
export const virtualBatteryScenarioSchema = z.object({
  usage: z.enum(['Light','Typical','Heavy']), network: z.enum(['wifi','5g']),
  brightnessNits: z.number().positive().max(10000), ambientC: z.number().min(-50).max(100),
}).strict();
export type VirtualBatteryScenario = z.infer<typeof virtualBatteryScenarioSchema>;
export const BATTERY_WORKLOADS = [...ACTIVE_WORKLOADS, 'standby'] as const;
export type VirtualBatteryWorkload = typeof BATTERY_WORKLOADS[number];
export function batteryDailyMinutes(scenario: VirtualBatteryScenario): Record<VirtualBatteryWorkload, number> {
  const usage = USAGE_PRESETS[scenario.usage];
  const derived = deriveUsage(usage);
  if (derived.issues.length) throw new Error('Invalid application usage preset.');
  return { web_browsing:Number(usage.web_browsing), video_playback:Number(usage.video_playback),
    gaming:Number(usage.gaming), camera_use:Number(usage.camera_use), standby:derived.idleMinutes };
}
export function batteryConditions(configuration: z.infer<typeof virtualDeviceConfigurationSchema>, scenario: VirtualBatteryScenario, workload: string): TestConditions {
  return { protocol:'phonefuturist-virtual-battery',version:VIRTUAL_BATTERY_POLICY_VERSION,
    workload, network:scenario.network==='5g'?'cellular':'wifi', brightnessNits:scenario.brightnessNits,
    ambientC:scenario.ambientC, resolution:configuration.deviceContext?.resolution, refreshHz:configuration.deviceContext?.refreshHz,
    capacityBasis:'pack' };
}
export function curatedBatteryEvidence(): VirtualEvidenceCatalog {
  return virtualEvidenceCatalogSchema.parse({...data,relationships:[],policies:[]});
}
/** Application-owned transfer policy, never an AI/client supplied evidence approval. */
export function buildVirtualBatteryCatalog(input: unknown, scenarioInput: unknown,
  evidence: VirtualEvidenceCatalog = curatedBatteryEvidence()): VirtualEvidenceCatalog {
  const configuration = virtualDeviceConfigurationSchema.parse(input);
  const scenario = virtualBatteryScenarioSchema.parse(scenarioInput);
  const catalog = virtualEvidenceCatalogSchema.parse(evidence);
  const device = configuration.deviceContext;
  const capacities = configuration.assertions.filter(a=>a.key==='battery.capacity');
  const capacity = capacities.length===1 ? capacities[0] : undefined;
  // Scope is a physical hypothesis, never recognition of a model name, chipset or brand.
  const eligible = device && device.displayInches>=6.2 && device.displayInches<=7 &&
    device.resolution.width>=1080 && device.resolution.width<=1600 && device.resolution.height>=2200 && device.resolution.height<=3300 &&
    device.refreshHz>=60 && device.refreshHz<=144 && scenario.ambientC>=15 && scenario.ambientC<=30 &&
    scenario.brightnessNits>=100 && scenario.brightnessNits<=700;
  if (!eligible) return deepFreeze({...catalog,relationships:[],policies:[]});
  const records = catalog.records;
  const relationships: VirtualEvidenceCatalog['relationships'] = [...new Set(records.map(r=>r.subjectId))].map(reference=>({
    target:configuration.subjectId,reference,kind:'comparable-device',
    rationale:'Server-curated large slab-phone / compatible pack cohort; hypothetical single-pack OLED smartphone. No SoC performance equivalence claimed.',
  }));
  const policies: VirtualEvidenceCatalog['policies'] = [];
  const common = [
    'User device specifications are conditional inputs, not confirmed product facts.',
    'Assume a new single-pack OLED slab phone; unknown chipset, firmware, radio signal and background activity are not measured.',
    'Transfer envelopes are engineering judgments, not empirical confidence intervals or accuracy guarantees.',
  ];
  const add = (key:ParameterKey, workload:string, min:number,max:number,referenceIds:string[],sourceKeys:ParameterKey[],rationale:string, extra:string[]) => {
    // Genuine evidence shortages leave only this slot/category unresolved.
    if (new Set(records.filter(r=>referenceIds.includes(r.id) && r.lineage==='evidence').map(r=>r.subjectId)).size<2) return;
    policies.push({id:`${VIRTUAL_BATTERY_POLICY_VERSION}:${key}:${workload}`,target:configuration.subjectId,key,
      conditions:batteryConditions(configuration,scenario,workload),allowedRange:{min,max},referenceIds,rationale,
      transfer:{version:VIRTUAL_BATTERY_POLICY_VERSION,sourceKeys,rationale,assumptions:[...common,...extra]},
    });
  };
  const voltageRefs = records.filter(r=>r.key==='battery.nominalVoltage').map(r=>r.id);
  const packRefs = records.filter(r=>r.key==='battery.energy').map(r=>r.id);
  add('battery.nominalVoltage','pack',3.7,4,voltageRefs,['battery.nominalVoltage'],
    'Two compatible aftermarket pack listings report 3.88 V. Broaden to 3.7–4.0 V for an unmeasured future single pack; do not assert OEM identity.',
    ['Aftermarket compatible-pack specifications are reported analogies, not measurements of the target or its OEM battery.']);
  if (capacity && capacity.range.min>=4000 && capacity.range.max<=6500) {
    add('battery.energy','pack',capacity.range.min*3.7/1000,capacity.range.max*4/1000,voltageRefs,['battery.nominalVoltage'],
      'Conditional rated pack energy envelope from the user capacity assertion and reviewed voltage envelope; provider output must preserve both bounds.',
      [`Assume the user-supplied rated pack capacity ${capacity.range.min}–${capacity.range.max} mAh is correct; it is not independently verified.`,
       'Energy depends on the 3.7–4.0 V predicted voltage envelope, not a default nominal voltage.']);
  }
  add('battery.usableFraction','pack',0.85,0.98,packRefs,['battery.energy'],
    'Explicit protection-reserve/cutoff sensitivity envelope for a new pack. Listings establish rated-pack analogies, not this usable fraction.',
    ['Usable fraction 0.85–0.98 is a conservative policy prediction, not a measured efficiency. No separate conversion-efficiency multiplier is assumed.']);
  const ranges: Record<VirtualBatteryWorkload,[number,number]> = {
    web_browsing:[2,5.5],video_playback:[1.5,4],gaming:[3,10],camera_use:[3,8],standby:[0.08,0.5],
  };
  for (const workload of BATTERY_WORKLOADS) {
    const refs=records.filter(r=>r.key==='battery.averagePower' && (workload==='standby' ? r.conditions.workload==='standby' : ['screen-on-idle','load'].includes(r.conditions.workload))).map(r=>r.id);
    add('battery.averagePower',workload,...ranges[workload],refs,['battery.averagePower'],
      'Bracket active draw using source idle/load observations, or standby using standby observations, then apply a conservative target workload envelope. Source tables are not target 5G/500-nit measurements.',
      [`${workload}: battery-side power envelope ${ranges[workload].join('–')} W includes uncertain display, modem, platform and workload costs.`,
       'Source meter location/conversion losses and test conditions do not establish target battery-side draw; transfer uncertainty is explicit.',
       `Target network ${scenario.network}, brightness ${scenario.brightnessNits} nits, ambient ${scenario.ambientC} C; normal signal assumed, no hotspot/navigation/extreme reception.`,
       'Typical means 120 min web, 90 min video, 45 min gaming, 15 min camera and 1170 min standby per 24 hours; no active-only normalization.']);
  }
  return deepFreeze({...catalog,version:`${catalog.version}:${VIRTUAL_BATTERY_POLICY_VERSION}:${USAGE_VERSION}`,relationships,policies});
}
