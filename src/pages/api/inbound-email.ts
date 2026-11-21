import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { forwardReceivedEmail, verifyWebhook, type InboundConfig } from '../../lib/inbound-email';

export const prerender = false;

function settings(): InboundConfig | null {
  const { RESEND_API_KEY: apiKey, RESEND_INBOUND_WEBHOOK_SECRET: webhookSecret, INBOUND_FORWARD_TO: forwardTo } = env as Record<string, unknown>;
  return typeof apiKey === 'string' && apiKey && typeof webhookSecret === 'string' && webhookSecret && typeof forwardTo === 'string' && forwardTo
    ? { apiKey, webhookSecret, forwardTo, from: 'PhoneFuturist Inbox <inbox@phonefuturist.com>' } : null;
}

// Resend Inbound webhook. Authenticated by its Svix signature, not by Origin.
export const POST: APIRoute = async ({ request }) => {
  const config = settings();
  if (!config) return new Response('Inbound email is not configured.', { status: 503 });
  const length = Number(request.headers.get('content-length') ?? 0);
  if (length > 256 * 1024) return new Response('Payload too large.', { status: 413 });
  const body = await request.text();
  if (body.length > 256 * 1024) return new Response('Payload too large.', { status: 413 });
  if (!await verifyWebhook(request.headers, body, config.webhookSecret)) return new Response('Invalid signature.', { status: 401 });

  let event: { type?: string; data?: { email_id?: string } };
  try { event = JSON.parse(body); } catch { return new Response('Invalid JSON.', { status: 400 }); }
  if (event.type !== 'email.received') return new Response('Ignored.', { status: 200 });
  if (!event.data?.email_id) return new Response('Missing email id.', { status: 400 });

  try {
    const result = await forwardReceivedEmail(config, event.data.email_id);
    if (result.status >= 500) console.warn('inbound_forward_failure', { status: result.status });
    return new Response(result.message, { status: result.status });
  } catch {
    console.warn('inbound_forward_failure', { status: 500 });
    return new Response('Forwarding failed.', { status: 500 });
  }
};
