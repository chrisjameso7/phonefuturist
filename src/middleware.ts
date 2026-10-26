import { defineMiddleware } from 'astro:middleware';
import { serverClient, settings } from './lib/supabase';
import { validOrigin } from './lib/security';

export const onRequest = defineMiddleware(async (context, next) => {
  const path = context.url.pathname;
  const protectedPage = path === '/account' || path.startsWith('/account/') || path === '/studio' || path.startsWith('/studio/');
  // The legacy /simulate page is only a public redirect to the simulator.
  // Keep actual lab API endpoints behind their existing access checks.
  const earlyAccessPage = path.startsWith('/interactive-leaks/api/');
  const authPage = protectedPage || earlyAccessPage || ['/login', '/join', '/forgot-password'].includes(path) || path.startsWith('/auth/');
  context.locals.supabase = null; context.locals.user = null; context.locals.access = null;
  let response: Response;
  const config = settings();
  // Cookie presence only selects whether to ask Auth; it never establishes identity or role.
  const hasAuthCookie = /(?:^|;\s*)sb-[^=;]+-auth-token(?:\.\d+)?=/.test(context.request.headers.get('cookie') ?? '');
  if (!['GET', 'HEAD'].includes(context.request.method) && (!config || !validOrigin(context.request.headers.get('origin'), config.origin))) {
    response = new Response('Request origin not allowed.', { status: 403 });
  } else if (authPage && !config) {
    response = new Response('Account services are not configured yet. Please try again after setup is complete.', { status: 503 });
  } else {
    if (config && (authPage || hasAuthCookie)) context.locals.supabase = serverClient(context.cookies, context.request);
    let identityError = false;
    if (context.locals.supabase && (protectedPage || hasAuthCookie)) {
      const client = context.locals.supabase;
      // Both calls are read-only and use the same cookie-backed session.
      // Start them together to avoid two serial network round trips per page.
      // Roles are accepted only after getUser verifies the identity below.
      const [{ data, error }, { data: access, error: accessError }] = await Promise.all([
        client.auth.getUser(),
        client.rpc('foundation_access'),
      ]);
      if (!error && data.user) {
        context.locals.user = data.user;
        identityError = !!accessError || !access;
        if (!identityError) context.locals.access = access;
      }
    }
    if (protectedPage || earlyAccessPage) {
      if (!context.locals.user) {
        const nextPath = path + context.url.search;
        response = context.redirect('/login?next=' + encodeURIComponent(nextPath), 303);
      } else {
        const access = context.locals.access;
        if (identityError || !access) response = new Response('Account access could not be verified. Please try again later.', { status: 503 });
        else if (!access.active) response = new Response('This account is restricted. Contact the site administrator.', { status: 403 });
        else {
          context.locals.access = access;
          const staff = access.roles.some((role: string) => ['writer', 'editor', 'publisher', 'admin'].includes(role));
          const needsMfa = access.mfa_required;
          if (path.startsWith('/studio') && (!staff || !access.verified)) response = new Response('You do not have verified newsroom access.', { status: 403 });
          else if (path !== '/account/security' && needsMfa && access.aal !== 'aal2') response = context.redirect('/account/security', 303);
          else if (earlyAccessPage) {
            const { data: earlyAccess, error: earlyAccessError } = await context.locals.supabase!.rpc('lab_early_access_status');
            if (earlyAccessError || !earlyAccess) response = new Response('Lab Early Access could not be verified. Please try again later.', { status: 503 });
            else if (!earlyAccess.allowed) response = new Response('PhoneFuturist Lab is currently in Early Access. This account has not been invited yet.', { status: 403 });
            else response = await next();
          } else response = await next();
        }
      }
    } else if (context.locals.user && ['/login','/join'].includes(path)) response = context.redirect('/account',303);
    else response = await next();
  }
  response.headers.set('X-Content-Type-Options', 'nosniff');
  // Preserve Origin on native form POSTs; no-referrer can turn it into null.
  // Send only the origin to HTTPS destinations, never callback paths or codes.
  response.headers.set('Referrer-Policy', 'strict-origin');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  // Astro supplies content-specific script/style hashes in its CSP meta element.
  response.headers.set('Content-Security-Policy', "frame-ancestors 'none'; object-src 'none'");
  // Initial foundation has no public response caching. Auth responses must never be shared.
  response.headers.set('Cache-Control', 'private, no-store');
  response.headers.append('Vary', 'Cookie');
  if (context.url.protocol === 'https:') response.headers.set('Strict-Transport-Security', 'max-age=31536000');
  return response;
});
