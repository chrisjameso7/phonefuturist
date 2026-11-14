import type { GenerateJson } from './engine';
import { object } from './validation';
export type ValuationEnvironment = {
    AI_VALUATION_ENABLED?: unknown;
    BOM_VALUATION_MODEL?: unknown;
    VIRTUAL_DEVICE_MODEL?: unknown;
    CLOUDFLARE_ACCOUNT_ID?: unknown;
    CLOUDFLARE_AI_API_TOKEN?: unknown;
    AI_VALUATION_LIMITER?: {
        limit(options: {
            key: string;
        }): Promise<{
            success: boolean;
        }>;
    };
};
/** Server-only adapter. No credentials, model identity or raw provider error crosses the route. */
export function cloudflareGenerator(env: ValuationEnvironment, fetcher: typeof fetch = fetch): GenerateJson | undefined {
    const model = env.BOM_VALUATION_MODEL ?? env.VIRTUAL_DEVICE_MODEL, account = env.CLOUDFLARE_ACCOUNT_ID, token = env.CLOUDFLARE_AI_API_TOKEN;
    if (env.AI_VALUATION_ENABLED !== 'true' || typeof model !== 'string' || !model || typeof account !== 'string' || !/^[a-f0-9]{32}$/i.test(account) || typeof token !== 'string' || !token)
        return;
    return async (request) => {
        const response = await fetcher('https://api.cloudflare.com/client/v4/accounts/' + encodeURIComponent(account) + '/ai/v1/chat/completions', {
            method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + token }, signal: AbortSignal.timeout(20000),
            body: JSON.stringify({ model, stream: false, max_completion_tokens: 2500, temperature: .1, messages: [{ role: 'system', content: request.system }, { role: 'user', content: request.prompt }], response_format: { type: 'json_schema', json_schema: { name: 'phonefuturist_hardware_analysis', strict: false, schema: request.schema } }, chat_template_kwargs: { enable_thinking: false } }),
        });
        if (!response.ok)
            throw new Error('Provider unavailable.');
        // Read in bounded chunks: missing/forged content-length must not permit an unbounded response.
        const reader = response.body?.getReader();
        if (!reader)
            throw new Error('Empty provider response.');
        const chunks: Uint8Array[] = [];
        let length = 0;
        while (true) {
            const { done, value } = await reader.read();
            if (done)
                break;
            length += value.length;
            if (length > 48000) {
                await reader.cancel();
                throw new Error('Provider response too large.');
            }
            chunks.push(value);
        }
        const bytes = new Uint8Array(length);
        let offset = 0;
        for (const chunk of chunks) {
            bytes.set(chunk, offset);
            offset += chunk.length;
        }
        const envelope = object(JSON.parse(new TextDecoder().decode(bytes))), choices = envelope.choices;
        if (!Array.isArray(choices) || !choices.length)
            throw new Error('Missing completion.');
        const choice = object(choices[0]), message = object(choice.message);
        if (choice.finish_reason !== 'stop' || typeof message.content !== 'string' || !message.content)
            throw new Error('Incomplete completion.');
        return message.content;
    };
}
