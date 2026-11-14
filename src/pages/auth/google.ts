import type { APIRoute } from 'astro';
import { settings } from '../../lib/supabase';
export const GET: APIRoute = async ({ locals, redirect,request }) => {
  const config = settings(request);
  if (!config || !locals.supabase) return new Response('Account services unavailable.', { status: 503 });
  const { data, error } = await locals.supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${config.origin}/auth/callback` } });
  return !error && data.url ? redirect(data.url, 303) : redirect('/login?error=auth', 303);
};
