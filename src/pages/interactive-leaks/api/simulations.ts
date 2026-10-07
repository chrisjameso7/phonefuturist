import type { APIRoute } from 'astro';

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'private, no-store',
    },
  });

async function readBody(request: Request) {
  const raw = await request.text();
  if (raw.length > 250_000) throw new Error('too_large');
  return JSON.parse(raw) as Record<string, unknown>;
}

export const GET: APIRoute = async ({ locals, url }) => {
  if (!locals.supabase || !locals.user) return json({ error: 'Sign in to view saved simulations.' }, 401);

  const id = url.searchParams.get('id');
  if (id) {
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuid.test(id)) return json({ error: 'Invalid simulation ID.' }, 400);

    const { data, error } = await locals.supabase
      .from('simulations')
      .select('id,name,device_key,visibility,configuration_source,processor_key,state,result_snapshot,created_at,updated_at')
      .eq('owner_id', locals.user.id)
      .eq('id', id)
      .maybeSingle();

    if (error) return json({ error: 'Could not load simulation.' }, 500);
    if (!data) return json({ error: 'Simulation not found.' }, 404);
    return json({ data });
  }

  const { data, error } = await locals.supabase
    .from('simulations')
    .select('id,name,device_key,visibility,configuration_source,processor_key,state,result_snapshot,created_at,updated_at')
    .eq('owner_id', locals.user.id)
    .order('updated_at', { ascending: false })
    .limit(50);

  if (error) return json({ error: 'Could not load saved simulations.' }, 500);
  return json({ data });
};

export const POST: APIRoute = async ({ locals, request }) => {
  if (!locals.supabase || !locals.user) return json({ error: 'Sign in to save simulations.' }, 401);

  let input: Record<string, unknown>;
  try {
    input = await readBody(request);
  } catch {
    return json({ error: 'Invalid request.' }, 400);
  }

  const name = typeof input.name === 'string' ? input.name.trim() : '';
  const visibility = input.visibility === 'public' || input.visibility === 'unlisted' ? input.visibility : 'private';
  const configurationSource =
    input.configurationSource === 'likely' || input.configurationSource === 'worst' || input.configurationSource === 'custom'
      ? input.configurationSource
      : 'custom';
  const deviceKey = typeof input.deviceKey === 'string' ? input.deviceKey.trim().slice(0, 180) : '';
  const processorKey = typeof input.processorKey === 'string' ? input.processorKey.slice(0, 120) : null;
  const state = input.state && typeof input.state === 'object' ? input.state : {};
  const resultSnapshot = input.resultSnapshot && typeof input.resultSnapshot === 'object' ? input.resultSnapshot : null;

  if (!name || name.length > 120) return json({ error: 'Simulation name must be 1 to 120 characters.' }, 400);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(deviceKey)) return json({ error: 'Pick a valid device before saving.' }, 400);

  if (visibility === 'public') {
    const { data: creator, error: creatorError } = await locals.supabase
      .from('creator_profiles')
      .select('user_id')
      .eq('user_id', locals.user.id)
      .maybeSingle();
    if (creatorError) return json({ error: 'Could not verify creator profile.' }, 500);
    if (!creator) return json({ error: 'Create your public creator profile before publishing.' }, 409);
  }

  const { data, error } = await locals.supabase
    .from('simulations')
    .insert({
      owner_id: locals.user.id,
      name,
      device_key: deviceKey,
      visibility,
      configuration_source: configurationSource,
      processor_key: processorKey,
      state,
      result_snapshot: resultSnapshot,
    })
    .select('id,name,visibility,updated_at')
    .single();

  if (error) return json({ error: 'Could not save simulation.' }, 500);
  return json({ data }, 201);
};
