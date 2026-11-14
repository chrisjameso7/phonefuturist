import { env } from 'cloudflare:workers';
import type { NewsletterConfig } from './newsletter';
export function newsletterSettings(): NewsletterConfig | null {
  const { RESEND_API_KEY: apiKey, RESEND_SEGMENT_ID: segmentId, RESEND_TOPIC_ID: topicId } = env;
  return typeof apiKey === 'string' && apiKey && typeof segmentId === 'string' && segmentId && typeof topicId === 'string' && topicId
    ? { apiKey, from: 'PhoneFuturist <contact@phonefuturist.com>', segmentId, topicId } : null;
}
