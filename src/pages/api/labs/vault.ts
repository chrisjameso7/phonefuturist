import type { APIRoute } from 'astro';
import { labClient, json, smallJson } from '../../../lib/labs/http';
export const GET: APIRoute = async (context) => {
    const client = labClient(context);
    if (!client)
        return json({ error: 'The concept vault is not configured yet.' }, 503);
    const { data: { user } } = await client.auth.getUser();
    const { data, error } = await client.rpc('lab_vault');
    if (error)
        return json({ error: 'The concept vault is temporarily unavailable.' }, 503);
    return json({ polls: data ?? [], signedIn: !!user });
};
export const POST: APIRoute = async (context) => {
    const client = labClient(context);
    if (!client)
        return json({ error: 'The concept vault is not configured yet.' }, 503);
    const { data: { user } } = await client.auth.getUser();
    if (!user)
        return json({ error: 'Sign in to lock a prediction.' }, 401);
    let body;
    try {
        body = await smallJson(context.request);
    }
    catch {
        return json({ error: 'Invalid prediction request.' }, 400);
    }
    if (!body || typeof body.topic !== 'string' || !/^[0-9a-f-]{36}$/i.test(body.topic) || typeof body.fork !== 'string' || body.fork.length > 120)
        return json({ error: 'Choose a valid design fork.' }, 400);
    const { data, error } = await client.rpc('lab_lock_prediction', { p_topic: body.topic, p_fork: body.fork });
    if (error)
        return json({ error: error.code === '23505' ? 'You already locked a prediction for this poll.' : error.code === '42501' ? 'A verified active account is required.' : 'This poll is closed or the selection is unavailable.' }, error.code === '42501' ? 403 : 409);
    return json({ id: data }, 201);
};
