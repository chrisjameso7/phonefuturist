import {afterEach,describe,it,expect,vi} from 'vitest';
import {newsletterEmail,newsletterToken,verifyNewsletterToken,requestNewsletterConfirmation,subscribeNewsletter,allowNewsletterConfirmation} from '../src/lib/newsletter';
const config={apiKey:'re_local_test_secret',from:'newsletter@example.test',segmentId:'test-segment'};
afterEach(()=>vi.unstubAllGlobals());
describe('newsletter confirmation',()=>{
 it('validates email, rejects modified/expired links and keeps hourly requests deterministic',async()=>{
  expect(newsletterEmail(' Reader@Example.Test ')).toBe('reader@example.test');
  expect(newsletterEmail('not an email')).toBeNull();
  const now=Date.UTC(2026,10,5,12);
  const token=await newsletterToken('reader@example.test',config.apiKey,now);
  expect(await verifyNewsletterToken(token,config.apiKey,now+1000)).toBe('reader@example.test');
  expect(await newsletterToken('reader@example.test',config.apiKey,now+1000)).toBe(token);
  expect(await verifyNewsletterToken(token,config.apiKey,now+86400001)).toBeNull();
  expect(await verifyNewsletterToken(token+'x',config.apiKey,now)).toBeNull();
  expect(await verifyNewsletterToken(token,'another-secret',now)).toBeNull();
 });
 it('sends a confirmation without creating a subscriber',async()=>{
  const send=vi.fn().mockResolvedValue(new Response('{}',{status:200}));
  vi.stubGlobal('fetch',send);
  await requestNewsletterConfirmation(config,'reader@example.test','https://phonefuturist.com');
  expect(send).toHaveBeenCalledTimes(1);
  expect(send.mock.calls[0][0]).toBe('https://api.resend.com/emails');
  const options=send.mock.calls[0][1];
  expect(options.headers['Idempotency-Key']).toMatch(/^newsletter-confirm-/);
  expect(JSON.parse(options.body).text).toContain('/newsletter/confirm?token=');
 });
 it('creates a confirmed contact and joins the configured segment',async()=>{
  const send=vi.fn().mockResolvedValueOnce(new Response('{}',{status:404}))
   .mockResolvedValueOnce(new Response('{"id":"contact-1"}',{status:200}))
   .mockResolvedValueOnce(new Response('{}',{status:200}));
  vi.stubGlobal('fetch',send);
  await subscribeNewsletter(config,'reader@example.test');
  expect(send.mock.calls[1][0]).toBe('https://api.resend.com/contacts');
  expect(send.mock.calls[2][0]).toBe('https://api.resend.com/contacts/contact-1/segments/test-segment');
 });
 it('retries partial signup using the existing contact and surfaces provider failures',async()=>{
  const send=vi.fn().mockResolvedValueOnce(new Response('{"id":"contact-1","unsubscribed":true}',{status:200}))
    .mockResolvedValueOnce(new Response('{}',{status:200}))
    .mockResolvedValueOnce(new Response('{}',{status:503}));
  vi.stubGlobal('fetch',send);
  await expect(subscribeNewsletter(config,'reader@example.test')).rejects.toThrow('Please retry');
  expect(send.mock.calls[1][1].method).toBe('PATCH');
  expect(send.mock.calls.some(call=>call[0]==='https://api.resend.com/contacts')).toBe(false);
 });
 it('bounds repeat confirmations and reopens the window later',async()=>{
  const address='newsletter-test-client';
  for(let i=0;i<20;i++)expect(await allowNewsletterConfirmation(address,1000)).toBe(true);
  expect(await allowNewsletterConfirmation(address,1001)).toBe(false);
  expect(await allowNewsletterConfirmation(address,901001)).toBe(true);
 });
});
