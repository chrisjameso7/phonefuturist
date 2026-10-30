import type { APIRoute } from 'astro';

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'private, no-store',
    },
  });

const handlePattern = /^[a-z0-9_]{3,24}$/;

export const GET: APIRoute = async ({ locals }) => {
  if (!locals.supabase || !locals.user) return json({ error: 'Sign in required.' }, 401);

  const { data, error } = await locals.supabase
    .from('creator_profiles')
    .select('handle,display_name,bio,avatar_url,created_at,updated_at')
    .eq('user_id', locals.user.id)
    .maybeSingle();

  if (error) return json({ error: 'Could not load creator profile.' }, 500);
  return json({ data });
};

export const POST: APIRoute = async ({ locals, request }) => {
  if (!locals.supabase || !locals.user) return json({ error: 'Sign in required.' }, 401);

  const form = await request.formData();
  const displayName = String(form.get('display_name') ?? '').trim();
  const handle = String(form.get('handle') ?? '').trim().toLowerCase();
  const bio = String(form.get('bio') ?? '').trim();

  if (displayName.length < 1 || displayName.length > 60) return json({ error: 'Display name must be 1 to 60 characters.' }, 400);
  if (!handlePattern.test(handle)) return json({ error: 'Handle must be 3 to 24 lowercase letters, numbers, or underscores.' }, 400);
  if (bio.length > 240) return json({ error: 'Bio must be 240 characters or fewer.' }, 400);

  const { error } = await locals.supabase
    .from('creator_profiles')
    .upsert({
      user_id: locals.user.id,
      display_name: displayName,
      handle,
      bio,
    }, { onConflict: 'user_id' });

  if (error) {
    if (error.code === '23505') return json({ error: 'That handle is already taken.' }, 409);
    return json({ error: 'Could not save creator profile.' }, 500);
  }

  if(request.headers.get('accept')?.includes('application/json')) return json({saved:true,handle});

  return new Response(null, {
    status: 303,
    headers: { Location: new URL(`/creator/${handle}`, request.url).toString() },
  });
};
