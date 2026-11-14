import {proMembers} from './lib/billing/pro-members';
import { defineMiddleware } from 'astro:middleware';
import { serverClient, settings } from './lib/supabase';
import { validOrigin,corsHeaders } from './lib/security';

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
  const origin=context.request.headers.get('origin');
  context.locals.adAudience=hasAuthCookie?'unknown':'free';
  if(context.request.method==='OPTIONS'){
    if(!config||!validOrigin(origin,config.origin,config.allowedOrigins))response=new Response('Request origin not allowed.',{status:403});
    else{
      const requested=(context.request.headers.get('access-control-request-headers')??'').split(',').map(h=>h.trim().toLowerCase()).filter(Boolean);
      const supported=['content-type','accept','authorization','x-requested-with'];
      if(requested.some(h=>!supported.includes(h)))response=new Response('Request headers not allowed.',{status:403});
      else response=new Response(null,{status:204,headers:{'Access-Control-Allow-Methods':'GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS','Access-Control-Allow-Headers':supported.join(', '),'Access-Control-Max-Age':'600'}});
    }
  } else if (!['GET', 'HEAD'].includes(context.request.method) && (!config || !validOrigin(origin, config.origin,config.allowedOrigins))) {
    response = new Response('Request origin not allowed.', { status: 403 });
  } else if (authPage && !config) {
    response = new Response('Account services are not configured yet. Please try again after setup is complete.', { status: 503 });
  } else {
    if (config && (authPage || hasAuthCookie)) context.locals.supabase = serverClient(context.cookies, context.request);
    let identityError = false;
    if (context.locals.supabase && (protectedPage || hasAuthCookie)) {
      const client = context.locals.supabase;
      const { data, error } = await client.auth.getUser();
      if (!error && data.user) {
        context.locals.user = data.user;
        const pros=await proMembers(client,[data.user.id]);
        context.locals.adAudience=pros===null?'unknown':pros.has(data.user.id)?'pro':'free';
        const { data: access, error: accessError } = await client.rpc('foundation_access');
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
  if(config)for(const [name,value]of corsHeaders(origin,config.origin,config.allowedOrigins)) {if(name==='vary')response.headers.append('Vary',value);else response.headers.set(name,value);}
  response.headers.set('X-Content-Type-Options', 'nosniff');
  // Preserve Origin on native form POSTs; no-referrer can turn it into null.
  // Send only the origin to HTTPS destinations, never callback paths or codes.
  response.headers.set('Referrer-Policy', 'strict-origin');
  const newsletterPreview = path === '/studio/newsletter/preview';
  response.headers.set('X-Frame-Options', newsletterPreview ? 'SAMEORIGIN' : 'DENY');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  // Preserve Astro's generated script/style policy (Astro may emit it as a header).
  const contentPolicy=response.headers.get('Content-Security-Policy');
  response.headers.set('Content-Security-Policy', [contentPolicy,newsletterPreview ? "frame-ancestors 'self'; object-src 'none'" : "frame-ancestors 'none'; object-src 'none'"].filter(Boolean).join('; '));
  // Initial foundation has no public response caching. Auth responses must never be shared.
  response.headers.set('Cache-Control', 'private, no-store');
  response.headers.append('Vary', 'Cookie');
  if (context.url.protocol === 'https:') response.headers.set('Strict-Transport-Security', 'max-age=31536000');
  return response;
});
