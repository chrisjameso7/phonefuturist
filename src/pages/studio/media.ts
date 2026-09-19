import type { APIRoute } from 'astro';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_TYPES = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
  ['image/avif', 'avif'],
]);

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.supabase || !locals.user) {
    return Response.json(
      { error: 'Sign in to Studio to upload media.' },
      { status: 401 },
    );
  }

  try {
    const form = await request.formData();
    const file = form.get('file');

    if (!(file instanceof File)) {
      return Response.json(
        { error: 'Choose an image to upload.' },
        { status: 400 },
      );
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return Response.json(
        {
          error:
            'Unsupported image type. Use JPEG, PNG, WebP, or AVIF.',
        },
        { status: 415 },
      );
    }

    if (file.size === 0) {
      return Response.json(
        { error: 'The selected image is empty.' },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return Response.json(
        { error: 'Images must be 10 MB or smaller.' },
        { status: 413 },
      );
    }

    const extension = ALLOWED_TYPES.get(file.type)!;
    const id = crypto.randomUUID();

    const path =
      `articles/${locals.user.id}/` +
      `${Date.now()}-${id}.${extension}`;

    const bytes = await file.arrayBuffer();

    const { error: uploadError } = await locals.supabase.storage
      .from('article-media')
      .upload(path, bytes, {
        contentType: file.type,
        cacheControl: '31536000',
        upsert: false,
      });

    if (uploadError) {
      console.error('Article media upload failed:', uploadError);

      return Response.json(
        { error: 'Image upload failed. Please try again.' },
        { status: 500 },
      );
    }

    const { data } = locals.supabase.storage
      .from('article-media')
      .getPublicUrl(path);

    if (!data.publicUrl) {
      return Response.json(
        { error: 'The image uploaded but its public URL could not be created.' },
        { status: 500 },
      );
    }

    return Response.json({
      ok: true,
      path,
      url: data.publicUrl,
      name: file.name,
      type: file.type,
      size: file.size,
    });
  } catch (error) {
    console.error('Article media endpoint failed:', error);

    return Response.json(
      { error: 'Image upload failed. Please try again.' },
      { status: 500 },
    );
  }
};