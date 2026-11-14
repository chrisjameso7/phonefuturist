import { afterEach, expect, it, vi } from 'vitest';
import { signupNewsletter, NEWSLETTER_WELCOME } from '../src/lib/newsletter-signup';
const config = { apiKey: 're_fixture_only', from: 'PhoneFuturist <contact@phonefuturist.com>', segmentId: 'newsletter-segment', topicId: 'newsletter-topic' };
const form = () => new URLSearchParams({ email: 'reader@example.test', first_name: 'Reader', consent: 'yes' });
const limiter = () => ({ limit: vi.fn().mockResolvedValue({ success: true }) });
const response = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status });
afterEach(() => vi.unstubAllGlobals());
it('creates a contact, joins only the configured segment and explicitly opts into its topic without sending', async () => {
 const send = vi.fn().mockResolvedValueOnce(response({},404)).mockResolvedValueOnce(response({ id:'contact-1' }))
 .mockResolvedValueOnce(response({})).mockResolvedValueOnce(response({}))
 .mockResolvedValueOnce(response({data:[{id:config.segmentId}]}))
 .mockResolvedValueOnce(response({data:[{id:config.topicId,subscription:'opt_in'}]}));
 vi.stubGlobal('fetch',send);
 const limit = limiter();
 expect(await signupNewsletter(form(),config,limit,'fixture-ip')).toEqual({status:200,message:NEWSLETTER_WELCOME});
 expect(JSON.parse(send.mock.calls[1][1].body)).toEqual({email:'reader@example.test',first_name:'Reader',unsubscribed:false});
 expect(send.mock.calls[2][0]).toBe('https://api.resend.com/contacts/contact-1/segments/newsletter-segment');
 expect(JSON.parse(send.mock.calls[3][1].body)).toEqual([{id:config.topicId,subscription:'opt_in'}]);
 expect(send.mock.calls.every(([url]) => !/emails|broadcasts/.test(url))).toBe(true);
 expect(limit.limit.mock.calls[0][0].key).toMatch(/^newsletter:[a-f0-9]{64}$/);
});
it('returns the same success for an existing contact and updates its optional name', async () => {
 const send = vi.fn().mockResolvedValueOnce(response({id:'existing',unsubscribed:false}))
 .mockResolvedValueOnce(response({})).mockResolvedValueOnce(response({})).mockResolvedValueOnce(response({}))
 .mockResolvedValueOnce(response({data:[{id:config.segmentId}]}))
 .mockResolvedValueOnce(response({data:[{id:config.topicId,subscription:'opt_in'}]}));
 vi.stubGlobal('fetch',send);
 expect((await signupNewsletter(form(),config,limiter(),'fixture')).message).toBe(NEWSLETTER_WELCOME);
 expect(send.mock.calls.some(([url,opts]) => url.endsWith('/contacts') && opts.method === 'POST')).toBe(false);
});
it('does not claim success when a topic remains opted out', async () => {
 const send=vi.fn().mockResolvedValueOnce(response({id:'existing'})).mockResolvedValueOnce(response({})).mockResolvedValueOnce(response({}))
 .mockResolvedValueOnce(response({})).mockResolvedValueOnce(response({data:[{id:config.segmentId}]}))
 .mockResolvedValueOnce(response({data:[{id:config.topicId,subscription:'opt_out'}]}));
 vi.stubGlobal('fetch',send);
 expect((await signupNewsletter(form(),config,limiter(),'fixture')).status).toBe(503);
});
it('rejects invalid input, missing configuration and exhausted rate limits before provider calls', async () => {
 const send=vi.fn();vi.stubGlobal('fetch',send);
 expect((await signupNewsletter(new URLSearchParams({email:'bad'}),config,limiter(),'fixture')).status).toBe(400);
 expect((await signupNewsletter(form(),null,limiter(),'fixture')).status).toBe(503);
 expect((await signupNewsletter(form(),config,undefined,'fixture')).status).toBe(503);
 expect((await signupNewsletter(form(),config,{limit:async()=>({success:false})},'fixture')).status).toBe(429);
 expect(send).not.toHaveBeenCalled();
});
it('ignores honeypots and keeps provider errors and credentials out of the response',async()=>{
 const send=vi.fn().mockRejectedValue(new Error(config.apiKey));vi.stubGlobal('fetch',send);
 const bot=form();bot.set('website','spam');
 expect((await signupNewsletter(bot,config,limiter(),'fixture')).status).toBe(200);
 expect(send).not.toHaveBeenCalled();
 const result=await signupNewsletter(form(),config,limiter(),'fixture');
 expect(result.status).toBe(503);expect(result.message).not.toContain(config.apiKey);
});
