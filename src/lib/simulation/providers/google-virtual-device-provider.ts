import { buildCompactVirtualPrompt, expandCompactProposal, compactResponseSchema, COMPACT_PROTOCOL_VERSION } from '../virtual-device-compact';
import { readGoogleError } from './google-error-diagnostics';
import { VirtualProviderError } from '../virtual-diagnostics';
import { z } from 'zod';
import { buildVirtualDevicePrompt } from '../virtual-device-prompt';
import type { VirtualDeviceProvider, VirtualDeviceProposalRequest, VirtualProviderProposal } from '../virtual-device-inference';

export type GoogleVirtualSettings =
  | { provider: 'gemini'; apiKey: string; model: string }
  | { provider: 'gemma'; accountId: string; apiToken: string; model: string };
const geminiResponse = z.object({ candidates: z.array(z.object({
  finishReason: z.literal('STOP'), content: z.object({ parts: z.array(z.object({ text: z.string().optional(), thought: z.boolean().optional() })) }),
})).length(1) });
const gemmaResponse = z.object({ choices:z.array(z.object({finish_reason:z.literal('stop'),message:z.object({content:z.string().min(1),refusal:z.null().optional()})})).length(1) });

/** Transport only: all returned JSON remains untrusted until the shared service validates it. */
function createSingleAttemptProvider(settings: GoogleVirtualSettings, fetchImpl: typeof fetch = globalThis.fetch): VirtualDeviceProvider {
  if (!settings.model.trim() || (settings.provider === 'gemini' ? !settings.apiKey.trim() : !settings.accountId.trim() || !settings.apiToken.trim())) throw new Error('Missing provider configuration.');
  return {
    providerId: settings.provider, modelId: `${settings.provider}:${settings.model}`,
    async propose(request) {
      const prompt = settings.provider==='gemma'?buildCompactVirtualPrompt(request):buildVirtualDevicePrompt(request);
      const gemini = settings.provider === 'gemini';
      const url = settings.provider === 'gemini'
        ? `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(settings.model)}:generateContent`
        : `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(settings.accountId)}/ai/v1/chat/completions`;
      const headers = new Headers({ 'Content-Type': 'application/json' });
      if (settings.provider === 'gemini') headers.set('x-goog-api-key', settings.apiKey);
      else headers.set('Authorization', `Bearer ${settings.apiToken}`);
      const started=Date.now();
      const body = JSON.stringify(gemini ? {
        systemInstruction: { parts: [{ text: prompt.system }] }, contents: [{ role: 'user', parts: [{ text: prompt.user }] }],
        generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 32768 },
      } : { model:settings.model,messages: [{ role: 'system', content: prompt.system }, { role: 'user', content: prompt.user }], stream: false, max_completion_tokens: 6144,response_format:{type:'json_schema',json_schema:{name:'virtual_device_assessment',strict:true,schema:compactResponseSchema(request)}},chat_template_kwargs:{enable_thinking:false} });
      let response: Response;
      try { response = await fetchImpl(url, {
        method: 'POST', headers, signal: AbortSignal.timeout(60000),
        body,
      }); } catch(error) {
        throw new VirtualProviderError(error instanceof Error && (error.name==='TimeoutError'||error.name==='AbortError') ? 'provider_timeout' : 'provider_transport');
      }
      if (!response.ok) {
        const diagnostic=gemini ? await readGoogleError(response) : {category:'unknown' as const,message:'Upstream error details withheld.'};
        throw new VirtualProviderError('provider_http', response.status, {...diagnostic,requestBytes:new TextEncoder().encode(body).byteLength,elapsedMs:Date.now()-started});
      }
      // Bound the response without including provider diagnostics or secrets in errors.
      const reader = response.body?.getReader(); if (!reader) throw new VirtualProviderError('provider_response_format');
      let text = ''; let length = 0; const decoder = new TextDecoder();
      try { while (true) { const next = await reader.read(); if (next.done) break; length += next.value.byteLength; if (length > 524288) { await reader.cancel(); throw new VirtualProviderError('provider_response_size'); } text += decoder.decode(next.value, { stream: true }); } text += decoder.decode(); } finally { reader.releaseLock(); }
      let envelope: unknown;
      try { envelope = JSON.parse(text); } catch { throw new VirtualProviderError('provider_response_format'); }
      let output: string;
      try { output = gemini ? geminiResponse.parse(envelope).candidates[0].content.parts.filter(part => !part.thought).map(part => part.text ?? '').join('') : gemmaResponse.parse(envelope).choices[0].message.content; } catch { throw new VirtualProviderError('provider_response_format'); }
      console.info(JSON.stringify({event:'virtual_provider_payload',protocol:gemini?'full-v1':COMPACT_PROTOCOL_VERSION,requestBytes:new TextEncoder().encode(body).byteLength,responseBytes:length,outputBytes:new TextEncoder().encode(output).byteLength,elapsedMs:Date.now()-started}));
      let parsedOutput:unknown;try { parsedOutput=JSON.parse(output); } catch { throw new VirtualProviderError('model_json'); }
      if(gemini)return parsedOutput;
      try {return expandCompactProposal(parsedOutput,request);}catch{throw new VirtualProviderError('model_contract');}
    },
  };
}

/** Per-call metadata avoids cross-request model attribution races. No validation failure is retried. */
export function createGoogleVirtualDeviceProvider(
  settings: GoogleVirtualSettings,
  fetchImpl: typeof fetch = globalThis.fetch,
  wait: (milliseconds:number)=>Promise<void> = milliseconds => new Promise(resolve=>setTimeout(resolve,milliseconds)),
): VirtualDeviceProvider {
  const preferred = createSingleAttemptProvider(settings,fetchImpl);
  async function proposeWithMetadata(request:VirtualDeviceProposalRequest):Promise<VirtualProviderProposal> {
    const started=Date.now();
    const resilient=settings.provider==='gemini' && settings.model==='gemini-3.8-flash';
    const models=resilient?['gemini-3.8-flash','gemini-3.8-flash','gemini-3.7-flash']:[settings.model];
    for(let attempt=0;attempt<models.length;attempt++) {
      if(attempt===1)await wait(750);
      const model=models[attempt];
      // Only fixed approved identifiers are logged; arbitrary configuration strings are never echoed.
      const logModel=resilient||model==='@cf/google/gemma-4-26b-a4b-it'?model:'configured-model';
      console.info(JSON.stringify({event:'virtual_provider_attempt',phase:attempt===0?'preferred':attempt===1?'retry':'fallback',attempt:attempt+1,model:logModel,elapsedMs:Date.now()-started}));
      try {
        const provider=attempt===0?preferred:createSingleAttemptProvider({...settings,model},fetchImpl);
        const output=await provider.propose(request);
        console.info(JSON.stringify({event:'virtual_provider_success',model:logModel,attempt:attempt+1,elapsedMs:Date.now()-started}));
        return {output,modelId:provider.modelId,...(settings.provider==='gemma'?{promptVersion:COMPACT_PROTOCOL_VERSION}:{}),...(attempt===2?{fallback:{preferredModel:preferred.modelId,reason:'transient-provider-capacity' as const}}:{})};
      } catch(error) {
        const capacity=error instanceof VirtualProviderError && error.code==='provider_http' && error.httpStatus===503 && error.diagnostic?.upstreamStatus==='UNAVAILABLE' && (error.diagnostic.category==='capacity'||error.diagnostic.category==='unavailable');
        if(!resilient||!capacity||attempt===models.length-1)throw error;
      }
    }
    throw new Error('Provider attempts exhausted.');
  }
  return {providerId:preferred.providerId,modelId:preferred.modelId,proposeWithMetadata,async propose(request){return (await proposeWithMetadata(request)).output;}};
}
