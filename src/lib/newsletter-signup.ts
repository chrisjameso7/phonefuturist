import type { NewsletterConfig } from './newsletter';
import { newsletterEmail, subscribeNewsletter } from './newsletter';

export type NewsletterLimiter = { limit(input: { key: string }): Promise<{ success: boolean }> };
export const NEWSLETTER_WELCOME = "You're in. Welcome to PhoneFuturist.";
export async function signupNewsletter(form: URLSearchParams | FormData, config: NewsletterConfig | null, limiter: NewsletterLimiter | undefined, address: string) {
  const fail = (message: string, status: number) => ({ message, status });
  if (form.get('website')) return fail(NEWSLETTER_WELCOME, 200);
  const value = form.get('email');
  const email = typeof value === 'string' ? newsletterEmail(value) : null;
  const name = form.get('first_name');
  const firstName = typeof name === 'string' ? name.trim() : '';
  if (!email || firstName.length > 80 || /[\r\n\u0000]/.test(firstName) || form.get('consent') !== 'yes') {
    return fail('Enter a valid email address and accept the newsletter subscription.', 400);
  }
  if (!config?.topicId) return fail('Newsletter signup is unavailable. Please try again later.', 503);
  if (!limiter) return fail('Newsletter signup is temporarily unavailable. Please try again later.', 503);
  try {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(address));
    const key = 'newsletter:' + Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
    if (!(await limiter.limit({ key })).success) return fail('Please wait a minute before trying again.', 429);
    await subscribeNewsletter(config, email, firstName || undefined);
    // Existing and newly created contacts deliberately receive the same response.
    return fail(NEWSLETTER_WELCOME, 200);
  } catch {
    // Never expose provider errors, request bodies, addresses or credentials.
    return fail('Signup could not be completed. Please try again shortly.', 503);
  }
}
