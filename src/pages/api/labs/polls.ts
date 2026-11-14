import type { APIRoute } from 'astro';
import { labClient, json, smallJson } from '../../../lib/labs/http';
export const POST: APIRoute = async (context) => {
    const client = labClient(context);
    if (!client)
        return json({ error: 'Labs storage unavailable.' }, 503);
    const { data: { user } } = await client.auth.getUser();
    if (!user)
        return json({ error: 'Sign in required.' }, 401);
    let body;
    try {
        body = await smallJson(context.request);
    }
    catch {
        return json({ error: 'Invalid JSON request.' }, 400);
    }
    if (body?.action === 'create') {
        if (typeof body.topic !== 'string' || body.topic.length < 5 || body.topic.length > 300 || !Array.isArray(body.forks) || body.forks.length < 2 || body.forks.length > 4 || body.forks.some((f: unknown) => typeof f !== 'string' || !f.trim() || f.length > 120) || new Set(body.forks).size !== body.forks.length || !Number.isFinite(Date.parse(body.closesAt)))
            return json({ error: 'Check the topic, unique forks and closing date.' }, 400);
        const { data, error } = await client.rpc('lab_create_poll', { p_topic: body.topic, p_forks: body.forks, p_closes: body.closesAt });
        if (error)
            return json({ error: 'Only authorized editors can create valid future polls.' }, 403);
        return json({ id: data }, 201);
    }
    if (body?.action === 'resolve') {
        if (typeof body.topic !== 'string' || typeof body.winner !== 'string' || typeof body.source !== 'string' || body.source.length > 2000)
            return json({ error: 'Topic, winning fork and source required.' }, 400);
        try {
            if (new URL(body.source).protocol !== 'https:')
                throw new Error();
        }
        catch {
            return json({ error: 'Use an HTTPS resolution source.' }, 400);
        }
        const { error } = await client.rpc('lab_resolve_poll', { p_topic: body.topic, p_winner: body.winner, p_source: body.source });
        if (error)
            return json({ error: 'Resolution requires editor access and a closed, unresolved poll.' }, 403);
        return json({ ok: true });
    }
    return json({ error: 'Unknown action.' }, 400);
};
