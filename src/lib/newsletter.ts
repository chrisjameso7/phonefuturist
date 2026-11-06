export type NewsletterConfig = { apiKey: string; from: string; segmentId: string; topicId?: string };
const encoder = new TextEncoder();

export function newsletterEmail(value: string) {
  const email = value.trim().toLowerCase();
  return email.length <= 254 && /^[^\s@<>]+@[^\s@<>]+\.[a-z]{2,}$/i.test(email) ? email : null;
}
function encode(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}
function decode(value: string) {
  return Uint8Array.from(atob(value.replaceAll('-', '+').replaceAll('_', '/')), char => char.charCodeAt(0));
}
async function signingKey(secret: string) {
  return crypto.subtle.importKey('raw', encoder.encode('phonefuturist-newsletter-v1:' + secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}
export async function newsletterToken(email: string, secret: string, now = Date.now()) {
  const payload = encode(encoder.encode(JSON.stringify({ email, issued: Math.floor(now / 3600000) * 3600000 })));
  const signature = await crypto.subtle.sign('HMAC', await signingKey(secret), encoder.encode(payload));
  return payload + '.' + encode(new Uint8Array(signature));
}
export async function verifyNewsletterToken(token: string, secret: string, now = Date.now()): Promise<string | null> {
  try {
    if (token.length > 2048) return null;
    const [payload, signature, extra] = token.split('.');
    if (!payload || !signature || extra) return null;
    if (!await crypto.subtle.verify('HMAC', await signingKey(secret), decode(signature), encoder.encode(payload))) return null;
    const data = JSON.parse(new TextDecoder().decode(decode(payload)));
    if (typeof data.issued !== 'number' || data.issued > now || now - data.issued > 86400000 || typeof data.email !== 'string') return null;
    return newsletterEmail(data.email);
  } catch { return null; }
}
export async function resend(config: NewsletterConfig, path: string, method: string, body?: unknown, idempotencyKey?: string) {
  for (let attempt = 0; ; attempt++) {
  const response = await fetch('https://api.resend.com' + path, {
    method,
    headers: {
      authorization: 'Bearer ' + config.apiKey,
      'content-type': 'application/json',
      ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(10000),
  });
  if (response.status !== 429 || attempt >= 2) {
    if (!response.ok && response.status !== 404) console.warn('newsletter_provider_failure', {
      operation: method + ' ' + (path.includes('/topics') ? 'contact_topics' : path.includes('/segments') ? 'contact_segments' : path.startsWith('/contacts') ? 'contacts' : 'email'),
      status: response.status,
    });
    return response;
  }
  const seconds = Number(response.headers.get('retry-after') ?? 1);
  await response.body?.cancel();
  await new Promise(resolve => setTimeout(resolve, Math.min(3000, Math.max(1000, seconds * 1000 || 1000))));
  }
}
export async function requestNewsletterConfirmation(config: NewsletterConfig, email: string, origin: string) {
  const token = await newsletterToken(email, config.apiKey);
  const url = new URL('/newsletter/confirm', origin);
  url.searchParams.set('token', token);
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(origin + token));
  const response = await resend(config, '/emails', 'POST', {
    from: config.from, to: [email], subject: 'Confirm your PhoneFuturist newsletter signup',
    text: [
      'Confirm your newsletter signup at the link below.',
      url.href,
      'The link expires within 24 hours. If you did not request this, you can ignore this email.',
    ].join('\n\n'),
  }, 'newsletter-confirm-' + encode(new Uint8Array(digest)));
  if (!response.ok) throw new Error('Confirmation email could not be sent. Please try again later.');
}
export async function subscribeNewsletter(config: NewsletterConfig, email: string, firstName?: string) {
  let response = await resend(config, '/contacts/' + encodeURIComponent(email), 'GET');
  let contact: { id: string; unsubscribed?: boolean };
  if (response.status === 404) {
    response = await resend(config, '/contacts', 'POST', { email, unsubscribed: false, ...(firstName ? { first_name: firstName } : {}) });
    if (!response.ok) throw new Error('Signup could not be completed. Please retry.');
    contact = await response.json();
  } else {
    if (!response.ok) throw new Error('Signup could not be completed. Please retry.');
    contact = await response.json();
    if (contact.unsubscribed || firstName) {
      const updated = await resend(config, '/contacts/' + encodeURIComponent(contact.id), 'PATCH', { unsubscribed: false, ...(firstName ? { first_name: firstName } : {}) });
      if (!updated.ok) throw new Error('Signup could not be completed. Please retry.');
    }
  }
  if (typeof contact.id !== 'string' || !contact.id) throw new Error('Signup could not be completed. Please retry.');
  const added = await resend(config, '/contacts/' + encodeURIComponent(contact.id) + '/segments/' + encodeURIComponent(config.segmentId), 'POST');
  if (!added.ok) throw new Error('Signup could not be completed. Please retry.');
  if (config.topicId) {
    const path = '/contacts/' + encodeURIComponent(contact.id);
    const optedIn = await resend(config, path + '/topics', 'PATCH', [{ id: config.topicId, subscription: 'opt_in' }]);
    if (!optedIn.ok) throw new Error('Signup could not be completed. Please retry.');
    // Report success only after the configured segment and explicit topic opt-in are readable.
    const segmentsResponse = await resend(config, path + '/segments', 'GET');
    const topicsResponse = await resend(config, path + '/topics', 'GET');
    if (!segmentsResponse.ok || !topicsResponse.ok) throw new Error('Signup could not be verified. Please retry.');
    const segments = await segmentsResponse.json() as { data?: { id: string }[] };
    const topics = await topicsResponse.json() as { data?: { id: string; subscription: string }[] };
    if (!segments.data?.some(segment => segment.id === config.segmentId) ||
        !topics.data?.some(topic => topic.id === config.topicId && topic.subscription === 'opt_in')) {
      throw new Error('Signup could not be verified. Please retry.');
    }
  }
}

// A bounded, short-lived throttle limits repeat confirmation requests per worker.
const confirmationWindows = new Map<string, { started: number; count: number }>();
export async function allowNewsletterConfirmation(address: string, now = Date.now()) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(address));
  const key = encode(new Uint8Array(digest));
  const previous = confirmationWindows.get(key);
  if (previous && now - previous.started < 900000) {
    if (previous.count >= 20) return false;
    previous.count++;
    return true;
  }
  if (confirmationWindows.size >= 1000) confirmationWindows.delete(confirmationWindows.keys().next().value!);
  confirmationWindows.set(key, { started: now, count: 1 });
  return true;
}
