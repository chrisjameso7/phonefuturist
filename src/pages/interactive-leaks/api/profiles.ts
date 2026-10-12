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
  if (raw.length > 150_000) throw new Error('too_large');
  return JSON.parse(raw) as Record<string, unknown>;
}

export const GET: APIRoute = async ({ locals, url }) => {
  if (!locals.supabase || !locals.user) return json({ error: 'Sign in to view saved profiles.' }, 401);

  const id = url.searchParams.get('id');
  if (id) {
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuid.test(id)) return json({ error: 'Invalid profile ID.' }, 400);

    const { data, error } = await locals.supabase
      .from('simulation_profiles')
      .select('id,name,component_kind,component_key,visibility,profile_kind,assumptions,forked_from,created_at,updated_at')
      .eq('owner_id', locals.user.id)
      .eq('id', id)
      .maybeSingle();

    if (error) return json({ error: 'Could not load profile.' }, 500);
    if (!data) return json({ error: 'Profile not found.' }, 404);
    return json({ data });
  }

  const { data, error } = await locals.supabase
    .from('simulation_profiles')
    .select('id,name,component_kind,component_key,visibility,profile_kind,assumptions,forked_from,created_at,updated_at')
    .eq('owner_id', locals.user.id)
    .order('updated_at', { ascending: false })
    .limit(50);

  if (error) return json({ error: 'Could not load profiles.' }, 500);
  return json({ data });
};

export const POST: APIRoute = async ({ locals, request }) => {
  if (!locals.supabase || !locals.user) return json({ error: 'Sign in to save profiles.' }, 401);

  let input: Record<string, unknown>;
  try {
    input = await readBody(request);
  } catch {
    return json({ error: 'Invalid request.' }, 400);
  }

  const name = typeof input.name === 'string' ? input.name.trim() : '';
  const componentKey = typeof input.componentKey === 'string' ? input.componentKey.slice(0, 120) : '';
  const visibility = input.visibility === 'public' || input.visibility === 'unlisted' ? input.visibility : 'private';
  const assumptions = input.assumptions && typeof input.assumptions === 'object' ? input.assumptions : {};

  if (!name || name.length > 120) return json({ error: 'Profile name must be 1 to 120 characters.' }, 400);
  if (!componentKey) return json({ error: 'A component is required.' }, 400);

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
    .from('simulation_profiles')
    .insert({
      owner_id: locals.user.id,
      name,
      component_kind: 'processor',
      component_key: componentKey,
      visibility,
      profile_kind: 'custom',
      assumptions,
    })
    .select('id,name,visibility,profile_kind,updated_at')
    .single();

  if (error) return json({ error: 'Could not save profile.' }, 500);
  return json({ data }, 201);
};
