import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest';
import {createGoogleVirtualDeviceProvider} from '../src/lib/simulation/providers/google-virtual-device-provider';
import * as sanity from '../src/lib/simulation/virtual-device-sanity';
import {generateVirtualLaunch} from '../src/lib/simulation/virtual-launch-service';
import {acceptanceConfiguration,acceptanceScenario,fixtureProposal} from './fixtures/virtual-device';
beforeEach(()=>{vi.spyOn(console,'info').mockImplementation(()=>{});vi.spyOn(console,'warn').mockImplementation(()=>{});});
afterEach(()=>vi.restoreAllMocks());
type Outcome='success'|'malformed'|'provenance'|'parse'|number;
async function run(outcomes:Outcome[]){
 const bodies:string[]=[];const urls:string[]=[];const wait=vi.fn(async(_milliseconds:number)=>{});
 const fetcher=vi.fn<typeof fetch>(async(url,init)=>{
  urls.push(String(url));bodies.push(String(init?.body));const outcome=outcomes[urls.length-1];
  if(typeof outcome==='number')return Response.json({error:{code:outcome,status:outcome===503?'UNAVAILABLE':outcome===429?'RESOURCE_EXHAUSTED':'PERMISSION_DENIED',message:'Model overloaded'}},{status:outcome});
  const request=JSON.parse(JSON.parse(String(init?.body)).contents[0].parts[0].text);
  const proposal=fixtureProposal(request);
  if(outcome==='provenance')proposal.parameters[0].id='invented-id';
  const text=outcome==='malformed'?'not JSON':outcome==='parse'?'{}':JSON.stringify(proposal);
  return Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text}]}}]});
 });
 const configuration=acceptanceConfiguration();configuration.deviceContext={...configuration.deviceContext!,chipset:'Unknown',cooling:'Unknown',software:'Unknown'};
 const result=await generateVirtualLaunch({configuration,scenario:acceptanceScenario},createGoogleVirtualDeviceProvider({provider:'gemini',apiKey:'secret-test-key',model:'gemini-3.8-flash'},fetcher,wait));
 return {result,bodies,urls,wait,fetcher};
}
describe('Gemini capacity-only resilience',()=>{
 it('3.8 succeeds immediately',async()=>{const r=await run(['success']);expect(r.urls).toHaveLength(1);expect(r.wait).not.toHaveBeenCalled();expect(r.result.status).toBe('complete');});
 it('3.8 retries once after 503 with bounded delay',async()=>{const r=await run([503,'success']);expect(r.urls).toHaveLength(2);expect(r.wait).toHaveBeenCalledExactlyOnceWith(750);expect(r.urls.every(url=>url.includes('gemini-3.8-flash'))).toBe(true);expect(r.result.status).toBe('complete');});
 it('3.8 twice then 3.7 succeeds; same request and correct immutable receipt',async()=>{
  const r=await run([503,503,'success']);expect(r.urls).toHaveLength(3);expect(r.urls[2]).toContain('gemini-3.7-flash');expect(new Set(r.bodies).size).toBe(1);expect(r.wait).toHaveBeenCalledTimes(1);
  expect(r.result.status).toBe('complete');if(r.result.status==='complete'){
   expect(r.result.receipt.model.generation).toMatchObject({model:'gemini:gemini-3.7-flash',fallback:{preferredModel:'gemini:gemini-3.8-flash',reason:'transient-provider-capacity'}});
   expect(Object.isFrozen(r.result.receipt.model)).toBe(true);
  }
  expect(JSON.stringify(vi.mocked(console.info).mock.calls)).not.toContain('secret-test-key');
 });
 it('does not retry a bare 503 without Google UNAVAILABLE',async()=>{const fetcher=vi.fn<typeof fetch>().mockResolvedValue(new Response('Unavailable',{status:503}));const wait=vi.fn(async()=>{});await generateVirtualLaunch({configuration:acceptanceConfiguration(),scenario:acceptanceScenario},createGoogleVirtualDeviceProvider({provider:'gemini',apiKey:'test',model:'gemini-3.8-flash'},fetcher,wait));expect(fetcher).toHaveBeenCalledTimes(1);expect(wait).not.toHaveBeenCalled();});
 it('stops after failed fallback',async()=>{const r=await run([503,503,503]);expect(r.urls).toHaveLength(3);expect(r.result.status).toBe('unavailable');});
 it.each([429,401,403,400,500,'malformed','parse','provenance'] as const)('does not retry or fallback for %s',async outcome=>{const r=await run([outcome]);expect(r.urls).toHaveLength(1);expect(r.wait).not.toHaveBeenCalled();expect(r.result.status).toBe('unavailable');});
 it('does not retry after engineering validation rejects a valid proposal',async()=>{vi.spyOn(sanity,'validateVirtualEngineering').mockReturnValue(['Contradictory engineering parameters.']);const r=await run(['success']);expect(r.urls).toHaveLength(1);expect(r.result.status).toBe('unavailable');});
 it('records preferred model after successful retry without a fallback claim',async()=>{
  const r=await run([503,'success']);if(r.result.status!=='complete')throw new Error('Expected accepted model');
  expect(r.result.receipt.model.generation.model).toBe('gemini:gemini-3.8-flash');expect(r.result.receipt.model.generation.fallback).toBeUndefined();
 });
});
