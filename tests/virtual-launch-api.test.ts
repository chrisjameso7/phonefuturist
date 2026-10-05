import {beforeEach,describe,it,expect,vi} from 'vitest';
import {acceptanceConfiguration,acceptanceScenario,fixtureProvider} from './fixtures/virtual-device';
const mocks=vi.hoisted(()=>({settings:vi.fn(),provider:vi.fn()}));
vi.mock('../src/lib/simulation/inference-settings',()=>({virtualDeviceInferenceSettings:mocks.settings}));
vi.mock('../src/lib/simulation/providers/google-virtual-device-provider',()=>({createGoogleVirtualDeviceProvider:mocks.provider}));
import {POST} from '../src/pages/api/simulation/virtual-device';
beforeEach(()=>{mocks.settings.mockReturnValue({accountId:'fixture',apiToken:'fixture',model:'fixture'});mocks.provider.mockReturnValue(fixtureProvider);});
const body=()=>({configuration:acceptanceConfiguration(),scenario:acceptanceScenario});
let n=0;
async function call(payload:unknown=body(),options:{user?:boolean;active?:boolean;verified?:boolean;id?:string;raw?:string}={}){
  const request=new Request('https://example.com/api/simulation/virtual-device',{method:'POST',headers:{'Content-Type':'application/json','Origin':'https://example.com'},body:options.raw??JSON.stringify(payload)});
  return POST({request,locals:{user:options.user===false?null:{id:options.id??`user-${++n}`},access:{active:options.active??true,verified:options.verified??true}}} as Parameters<typeof POST>[0]);
}
describe('authenticated Virtual Device endpoint',()=>{
  it('returns all five results from one real service/model invocation',async()=>{
    const spy=vi.fn(fixtureProvider.propose);mocks.provider.mockReturnValue({...fixtureProvider,propose:spy});
    const response=await call();expect(response.status).toBe(200);expect(response.headers.get('cache-control')).toBe('private, no-store');
    const result=await response.json();expect(result.results).toHaveLength(5);expect(spy).toHaveBeenCalledTimes(1);
  });
  it.each([{user:false,status:401},{active:false,status:403},{verified:false,status:403}])('rejects unauthorized accounts %j',async options=>expect((await call(body(),options)).status).toBe(options.status));
  it('rejects client authority, evidence and submitted artifacts',async()=>expect((await call({...body(),model:{accepted:true},evidence:[]})).status).toBe(400));
  it('bounds streaming request bodies',async()=>expect((await call(null,{raw:'x'.repeat(33000)})).status).toBe(413));
  it('rejects malformed JSON',async()=>expect((await call(null,{raw:'{'})).status).toBe(400));
  it('handles missing configuration without leaking secrets',async()=>{mocks.settings.mockReturnValue(null);expect((await call()).status).toBe(503);});
  it('sanitizes provider failures',async()=>{mocks.provider.mockImplementation(()=>{throw new Error('secret provider diagnostic');});const response=await call();expect(response.status).toBe(502);expect(await response.text()).not.toContain('secret');});
  it('limits repeated generations per signed-in account',async()=>{const id='rate-test';expect((await call(body(),{id})).status).toBe(200);expect((await call(body(),{id})).status).toBe(429);});
});
