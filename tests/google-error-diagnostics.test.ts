import {describe,it,expect,vi} from 'vitest';
import {summarizeGoogleError,readGoogleError} from '../src/lib/simulation/providers/google-error-diagnostics';
import {createGoogleVirtualDeviceProvider} from '../src/lib/simulation/providers/google-virtual-device-provider';
import {generateVirtualLaunch} from '../src/lib/simulation/virtual-launch-service';
import {acceptanceConfiguration,acceptanceScenario} from './fixtures/virtual-device';
describe('sanitized upstream diagnostics',()=>{
 it('preserves Google UNAVAILABLE without exposing echoed prompt or credential',()=>{
  const result=summarizeGoogleError({error:{code:503,status:'UNAVAILABLE',message:'High demand; secret-key private-prompt https://private.example'}});
  expect(result).toMatchObject({upstreamCode:503,upstreamStatus:'UNAVAILABLE',category:'capacity'});expect(JSON.stringify(result)).not.toMatch(/secret-key|private/);
 });
 it('does not invent quota involvement from a bare 503',()=>expect(summarizeGoogleError({error:{code:503}}).category).toBe('unknown'));
 it('distinguishes quota from capacity',()=>expect(summarizeGoogleError({error:{code:429,status:'RESOURCE_EXHAUSTED',message:'account 123 quota'}}).category).toBe('quota_or_rate_limit'));
 it('bounds error bodies and handles HTML or malformed JSON',async()=>{
  for(const body of ['<html>secret</html>','x'.repeat(17000)])expect((await readGoogleError(new Response(body))).category).toBe('unknown');
 });
 it.each(['AbortError','TimeoutError'])('does not convert %s into an HTTP status',async name=>{
  const warn=vi.spyOn(console,'warn').mockImplementation(()=>{});
  try {
   const provider=createGoogleVirtualDeviceProvider({provider:'gemini',apiKey:'test',model:'gemini-3.8-flash'},async()=>{throw new DOMException('private',name);});
   await generateVirtualLaunch({configuration:acceptanceConfiguration(),scenario:acceptanceScenario},provider);
   const output=JSON.stringify(warn.mock.calls);expect(output).toContain('provider_timeout');expect(output).not.toMatch(/httpStatus|private/);
  } finally{warn.mockRestore();}
 });
 it('logs the actual 503, safe Google category, and request bytes for the full Unknown fixture',async()=>{
  const warn=vi.spyOn(console,'warn').mockImplementation(()=>{});
  try {
   const configuration=acceptanceConfiguration();configuration.deviceContext={...configuration.deviceContext!,chipset:'Unknown',cooling:'Unknown',software:'Unknown'};
   const fetcher=vi.fn<typeof fetch>().mockResolvedValue(Response.json({error:{code:503,status:'UNAVAILABLE',message:'Model is overloaded private-key'}},{status:503}));
   const provider=createGoogleVirtualDeviceProvider({provider:'gemini',apiKey:'private-key',model:'gemini-3.8-flash'},fetcher);
   expect((await generateVirtualLaunch({configuration,scenario:acceptanceScenario},provider)).status).toBe('unavailable');
   const entry=JSON.parse(String(warn.mock.calls[0][0]));expect(entry).toMatchObject({code:'provider_http',httpStatus:503,upstream:{upstreamStatus:'UNAVAILABLE',category:'capacity'}});expect(entry.upstream.requestBytes).toBeGreaterThan(0);
   const body=JSON.parse(String(fetcher.mock.calls[0][1]?.body));expect(body.generationConfig).toEqual({responseMimeType:'application/json',maxOutputTokens:32768});expect(body.generationConfig).not.toHaveProperty('responseSchema');expect(JSON.stringify(warn.mock.calls)).not.toContain('private-key');
  }finally{warn.mockRestore();}
 });
});
