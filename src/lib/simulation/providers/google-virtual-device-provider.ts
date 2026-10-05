import { z } from 'zod';
import { buildVirtualDevicePrompt } from '../virtual-device-prompt';
import type { VirtualDeviceProvider } from '../virtual-device-inference';

export type GoogleVirtualSettings =
  | { provider: 'gemini'; apiKey: string; model: string }
  | { provider: 'gemma'; accountId: string; apiToken: string; model: string };
const geminiResponse = z.object({ candidates: z.array(z.object({
  finishReason: z.literal('STOP'), content: z.object({ parts: z.array(z.object({ text: z.string().optional(), thought: z.boolean().optional() })) }),
})).length(1) });
const gemmaResponse = z.object({ success: z.literal(true), result: z.object({ response: z.string().min(1) }) });

/** Transport only: all returned JSON remains untrusted until the shared service validates it. */
export function createGoogleVirtualDeviceProvider(settings: GoogleVirtualSettings, fetchImpl: typeof fetch = globalThis.fetch): VirtualDeviceProvider {
  if (!settings.model.trim() || (settings.provider === 'gemini' ? !settings.apiKey.trim() : !settings.accountId.trim() || !settings.apiToken.trim())) throw new Error('Missing provider configuration.');
  return {
    providerId: settings.provider, modelId: `${settings.provider}:${settings.model}`,
    async propose(request) {
      const prompt = buildVirtualDevicePrompt(request);
      const gemini = settings.provider === 'gemini';
      const url = settings.provider === 'gemini'
        ? `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(settings.model)}:generateContent`
        : `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(settings.accountId)}/ai/run/${settings.model.split('/').map(encodeURIComponent).join('/')}`;
      const headers = new Headers({ 'Content-Type': 'application/json' });
      if (settings.provider === 'gemini') headers.set('x-goog-api-key', settings.apiKey);
      else headers.set('Authorization', `Bearer ${settings.apiToken}`);
      const response = await fetchImpl(url, {
        method: 'POST', headers, signal: AbortSignal.timeout(60000),
        body: JSON.stringify(gemini ? {
          systemInstruction: { parts: [{ text: prompt.system }] }, contents: [{ role: 'user', parts: [{ text: prompt.user }] }],
          generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 32768 },
        } : { messages: [{ role: 'system', content: prompt.system }, { role: 'user', content: prompt.user }], stream: false, max_tokens: 32768 }),
      });
      if (!response.ok) throw new Error(`Virtual device provider HTTP ${response.status}.`);
      // Bound the response without including provider diagnostics or secrets in errors.
      const reader = response.body?.getReader(); if (!reader) throw new Error('Empty provider response.');
      let text = ''; let length = 0; const decoder = new TextDecoder();
      try { while (true) { const next = await reader.read(); if (next.done) break; length += next.value.byteLength; if (length > 524288) { await reader.cancel(); throw new Error('Provider response too large.'); } text += decoder.decode(next.value, { stream: true }); } text += decoder.decode(); } finally { reader.releaseLock(); }
      const envelope: unknown = JSON.parse(text);
      const output = gemini ? geminiResponse.parse(envelope).candidates[0].content.parts.filter(part => !part.thought).map(part => part.text ?? '').join('') : gemmaResponse.parse(envelope).result.response;
      return JSON.parse(output);
    },
  };
}
