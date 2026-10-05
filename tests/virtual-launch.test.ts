import {describe,it,expect} from 'vitest';
import {acceptanceConfiguration,acceptanceScenario,fixtureProvider,fixtureProposal} from './fixtures/virtual-device';
import {buildVirtualLaunchCatalog} from '../src/lib/simulation/virtual-launch-policy';
import {generateVirtualLaunch} from '../src/lib/simulation/virtual-launch-service';
import {createVirtualDeviceInferenceService,type VirtualDeviceProvider} from '../src/lib/simulation/virtual-device-inference';
import {runVirtualLaunchSuite,launchRequest,thermalStep} from '../src/lib/simulation/virtual-launch-runners';
import {launchResponseSchema,responseMatchesConfiguration,rangeLabel} from '../src/lib/simulation/virtual-launch-client';
import {renderToStaticMarkup} from 'react-dom/server';
import {createElement} from 'react';
import VirtualDeviceWorkspace from '../src/components/interactive-leaks/VirtualDeviceWorkspace';
const now=()=> '2026-10-04T20:00:00Z';
async function generated(provider:VirtualDeviceProvider=fixtureProvider){let n=0;return generateVirtualLaunch({configuration:acceptanceConfiguration(),scenario:acceptanceScenario},provider,now,()=>`id-${++n}`);}
describe('complete launch suite',()=>{
  it('runs all five tests from one model and validates the client response',async()=>{
    const result=await generated();expect(result.status).toBe('complete');if(result.status!=='complete')throw new Error(JSON.stringify(result));
    expect(result.results.map(r=>r.status)).toEqual(Array(5).fill('resolved'));
    expect(result.results.every(r=>r.confidence==='low')).toBe(true);
    const parsed=launchResponseSchema.parse(result);expect(responseMatchesConfiguration(parsed,acceptanceConfiguration())).toBe(true);
    const edited=acceptanceConfiguration();edited.deviceContext!.chipset='Edited';expect(responseMatchesConfiguration(parsed,edited)).toBe(false);
    const charge=result.results.find(r=>r.category==='charging')!;expect(charge.metrics[0].range.max).toBeLessThan(charge.metrics[2].range.max);
    const thermal=result.results.find(r=>r.category==='thermal')!;expect(thermal.temperatureLocation).toBe('junction');expect(thermal.trace!.every(p=>p.temperatureC.min>=25&&p.temperatureC.max<=90.001)).toBe(true);
    expect(JSON.stringify(result)).not.toContain('accuracyPercent');
  });
  it('is deterministic from an accepted frozen revision',async()=>{
    const configuration=acceptanceConfiguration();let id=0;
    const accepted=await createVirtualDeviceInferenceService({catalog:buildVirtualLaunchCatalog(configuration,acceptanceScenario),provider:fixtureProvider,now,createId:()=>`id-${++id}`}).generate(configuration);
    if(accepted.status!=='accepted')throw new Error(JSON.stringify(accepted));
    const req=launchRequest(accepted,acceptanceScenario);
    expect(runVirtualLaunchSuite(accepted,req)).toEqual(runVirtualLaunchSuite(accepted,req));
    expect(runVirtualLaunchSuite(accepted,{...req,modelRevision:9}).status).toBe('invalid');
    expect(runVirtualLaunchSuite(structuredClone(accepted),req).status).toBe('invalid');
  });
  it.each(['cpu','gpu','thermal','charging'] as const)('abstention in %s does not discard a ready battery',async category=>{
    const provider:VirtualDeviceProvider={...fixtureProvider,propose:async request=>{const p=fixtureProposal(request);p.parameters=p.parameters.map(p=>p.key.startsWith(category+'.')?{id:p.id,key:p.key,status:'unknown',reason:'Insufficient support'}:p);return p;}};
    const result=await generated(provider);if(result.status!=='complete')throw new Error(JSON.stringify(result));
    expect(result.results.find(r=>r.category===category)?.status).toBe('unresolved');expect(result.results[0].status).toBe('resolved');
  });
  it('rejects impossible performance outputs before runners execute',async()=>{
    const provider:VirtualDeviceProvider={...fixtureProvider,propose:async request=>{const p=fixtureProposal(request);const cpu=p.parameters.find(p=>p.key==='cpu.singleCore');if(cpu&&cpu.status==='predicted')cpu.range.max=1e12;return p;}};
    expect((await generated(provider)).status).toBe('unavailable');
  });
  it('does not depend on fixture names or chipset matching',()=>{
    const configuration=acceptanceConfiguration();configuration.name='Hypothetical';configuration.deviceContext!.chipset='Unreleased';
    expect(buildVirtualLaunchCatalog(configuration,acceptanceScenario).policies.map(p=>p.allowedRange)).toEqual(buildVirtualLaunchCatalog(acceptanceConfiguration(),acceptanceScenario).policies.map(p=>p.allowedRange));
  });
  it('keeps RC integration stable at large timesteps',()=>{
    expect(thermalStep(25,25,10,4,20,1e9)).toBeCloseTo(65);
    expect(thermalStep(80,25,0,4,20,100)).toBeLessThan(80);
  });
  it('renders accessible Simple Mode controls and five test placeholders',()=>{
    const markup=renderToStaticMarkup(createElement(VirtualDeviceWorkspace,{onAdvanced:()=>{}}));
    expect(markup).toContain('Virtual phone configuration');expect(markup).toContain('aria-live="polite"');expect(markup).toContain('19.5 hours');expect(markup).toContain('Switch to Advanced');
  });
  it('rounds displayed ranges without creating a false point estimate',()=>{
    expect(rangeLabel({min:11.031,max:44.372},'h')).toBe('11.0–44.4 h');
  });
});
