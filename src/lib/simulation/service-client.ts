import { createClient } from '@supabase/supabase-js';
import { getSecret } from 'astro:env/server';

export function simulationServiceClient() {
  const url = getSecret('SUPABASE_URL');
  const serviceKey = getSecret('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) return null;

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1') {
      return null;
    }
  } catch {
    return null;
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
