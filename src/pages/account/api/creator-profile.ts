import type { APIRoute } from 'astro';
import { boundedImageForm, matchesImageSignature, MediaRequestError } from '../../../lib/media-upload';
import { avatarExtension, ownedAvatarPath } from '../../../lib/creator-profile';

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
  const fail = (code: string) => new Response(null, { status: 303, headers: { Location: `/account?edit=profile&profile_error=${code}`, 'Cache-Control': 'private, no-store' } });
  if (!locals.access?.active || !locals.access.verified) return fail('verified');
  const client = locals.supabase;
  let uploadedPath: string | null = null;
  const cleanup = async () => {
    if (!uploadedPath) return;
    try { await client.storage.from('profile-images').remove([uploadedPath]); } catch { /* Keep the original error useful. */ }
  };
  try {
    const form = await boundedImageForm(request);
    const displayName = String(form.get('display_name') ?? '').trim();
    const handle = String(form.get('handle') ?? '').trim().toLowerCase();
    const bio = String(form.get('bio') ?? '').trim();
    if (displayName.length < 1 || displayName.length > 60 || !handlePattern.test(handle) || bio.length > 240) return fail('invalid');
    const { data: previous, error: readError } = await client.from('creator_profiles').select('avatar_url').eq('user_id', locals.user.id).maybeSingle();
    if (readError) return fail('save');
    let avatarUrl = previous?.avatar_url ?? null;
    const file = form.get('avatar');
    if (file instanceof File && file.name && file.size === 0) return fail('image');
    if (file instanceof File && file.size > 0) {
      const extension = avatarExtension(file);
      if (!extension) return fail('image');
      const bytes = await file.arrayBuffer();
      if (!matchesImageSignature(new Uint8Array(bytes), file.type)) return fail('image');
      uploadedPath = `${locals.user.id}/${crypto.randomUUID()}.${extension}`;
      const { error } = await client.storage.from('profile-images').upload(uploadedPath, bytes, { contentType: file.type, cacheControl: '31536000', upsert: false });
      if (error) return fail('upload');
      avatarUrl = client.storage.from('profile-images').getPublicUrl(uploadedPath).data.publicUrl;
    }
    const { error } = await client.from('creator_profiles').upsert({ user_id: locals.user.id, display_name: displayName, handle, bio, avatar_url: avatarUrl }, { onConflict: 'user_id' });
    if (error) {
      await cleanup();
      return fail(error.code === '23505' ? 'taken' : 'save');
    }
    // Only delete an obsolete object belonging to this user in our own bucket.
    const oldPath = ownedAvatarPath(previous?.avatar_url, avatarUrl, locals.user.id);
    const replacedPhoto = !!uploadedPath;
    uploadedPath = null; // The profile now owns this image, even if old-image cleanup fails.
    if (replacedPhoto && oldPath) {
      try { await client.storage.from('profile-images').remove([oldPath]); } catch { /* Safe to retry cleanup later. */ }
    }
    return new Response(null, { status: 303, headers: { Location: `/creator/${handle}`, 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    await cleanup();
    return fail(error instanceof MediaRequestError ? 'image' : 'save');
  }
};
