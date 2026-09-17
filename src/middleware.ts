import { defineMiddleware } from 'astro:middleware';
import { serverClient, settings } from './lib/supabase';
import { validOrigin } from './lib/security';

export const onRequest = defineMiddleware(async (context, next) => {
  const path = context.url.pathname;
  const protectedPage = path === '/account' || path.startsWith('/account/') || path === '/studio' || path.startsWith('/studio/');
  const authPage = protectedPage || ['/login', '/join', '/forgot-password'].includes(path) || path.startsWith('/auth/');
  context.locals.supabase = null; context.locals.user = null; context.locals.access = null;
  let response: Response;
  const config = settings();
  if (!['GET', 'HEAD'].includes(context.request.method) && (!config || !validOrigin(context.request.headers.get('origin'), config.origin))) {
    response = new Response('Request origin not allowed.', { status: 403 });
  } else if (authPage && !config) {
    response = new Response('Account services are not configured yet. Please try again after setup is complete.', { status: 503 });
  } else {
    if (authPage) context.locals.supabase = serverClient(context.cookies, context.request);
    if (protectedPage) {
      const client = context.locals.supabase!;
      const { data, error } = await client.auth.getUser();
      if (error || !data.user) response = context.redirect('/login', 303);
      else {
        context.locals.user = data.user;
        const { data: access, error: accessError } = await client.rpc('foundation_access');
        if (accessError || !access) response = new Response('Account access could not be verified. Please try again later.', { status: 503 });
        else if (!access.active) response = new Response('This account is restricted. Contact the site administrator.', { status: 403 });
        else {
          context.locals.access = access;
          const staff = access.roles.some((role: string) => ['writer', 'editor', 'publisher', 'admin'].includes(role));
          const needsMfa = access.mfa_required;
          if (path.startsWith('/studio') && (!staff || !access.verified)) response = new Response('You do not have verified newsroom access.', { status: 403 });
          else if (path !== '/account/security' && needsMfa && access.aal !== 'aal2') response = context.redirect('/account/security', 303);
          else response = await next();
        }
      }
    } else response = await next();
  }
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'no-referrer');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  // Astro supplies content-specific script/style hashes in its CSP meta element.
  response.headers.set('Content-Security-Policy', "frame-ancestors 'none'; object-src 'none'");
  // Initial foundation has no public response caching. Auth responses must never be shared.
  response.headers.set('Cache-Control', 'private, no-store');
  if (context.url.protocol === 'https:') response.headers.set('Strict-Transport-Security', 'max-age=31536000');
  return response;
});
