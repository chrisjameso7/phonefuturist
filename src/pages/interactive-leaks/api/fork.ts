import type { APIRoute } from 'astro';

const redirectBack = (request: Request, path: string) =>
  new Response(null, {
    status: 303,
    headers: { Location: new URL(path, request.url).toString() },
  });

export const POST: APIRoute = async ({ locals, request }) => {
  if (!locals.supabase || !locals.user) return redirectBack(request, '/login');

  const form = await request.formData();
  const kind = form.get('kind');
  const id = form.get('id');
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if ((kind !== 'simulation' && kind !== 'profile') || typeof id !== 'string' || !uuid.test(id)) {
    return new Response('Invalid fork request.', { status: 400 });
  }

  if (kind === 'simulation') {
    const { data: source, error } = await locals.supabase
      .rpc('shared_simulation', { p_id: id });

    if (error || !source) return new Response('Simulation not available.', { status: 404 });

    const { data: forked, error: insertError } = await locals.supabase
      .from('simulations')
      .insert({
        owner_id: locals.user.id,
        name: `${source.name} (fork)`,
        device_key: source.device_key,
        visibility: 'private',
        configuration_source: source.configuration_source,
        processor_key: source.processor_key,
        processor_profile_id: source.processor_profile_id,
        state: source.state,
        result_snapshot: source.result_snapshot,
        forked_from: source.id,
      })
      .select('id')
      .single();

    if (insertError || !forked) return new Response('Could not fork simulation.', { status: 500 });
    return redirectBack(request, `/interactive-leaks/simulation/${forked.id}`);
  }

  const { data: source, error } = await locals.supabase
    .rpc('shared_simulation_profile', { p_id: id });

  if (error || !source) return new Response('Profile not available.', { status: 404 });

  const { data: forked, error: insertError } = await locals.supabase
    .from('simulation_profiles')
    .insert({
      owner_id: locals.user.id,
      name: `${source.name} (fork)`,
      component_kind: source.component_kind,
      component_key: source.component_key,
      visibility: 'private',
      profile_kind: 'custom',
      assumptions: source.assumptions,
      forked_from: source.id,
    })
    .select('id')
    .single();

  if (insertError || !forked) return new Response('Could not fork profile.', { status: 500 });
  return redirectBack(request, `/interactive-leaks/profile/${forked.id}`);
};
