import type { APIRoute } from 'astro';
import { safeNext } from '../../lib/security';
export const GET: APIRoute = async ({ url, locals, redirect }) => {
  const code = url.searchParams.get('code');
  if (!code || code.length > 4096 || !locals.supabase) return redirect('/login?error=callback', 303);
  const { error } = await locals.supabase.auth.exchangeCodeForSession(code);
  return redirect(error ? '/login?error=callback' : safeNext(url.searchParams.get('next')), 303);
};
