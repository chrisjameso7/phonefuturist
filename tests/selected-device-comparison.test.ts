import { expect, it } from 'vitest';
import { percentageDifference, selectedBenchmarkReference, selectableComparisonPhones, comparableBatteryHours } from '../src/lib/simulation/modules/selected-device-comparison';
import type { DeviceCorpus } from '../src/lib/simulation/modules/device-corpus';
import type { BatteryExperienceInput, BatteryExperienceResult } from '../src/lib/simulation/modules/battery-experience-engine';
import type { PeakPerformanceEstimate } from '../src/lib/simulation/modules/peak-performance-estimator';
const corpus: DeviceCorpus = {version:'test', sources:[{id:'lab',publisher:'Lab',url:'https://example.test',protocolVersion:'6.7'}], devices:[{variant:{id:'phone',identity:{manufacturer:'A',family:'A',modelName:'Phone'}}}], measurements:[{id:'cpu',deviceVariantId:'phone',workload:'benchmark',metric:'geekbench_6_7_multi_core',value:1000,unit:'points',sourceId:'lab',evidenceKind:'measured'}]};
it('reports positive and negative changes relative to the chosen baseline', () => {
  expect(percentageDifference(1500,1000)).toBe(50);
  expect(percentageDifference(800,1000)).toBeCloseTo(-20);
  expect(percentageDifference(101,100)).toBeCloseTo(1);
});
it('withholds missing, nonpositive and nonfinite denominators', () => {
  for(const value of [undefined,0,-1,Infinity,NaN]) expect(percentageDifference(100,value)).toBeUndefined();
});
it('only compares the exact selected phone and matching benchmark version', () => {
  const estimate = {status:'resolved',domain:'geekbench6_multi',protocolKey:'geekbench_6_7_multi_core::6.7::points'} as PeakPerformanceEstimate;
  expect(selectedBenchmarkReference(corpus,'phone',estimate)).toBe(1000);
  expect(selectedBenchmarkReference(corpus,'other',estimate)).toBeUndefined();
  expect(selectedBenchmarkReference(corpus,'phone',{...estimate,protocolKey:'geekbench_6_7_multi_core::6.6::points'})).toBeUndefined();
  expect(selectedBenchmarkReference({...corpus,measurements:corpus.measurements.map(m=>({...m,evidenceKind:'inferred'}))},'phone',estimate)).toBeUndefined();
});
it('excludes future and unverified phones from the menu and avoids duplicate labels', () => {
  const base=corpus.devices[0];
  expect(selectableComparisonPhones({...corpus,devices:[base,{...base,variant:{...base.variant,id:'copy'}},{...base,releaseDate:'2099-01-01',variant:{...base.variant,id:'future'}},{...base,catalogTrust:'source-backed-unverified',variant:{...base.variant,id:'unverified'}}]},'2026-10-26')).toHaveLength(1);
});
const conditions: BatteryExperienceInput = {simulation:{formFactor:'phone',displays:{primary:{}}},dailyUseHours:{web_browsing:1}};
function battery(protocol: string): BatteryExperienceResult {return {version:'test',status:'resolved',warnings:[],runtimes:[{workload:'web_browsing',status:'resolved',protocol,protocolVersion:'1',energyBasis:'mah'}],mixedUse:{expectedActiveUseHoursPerCharge:10} as BatteryExperienceResult['mixedUse']};}
it('withholds battery-life percentages across incompatible test protocols or energy bases', () => {
  const a=battery('lab-a');const b=battery('lab-a');
  expect(comparableBatteryHours(a,b,conditions)).toBe(10);
  expect(comparableBatteryHours(a,battery('lab-b'),conditions)).toBeUndefined();
  b.runtimes[0].energyBasis='wh';expect(comparableBatteryHours(a,b,conditions)).toBeUndefined();
  expect(comparableBatteryHours(a,b,{...conditions,dailyUseHours:{gaming:1}})).toBeUndefined();
});
