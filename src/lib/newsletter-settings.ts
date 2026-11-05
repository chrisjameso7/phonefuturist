import { getSecret } from 'astro:env/server';
import type { NewsletterConfig } from './newsletter';
export function newsletterSettings(): NewsletterConfig | null {
  const apiKey = getSecret('RESEND_API_KEY');
  const from = getSecret('NEWSLETTER_FROM');
  const segmentId = getSecret('NEWSLETTER_SEGMENT_ID');
  return apiKey && from && segmentId ? { apiKey, from, segmentId } : null;
}
