import {describe,it,expect} from 'vitest';
import {acceptanceConfiguration,acceptanceScenario,fixtureProvider,fixtureProposal} from './fixtures/virtual-device';
import {buildVirtualBatteryCatalog,curatedBatteryEvidence,batteryDailyMinutes} from '../src/lib/simulation/virtual-battery-policy';
import {createVirtualDeviceInferenceService,type AcceptedVirtualDevice,type VirtualDeviceProvider} from '../src/lib/simulation/virtual-device-inference';
import {runVirtualBattery,type VirtualBatteryRunRequest} from '../src/lib/simulation/virtual-battery-runner';
import {simulateBatteryExperience} from '../src/lib/simulation/modules/battery-experience';
async function generate(evidence=curatedBatteryEvidence(),provider:VirtualDeviceProvider=fixtureProvider) {
  let id=0;const configuration=acceptanceConfiguration();
  const result=await createVirtualDeviceInferenceService({catalog:buildVirtualBatteryCatalog(configuration,acceptanceScenario,evidence),provider,now:()=> '2026-10-04T20:00:00Z',createId:()=>`id-${++id}`}).generate(configuration);
  if(result.status!=='accepted')throw new Error(JSON.stringify(result));
  return result;
}
function request(a:AcceptedVirtualDevice):VirtualBatteryRunRequest{return {currentConfiguration:a.configuration,modelId:a.model.modelId,modelRevision:a.model.revision,evidenceSnapshotId:a.evidence.snapshot.id,evidenceSnapshotRevision:a.evidence.snapshotRevision,scenario:acceptanceScenario};}
describe('Virtual battery vertical slice',()=>{
  it('runs the unreleased acceptance fixture through the real deterministic engine',async()=>{
    const a=await generate();const result=runVirtualBattery(a,request(a));
    expect(result.status).toBe('resolved');if(result.status!=='resolved')throw new Error(JSON.stringify(result));
    expect(result.kind).toBe('predicted-endurance');expect(result.modelConfidence).toBe('low');
    expect(result.expectedRangeHours.min).toBeGreaterThan(8);expect(result.expectedRangeHours.max).toBeGreaterThan(result.expectedRangeHours.min);
    expect(result.calculation).toEqual(simulateBatteryExperience(result.receipt.engineInput));
    expect(result.receipt.dailyMinutes.standby).toBe(1170);
    expect(result.receipt.engineInput.workloads.standby?.weight).toBe(1170);
    expect(result.parameters.find(p=>p.key==='battery.energy')?.status).toBe('predicted');
    expect(a.configuration.assertions[0].origin).toBe('user-supplied');expect(Object.isFrozen(result.receipt)).toBe(true);
    expect(runVirtualBattery(a,request(a))).toEqual(result);
    console.log('S27 Pro test-only battery output',JSON.stringify(result.expectedRangeHours),'confidence',result.modelConfidence);
  });
  it.each(['Light','Typical','Heavy'] as const)('%s preserves a full day including standby',usage=>{
    const minutes=batteryDailyMinutes({...acceptanceScenario,usage});expect(Object.values(minutes).reduce((a,b)=>a+b,0)).toBe(1440);expect(minutes.standby).toBeGreaterThan(0);
  });
  it('does not let a missing standby observation silently disappear',async()=>{
    const evidence=curatedBatteryEvidence();evidence.records=evidence.records.filter(r=>r.id!=='nc-s24-standby');
    const a=await generate(evidence);const r=runVirtualBattery(a,request(a));expect(r.status).toBe('unresolved');if(r.status!=='resolved')expect(r.issues.join(' ')).toContain('standby');
    expect(a.model.parameters.some(p=>p.key==='battery.energy'&&p.status==='predicted')).toBe(true);
  });
  it('does not invent voltage when pack evidence is inadequate',async()=>{
    const evidence=curatedBatteryEvidence();evidence.records=evidence.records.filter(r=>r.key!=='battery.nominalVoltage');
    const a=await generate(evidence);expect(runVirtualBattery(a,request(a)).status).toBe('unresolved');
  });
  it.each(['configuration','model','snapshot','scenario','same-revision-edited-config'])('rejects stale/mismatched %s',async kind=>{
    const a=await generate();const r=structuredClone(request(a));
    if(kind==='configuration')r.currentConfiguration.revision++;
    if(kind==='model')r.modelRevision++;
    if(kind==='snapshot')r.evidenceSnapshotRevision++;
    if(kind==='scenario')r.scenario.brightnessNits=600;
    if(kind==='same-revision-edited-config')r.currentConfiguration.name='Changed';
    expect(runVirtualBattery(a,r).status).not.toBe('resolved');
  });
  it('cannot run a forged or deserialized accepted artifact',async()=>{
    const a=await generate();expect(runVirtualBattery(structuredClone(a),request(a)).status).toBe('invalid');
  });
  it('rejects impossible provider energy without clamping',async()=>{
    const provider:VirtualDeviceProvider={...fixtureProvider,propose:async input=>{const p=fixtureProposal(input);const e=p.parameters.find(p=>p.key==='battery.energy');if(e&&e.status==='predicted')e.range.max=900;return p;}};
    await expect(generate(undefined,provider)).rejects.toThrow();
  });
  it('requires explicit transfer assumptions in the proposal',async()=>{
    const provider:VirtualDeviceProvider={...fixtureProvider,propose:async input=>{const p=fixtureProposal(input);p.parameters.forEach(p=>{if(p.status==='predicted')p.assumptions=['omitted'];});return p;}};
    await expect(generate(undefined,provider)).rejects.toThrow(/assumptions/);
  });
  it('can reuse the generic policy for a different device name and chipset',()=>{
    const config=acceptanceConfiguration();config.name='Another hypothetical phone';config.deviceContext!.chipset='Unknown future silicon';
    expect(buildVirtualBatteryCatalog(config,acceptanceScenario).policies.length).toBeGreaterThan(0);
  });
  it('does not extrapolate outside reviewed physical scope',()=>{
    const config=acceptanceConfiguration();config.deviceContext!.displayInches=12;
    expect(buildVirtualBatteryCatalog(config,acceptanceScenario).policies).toEqual([]);
  });
});
