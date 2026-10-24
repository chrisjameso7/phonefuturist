import { MAX_IMAGE_BYTES } from './media-upload';
const formats: Record<string,string> = { 'image/jpeg':'jpg', 'image/png':'png', 'image/webp':'webp', 'image/avif':'avif' };
export function avatarExtension(file: Pick<File,'type'|'size'>): string | null {
  return file.size > 0 && file.size <= MAX_IMAGE_BYTES ? formats[file.type] ?? null : null;
}

export function ownedAvatarPath(oldUrl: string | null | undefined, newUrl: string | null, userId: string): string | null {
  if (!oldUrl || !newUrl || oldUrl === newUrl) return null;
  try {
    const old = new URL(oldUrl), current = new URL(newUrl);
    const prefix = `/storage/v1/object/public/profile-images/${userId}/`;
    if (old.origin !== current.origin || !old.pathname.startsWith(prefix) || !current.pathname.startsWith(prefix)) return null;
    const filename = old.pathname.slice(prefix.length);
    return /^[a-f0-9-]+\.(jpg|png|webp|avif)$/.test(filename) ? `${userId}/${filename}` : null;
  } catch { return null; }
}
