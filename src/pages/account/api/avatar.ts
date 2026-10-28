import type { APIRoute } from 'astro';
import { labClient, json } from '../../../lib/labs/http';
import { boundedImageForm, matchesImageSignature, MediaRequestError } from '../../../lib/media-upload';
export const POST: APIRoute = async (context) => {
    const client = labClient(context);
    if (!client)
        return json({ error: 'Profile uploads are not configured yet.' }, 503);
    const { data: { user } } = await client.auth.getUser();
    if (!user)
        return json({ error: 'Sign in required.' }, 401);
    let form: FormData;
    try {
        form = await boundedImageForm(context.request);
    }
    catch (error) {
        return json({ error: error instanceof Error ? error.message : 'Invalid upload.' }, error instanceof MediaRequestError ? error.status : 400);
    }
    const file = form.get('avatar');
    if (!(file instanceof File) || !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024 || file.size === 0)
        return json({ error: 'Choose a PNG, JPEG or WebP image up to 2 MB.' }, 400);
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!matchesImageSignature(bytes, file.type))
        return json({ error: 'The file does not match its image format.' }, 400);
    const extension = file.type === 'image/jpeg' ? 'jpg' : file.type === 'image/png' ? 'png' : 'webp', key = user.id + '/' + crypto.randomUUID() + '.' + extension;
    const { error: uploadError } = await client.storage.from('avatars').upload(key, bytes, { contentType: file.type, upsert: false, cacheControl: '31536000' });
    if (uploadError)
        return json({ error: 'Avatar upload failed. Please try again.' }, 503);
    const { data } = client.storage.from('avatars').getPublicUrl(key);
    const { error } = await client.rpc('lab_sync_profile', { p_avatar: data.publicUrl });
    if (error) {
        await client.storage.from('avatars').remove([key]);
        return json({ error: 'Could not attach the image to your profile. Please try again.' }, 503);
    }
    return json({ avatarUrl: data.publicUrl });
};
