import type { APIRoute } from 'astro';
import { boundedImageForm, matchesImageSignature, MediaRequestError } from '../../../lib/media-upload';
import { json } from '../../../lib/labs/http';

export const POST: APIRoute = async context => {
  if (!context.locals.access?.roles.includes('admin') || !context.locals.supabase || !context.locals.user) {
    return json({ error: 'Admin access required.' }, 403);
  }
  try {
    const form = await boundedImageForm(context.request);
    const image = form.get('image');
    if (!(image instanceof File) || !['image/png', 'image/jpeg', 'image/webp'].includes(image.type) ||
        image.size === 0 || image.size > 2 * 1024 * 1024) {
      return json({ error: 'Choose a PNG, JPEG or WebP photo up to 2 MB.' }, 400);
    }
    const bytes = new Uint8Array(await image.arrayBuffer());
    if (!matchesImageSignature(bytes, image.type)) return json({ error: 'The image format could not be verified.' }, 400);
    const extension = image.type === 'image/jpeg' ? 'jpg' : image.type === 'image/png' ? 'png' : 'webp';
    const path = context.locals.user.id + '/team-' + crypto.randomUUID() + '.' + extension;
    const storage = context.locals.supabase.storage.from('avatars');
    const { error } = await storage.upload(path, bytes, { contentType: image.type, upsert: false });
    if (error) return json({ error: 'Photo upload failed. Please retry.' }, 503);
    return json({ url: storage.getPublicUrl(path).data.publicUrl });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Photo upload failed.' },
      error instanceof MediaRequestError ? error.status : 400);
  }
};
