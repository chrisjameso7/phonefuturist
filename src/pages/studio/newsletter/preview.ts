import type { APIRoute } from 'astro';
import { newsletterIssue } from '../../../lib/newsletter-issue';
import { renderNewsletter } from '../../../lib/newsletter-template';
export const GET: APIRoute = async context => {
 if (!context.locals.access?.roles.includes('admin')) return new Response('Admin access required.',{status:403});
 try {
  const {issue} = await newsletterIssue(context.url.searchParams);
  return new Response(renderNewsletter(issue).html,{headers:{'content-type':'text/html; charset=utf-8','Content-Security-Policy':"default-src 'none'; img-src https://phonefuturist.com; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"}});
 } catch { return new Response('Published stories could not be loaded. Please return to Newsletter Studio.',{status:503}); }
};
