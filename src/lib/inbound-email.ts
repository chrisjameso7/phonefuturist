/**
 * Resend Inbound → Gmail forwarding.
 * Resend posts an `email.received` webhook (metadata only); we verify its Svix
 * signature, fetch the full message and attachments, and re-send it from our
 * verified domain to the owner's inbox with Reply-To set to the original sender.
 */
const encoder = new TextEncoder();
const RESEND = 'https://api.resend.com';
const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;
const SIGNATURE_TOLERANCE_SECONDS = 5 * 60;

export type InboundConfig = { apiKey: string; webhookSecret: string; forwardTo: string; from: string };

function base64ToBytes(value: string) {
  return Uint8Array.from(atob(value), char => char.charCodeAt(0));
}
function bytesToBase64(bytes: Uint8Array) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}
function sameText(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Svix scheme used by Resend webhooks: HMAC-SHA256 over `${id}.${timestamp}.${body}`. */
export async function verifyWebhook(headers: Headers, body: string, secret: string, now = Date.now()) {
  const id = headers.get('svix-id');
  const timestamp = headers.get('svix-timestamp');
  const signatures = headers.get('svix-signature');
  if (!id || !timestamp || !signatures || !/^\d{1,12}$/.test(timestamp)) return false;
  if (Math.abs(now / 1000 - Number(timestamp)) > SIGNATURE_TOLERANCE_SECONDS) return false;
  let key: CryptoKey;
  try {
    key = await crypto.subtle.importKey('raw', base64ToBytes(secret.replace(/^whsec_/, '')), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  } catch { return false; }
  const expected = bytesToBase64(new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(`${id}.${timestamp}.${body}`))));
  return signatures.split(' ').some(entry => {
    const [version, signature] = entry.split(',');
    return version === 'v1' && !!signature && sameText(signature, expected);
  });
}

async function resendFetch(config: InboundConfig, path: string, init: RequestInit = {}) {
  return fetch(RESEND + path, {
    ...init,
    headers: { authorization: 'Bearer ' + config.apiKey, 'content-type': 'application/json', ...(init.headers ?? {}) },
    signal: AbortSignal.timeout(15000),
  });
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
}
function addressOnly(value: string) {
  const match = value.match(/<([^>]+)>/);
  return (match ? match[1] : value).trim().toLowerCase();
}

type ReceivedEmail = {
  id: string; from: string; to?: string[]; cc?: string[]; subject?: string;
  html?: string | null; text?: string | null; reply_to?: string[] | null;
};
type ReceivedAttachment = { filename?: string; content_type?: string; download_url?: string; size?: number };

export async function forwardReceivedEmail(config: InboundConfig, emailId: string): Promise<{ status: number; message: string }> {
  if (!/^[a-zA-Z0-9-]{8,64}$/.test(emailId)) return { status: 400, message: 'Invalid email id.' };

  const emailResponse = await resendFetch(config, '/emails/receiving/' + encodeURIComponent(emailId));
  if (!emailResponse.ok) return { status: 502, message: 'Could not load the received email.' };
  const email = await emailResponse.json() as ReceivedEmail;

  // Never forward our own forwards back to ourselves.
  const sender = addressOnly(email.from ?? '');
  if (!sender || sender === addressOnly(config.from) || sender === addressOnly(config.forwardTo)) {
    return { status: 200, message: 'Skipped loop.' };
  }

  const attachments: { filename: string; content: string; content_type?: string }[] = [];
  const skipped: string[] = [];
  const listResponse = await resendFetch(config, '/emails/receiving/' + encodeURIComponent(emailId) + '/attachments');
  if (listResponse.ok) {
    const list = await listResponse.json() as { data?: ReceivedAttachment[] };
    let total = 0;
    for (const item of list.data ?? []) {
      const filename = item.filename || 'attachment';
      if (!item.download_url || (item.size ?? 0) + total > MAX_ATTACHMENT_BYTES) { skipped.push(filename); continue; }
      const file = await fetch(item.download_url, { signal: AbortSignal.timeout(20000) });
      if (!file.ok) { skipped.push(filename); continue; }
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (total + bytes.length > MAX_ATTACHMENT_BYTES) { skipped.push(filename); continue; }
      total += bytes.length;
      attachments.push({ filename, content: bytesToBase64(bytes), ...(item.content_type ? { content_type: item.content_type } : {}) });
    }
  }

  const recipients = (email.to ?? []).join(', ') || 'phonefuturist.com';
  const note = `Sent to ${recipients} by ${email.from}. Reply to answer them directly.` +
    (skipped.length ? ` Attachments left in Resend: ${skipped.join(', ')}.` : '');
  const html = `<div style="font:13px/1.5 sans-serif;color:#555;border-bottom:1px solid #ddd;padding:0 0 10px;margin:0 0 16px">${escapeHtml(note)}</div>` +
    (email.html || (email.text ? `<pre style="white-space:pre-wrap;font:inherit">${escapeHtml(email.text)}</pre>` : ''));
  const text = note + '\n\n' + (email.text || '');
  const replyTo = email.reply_to?.length ? email.reply_to : [email.from];

  const send = await resendFetch(config, '/emails', {
    method: 'POST',
    headers: { 'Idempotency-Key': 'inbound-forward-' + emailId },
    body: JSON.stringify({
      from: config.from,
      to: [config.forwardTo],
      reply_to: replyTo,
      subject: email.subject?.trim() || '(no subject)',
      html,
      text,
      ...(attachments.length ? { attachments } : {}),
    }),
  });
  if (!send.ok) return { status: 502, message: 'Could not forward the email.' };
  return { status: 200, message: 'Forwarded.' };
}
