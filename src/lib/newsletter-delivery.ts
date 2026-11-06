import { newsletterToken, resend, type NewsletterConfig } from './newsletter';
import { NEWSLETTER_TEST_ADDRESS, NEWSLETTER_ORIGIN, NEWSLETTER_UNSUBSCRIBE, type NewsletterIssue, renderNewsletter } from './newsletter-template';

export function newsletterSubject(value: string) {
  const subject = value.trim();
  if (!subject || subject.length > 200 || /[\r\n\u0000]/.test(subject)) throw new Error('Enter a subject of 1–200 characters on one line.');
  return subject;
}
export async function createNewsletterDraft(config: NewsletterConfig, subject: string, issue: NewsletterIssue) {
  if (!config.segmentId || !config.topicId) throw new Error('Newsletter segment and topic configuration are required.');
  const { html, text } = renderNewsletter(issue);
  const body = { from: 'PhoneFuturist <contact@phonefuturist.com>', reply_to: 'contact@phonefuturist.com',
    subject: newsletterSubject(subject), html, text, segment_id: config.segmentId, topic_id: config.topicId, send: false };
  const digest = await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(body)));
  const key = 'newsletter-draft-' + Array.from(new Uint8Array(digest), byte=>byte.toString(16).padStart(2,'0')).join('');
  const response = await resend(config, '/broadcasts', 'POST', body, key);
  if (!response.ok) throw new Error('Resend could not create the draft. Nothing was sent.');
  const result = await response.json() as {id?: string};
  if (!result.id || !/^[a-f0-9-]{36}$/i.test(result.id)) throw new Error('Resend returned an invalid draft identifier. Check the dashboard before retrying.');
  return { id: result.id, url: 'https://resend.com/broadcasts/' + result.id };
}
export async function sendNewsletterTest(config: NewsletterConfig, subject: string, issue: NewsletterIssue, recipient: string) {
  if (recipient !== NEWSLETTER_TEST_ADDRESS) throw new Error('Test delivery is restricted to the approved address.');
  const token = await newsletterToken(recipient, config.apiKey + ':newsletter-test-unsubscribe-v1');
  const unsubscribe = new URL('/newsletter/test-unsubscribe', NEWSLETTER_ORIGIN);
  unsubscribe.searchParams.set('token', token);
  const rendered = renderNewsletter(issue);
  const body = {
    from: 'PhoneFuturist <contact@phonefuturist.com>', to: [NEWSLETTER_TEST_ADDRESS], reply_to: 'contact@phonefuturist.com',
    subject: '[Preview] ' + newsletterSubject(subject),
    html: rendered.html.replaceAll(NEWSLETTER_UNSUBSCRIBE, unsubscribe.href.replaceAll('&','&amp;')),
    text: rendered.text.replaceAll(NEWSLETTER_UNSUBSCRIBE, unsubscribe.href),
  };
  const digest = await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(body)));
  const key = 'newsletter-test-' + Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
  const response = await resend(config, '/emails', 'POST', body, key);
  if (!response.ok) throw new Error('The test email could not be sent. No broadcast was sent.');
}
