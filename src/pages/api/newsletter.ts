import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { newsletterSettings } from '../../lib/newsletter-settings';
import { signupNewsletter, type NewsletterLimiter } from '../../lib/newsletter-signup';
import { boundedForm } from '../../lib/security';
import { json } from '../../lib/labs/http';

export const POST: APIRoute = async context => {
  try {
    const form = await boundedForm(context.request);
    const result = await signupNewsletter(form, newsletterSettings(), env.NEWSLETTER_LIMITER as NewsletterLimiter | undefined,
      context.request.headers.get('cf-connecting-ip') ?? context.clientAddress);
    const response = json({ message: result.message }, result.status);
    if (result.status === 429) response.headers.set('Retry-After', '60');
    return response;
  } catch { return json({ message: 'Invalid signup. Please try again.' }, 400); }
};
