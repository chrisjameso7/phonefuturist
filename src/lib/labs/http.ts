import type { APIContext } from 'astro';
import { settings, serverClient } from '../supabase';
export const LAB_PROJECT = 'ehldokmrgahrlcoyidjy';
export function labClient(context: APIContext) {
    const config = settings();
    if (!config)
        return null;
    // Fail closed rather than write profile data into an unrelated configured project.
    if (new URL(config.url).hostname !== LAB_PROJECT + '.supabase.co' && !['localhost', '127.0.0.1'].includes(new URL(config.url).hostname))
        return null;
    return context.locals.supabase ?? serverClient(context.cookies, context.request);
}
export const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'private, no-store' } });
export async function smallJson(request: Request) {
    if (!request.headers.get('content-type')?.startsWith('application/json'))
        throw new Error('Use JSON.');
    const reader = request.body?.getReader();
    if (!reader)
        throw new Error('Request body missing.');
    let size = 0;
    const chunks: Uint8Array[] = [];
    while (true) {
        const { done, value } = await reader.read();
        if (done)
            break;
        size += value.length;
        if (size > 8192) {
            await reader.cancel();
            throw new Error('Request too large.');
        }
        chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.length;
    }
    return JSON.parse(new TextDecoder().decode(bytes));
}
