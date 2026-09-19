import { sessionClient } from './session-client';
import { getSecret } from 'astro:env/server';
import type { AstroCookies } from 'astro';

export function settings() {
  const url = getSecret('SUPABASE_URL');
  const key = getSecret('SUPABASE_PUBLISHABLE_KEY');
  const origin = getSecret('APP_ORIGIN');
  if (!url || !key || !origin) return null;
  try {
    const app = new URL(origin); const database = new URL(url);
    if (app.origin !== origin || !['http:', 'https:'].includes(app.protocol)) return null;
    if (app.protocol !== 'https:' && app.hostname !== 'localhost' && app.hostname !== '127.0.0.1') return null;
    if (database.protocol !== 'https:' && database.hostname !== 'localhost' && database.hostname !== '127.0.0.1') return null;
    if (!key.startsWith('sb_publishable_')) return null;
    return { url, key, origin };
  } catch { return null; }
}
export function serverClient(cookies: AstroCookies, request: Request) {
  const config = settings();
  if (!config) return null;
  return sessionClient(cookies, request, config);
}

