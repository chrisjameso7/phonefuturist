import { describe, it, expect, vi } from 'vitest';
import { createGoogleVirtualDeviceProvider } from '../src/lib/simulation/providers/google-virtual-device-provider';
import { generateVirtualLaunch } from '../src/lib/simulation/virtual-launch-service';
import { acceptanceConfiguration, acceptanceScenario, fixtureProposal } from './fixtures/virtual-device';

const input = () => { const configuration=acceptanceConfiguration(); configuration.deviceContext={...configuration.deviceContext!,chipset:'Unknown',cooling:'Unknown',software:'Unknown'}; return {configuration,scenario:acceptanceScenario}; };
describe('Virtual Device Google transports', () => {
  it('logs malformed model JSON without exposing model text',async()=>{
    const warn=vi.spyOn(console,'warn').mockImplementation(()=>{});
    try {
      const fetcher=vi.fn<typeof fetch>().mockResolvedValue(Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:'private malformed provider output'}]}}]}));
      const adapter=createGoogleVirtualDeviceProvider({provider:'gemini',apiKey:'private-key',model:'gemini-3.8-flash'},fetcher);
      expect((await generateVirtualLaunch(input(),adapter)).status).toBe('unavailable');
      const logs=JSON.stringify(warn.mock.calls);expect(logs).toContain('model_json');expect(logs).not.toContain('private');
    } finally {warn.mockRestore();}
  });

  it.each(['gemini', 'gemma'] as const)('completes all five tests through the %s transport', async provider => {
    const fetcher: typeof fetch = async (_url, init) => {
      const body = JSON.parse(String(init?.body));
      if(provider==='gemma'){expect(body.chat_template_kwargs.enable_thinking).toBe(false);expect(body.max_completion_tokens).toBe(6144);expect(body.response_format.type).toBe('json_schema');expect(body.response_format.json_schema.schema.properties.decisions.additionalProperties).toBe(false);}
      const request = JSON.parse(provider === 'gemini' ? body.contents[0].parts[0].text : body.messages[1].content);
      const output = JSON.stringify(provider==='gemini'?fixtureProposal(request):{assessments:Object.fromEntries(['battery','cpu','gpu','thermal','charging'].map(d=>[d,'Test-only assessment.'])),decisions:Object.fromEntries(request.slots.filter((s:{decisionKey?:string})=>s.decisionKey).map((s:{decisionKey:string})=>[s.decisionKey,'predict'])),limitations:['Test fixture']});
      return Response.json(provider === 'gemini' ? {candidates:[{finishReason:'STOP',content:{parts:[{text:output}]}}]} : {choices:[{finish_reason:'stop',message:{content:output}}]});
    };
    const adapter = createGoogleVirtualDeviceProvider(provider === 'gemini' ? {provider,apiKey:'test',model:'gemini-3.8-flash'} : {provider,accountId:'test',apiToken:'test',model:'@cf/google/gemma-4-26b-a4b-it'},fetcher);
    const result = await generateVirtualLaunch(input(),adapter);
    expect(result.status).toBe('complete');
    if(result.status==='complete') expect(result.results.every(test=>test.status==='resolved')).toBe(true);
  });
  it.each(['gemini', 'gemma'] as const)('uses the %s endpoint and keeps invalid proposals untrusted', async provider => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json(provider === 'gemini'
      ? {candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({parameters:[],limitations:[]})}]}}]}
      : {choices:[{finish_reason:'stop',message:{content:JSON.stringify({parameters:[],limitations:[]})}}]}));
    const adapter = createGoogleVirtualDeviceProvider(provider === 'gemini'
      ? {provider,apiKey:'test-key',model:'gemini-3.8-flash'}
      : {provider,apiToken:'test-token',accountId:'test-account',model:'@cf/google/gemma-4-26b-a4b-it'}, fetcher);
    expect((await generateVirtualLaunch(input(),adapter)).status).toBe('unavailable');
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(String(fetcher.mock.calls[0][0])).toContain(provider === 'gemini' ? ':generateContent' : '/ai/v1/chat/completions');
    expect(String(fetcher.mock.calls[0][0])).not.toContain('test-key');
  });
  it.each([429,500])('does not retry or switch providers on HTTP %s',async status=>{
    const fetcher=vi.fn<typeof fetch>().mockResolvedValue(new Response('secret diagnostic',{status}));
    const adapter=createGoogleVirtualDeviceProvider({provider:'gemini',apiKey:'test',model:'gemini-3.8-flash'},fetcher);
    expect((await generateVirtualLaunch(input(),adapter)).status).toBe('unavailable');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it.each(['length','content_filter'])('rejects incomplete Gemma output: %s',async finish_reason=>{const fetcher=vi.fn<typeof fetch>().mockResolvedValue(Response.json({choices:[{finish_reason,message:{content:'{}'}}]}));const adapter=createGoogleVirtualDeviceProvider({provider:'gemma',accountId:'test',apiToken:'test',model:'@cf/google/gemma-4-26b-a4b-it'},fetcher);expect((await generateVirtualLaunch(input(),adapter)).status).toBe('unavailable');expect(fetcher).toHaveBeenCalledTimes(1);});
  it.each(['MAX_TOKENS','SAFETY'])('rejects incomplete Gemini output: %s',async finishReason=>{
    const fetcher=vi.fn<typeof fetch>().mockResolvedValue(Response.json({candidates:[{finishReason,content:{parts:[{text:'{}'}]}}]}));
    const adapter=createGoogleVirtualDeviceProvider({provider:'gemini',apiKey:'test',model:'gemini-3.8-flash'},fetcher);
    expect((await generateVirtualLaunch(input(),adapter)).status).toBe('unavailable');
  });
});
