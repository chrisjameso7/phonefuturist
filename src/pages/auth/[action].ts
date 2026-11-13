import type { APIRoute } from 'astro';
import { boundedForm, validPassword } from '../../lib/security';
import { settings } from '../../lib/supabase';

export const POST: APIRoute = async ({ request, locals, params, redirect }) => {
  const client = locals.supabase; const config = settings(request);
  if (!client || !config) return new Response('Account services unavailable.', { status: 503 });
  const action = params.action;
  try {
    const form = await boundedForm(request);
    const email = (form.get('email') ?? '').trim(); const password = form.get('password') ?? '';
    const requestedNext = (form.get('next') ?? '').trim();
    const next = requestedNext.startsWith('/') && !requestedNext.startsWith('//') ? requestedNext : '/account';
    if (action === 'signout') { const { error } = await client.auth.signOut(); return error ? new Response('Sign-out failed. Please retry.', { status: 503 }) : redirect('/login', 303); }
    if (!email || email.length > 254 || !email.includes('@')) return redirect('/login?error=auth', 303);
    if (action === 'reset') {
      await client.auth.resetPasswordForEmail(email, { redirectTo: `${config.origin}/auth/callback?next=/account/password` });
      return redirect('/auth/check-email', 303);
    }
    if (!validPassword(password)) return redirect(action === 'signup' ? '/join?error=auth' : '/login?error=auth', 303);
    if (action === 'signup') {
      const { error } = await client.auth.signUp({ email, password, options: { emailRedirectTo: `${config.origin}/auth/callback` } });
      return redirect(error ? '/join?error=auth' : '/auth/check-email', 303);
    }
    if (action === 'login') {
      const { error } = await client.auth.signInWithPassword({ email, password });
      return redirect(error ? '/login?error=auth' : next, 303);
    }
    return new Response('Not found.', { status: 404 });
  } catch { return new Response('Unable to process this request. Please retry.', { status: 400 }); }
};
