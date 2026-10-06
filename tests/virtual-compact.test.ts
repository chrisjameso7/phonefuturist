import liveResponse from './fixtures/gemma-compact-live.json';
import {describe,it,expect} from 'vitest';
import {buildCompactVirtualPrompt,expandCompactProposal} from '../src/lib/simulation/virtual-device-compact';
import {buildVirtualLaunchCatalog} from '../src/lib/simulation/virtual-launch-policy';
import {assembleVirtualEvidence,deepFreeze} from '../src/lib/simulation/virtual-device-evidence';
import {createVirtualDeviceInferenceService} from '../src/lib/simulation/virtual-device-inference';
import {acceptanceConfiguration,acceptanceScenario} from './fixtures/virtual-device';
const config=acceptanceConfiguration();const catalog=buildVirtualLaunchCatalog(config,acceptanceScenario);
function request(){return deepFreeze({configuration:config,evidence:assembleVirtualEvidence(config,catalog,'snapshot','2026-10-06T00:00:00Z')});}
function proposal(){return {assessments:Object.fromEntries(['battery','cpu','gpu','thermal','charging'].map(domain=>[domain,'Plausible conditional transfer; unmeasured target.'])),decisions:Object.fromEntries(request().evidence.slots.flatMap((s,i)=>s.fixed?[]:[[`p${i}`,'predict']])),limitations:['Test-only assessment']};}
describe('compact model assessment',()=>{
 it('accepts the captured 2026-10-06 real Gemma assessment without relaxing validators',async()=>{const service=createVirtualDeviceInferenceService({catalog,now:()=> '2026-10-06T00:00:00Z',createId:()=>crypto.randomUUID(),provider:{providerId:'gemma-captured-fixture',modelId:'gemma-4-26b-a4b-it',async propose(actual){return expandCompactProposal(liveResponse,actual);}}});expect((await service.generate(config)).status).toBe('accepted');});
 it('reconstructs all mandatory provenance without copying it through AI',async()=>{
  const r=request(),before=JSON.stringify(r),output=expandCompactProposal(proposal(),r);
  expect(JSON.stringify(r)).toBe(before);expect(output.parameters).toHaveLength(r.evidence.slots.length);
  for(const p of output.parameters)if(p.status==='predicted'){
   expect(p.confidence).toBe('low');expect(p.evidence.length).toBeGreaterThan(0);
   const policy=r.evidence.reviewedPolicies.find(a=>a.id===p.analogyAssessmentId)!;
   for(const a of policy.transfer?.assumptions??[])expect(p.assumptions).toContain(a);
  }
  const service=createVirtualDeviceInferenceService({catalog,now:()=> '2026-10-06T00:00:00Z',createId:()=>crypto.randomUUID(),provider:{providerId:'fixture',modelId:'fixture',async propose(actual){return expandCompactProposal(proposal(),actual);}}});
  expect((await service.generate(config)).status).toBe('accepted');
 });
 it.each(['status','missing','extra','fixed','authority'] as const)('rejects %s decisions',kind=>{
  const p=proposal();const key=Object.keys(p.decisions)[0];if(kind==='status')p.decisions[key]='measured';if(kind==='missing')delete p.decisions[key];if(kind==='extra')p.decisions.p999='predict';
  if(kind==='fixed')p.decisions[`p${request().evidence.slots.findIndex(s=>s.fixed)}`]='predict';
  const input=kind==='authority'?{...p,evidence:[{status:'measured'}]}:p;
  expect(()=>expandCompactProposal(input,request())).toThrow();
 });
 it('does not auto-fill a rejected AI prediction',()=>{const p=proposal();const key=Object.keys(p.decisions)[0];p.decisions[key]='unknown';const output=expandCompactProposal(p,request());expect(output.parameters[Number(key.slice(1))].status).toBe('unknown');});
 it('keeps original source records and operating conditions visible in the compact prompt',()=>{
  const r=request(),prompt=JSON.parse(buildCompactVirtualPrompt(r).user);expect(prompt.evidence).toEqual(r.evidence.snapshot.records);expect(prompt.configuration).toEqual(config);
  expect(Buffer.byteLength(buildCompactVirtualPrompt(r).user)).toBeLessThan(40000);
 });
});
