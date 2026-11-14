import { afterEach, expect, it, vi } from 'vitest';
import { renderNewsletter, newsletterStory, NEWSLETTER_UNSUBSCRIBE, NEWSLETTER_TEST_ADDRESS } from '../src/lib/newsletter-template';
import { createNewsletterDraft, sendNewsletterTest, newsletterSubject } from '../src/lib/newsletter-delivery';
import type { PublishedArticle } from '../src/lib/editorial';
const article = {id:'fixture',canonical_path:'/analysis/fixture',title:'Stored title <one>',summary:'Stored summary & context.',section:'analysis',withdrawn:false} as PublishedArticle;
const issue = {stories:[newsletterStory(article)],previewText:'A supplied preview',note:'A supplied note'};
const config={apiKey:'re_fixture_secret_only',from:'ignored@example.test',segmentId:'newsletter-segment',topicId:'newsletter-topic'};
afterEach(()=>vi.unstubAllGlobals());
it('renders flat inline-only email HTML and plain text without changing stored story copy',()=>{
 const {html,text}=renderNewsletter(issue);
 expect(html).toContain('max-width:600px');expect(html).toContain('width:100%');
 expect(html).toContain('Stored title &lt;one&gt;');expect(html).toContain('Stored summary &amp; context.');
 expect(html).toContain(NEWSLETTER_UNSUBSCRIBE);expect(text).toContain(NEWSLETTER_UNSUBSCRIBE);
 expect(text).toContain('Stored title <one>');expect(text).toContain('\nTechnology, examined.\n');
 expect(html).not.toMatch(/<script|<style|display:\s*(grid|flex)|@font-face|linear-gradient/i);
 for(const image of html.matchAll(/<img\b([^>]+)>/g)) {expect(image[1]).toMatch(/alt="[^"]+"/);expect(image[1]).toMatch(/src="https:\/\/[^\"]+"/);}
 for(const link of html.matchAll(/href="([^"]+)"/g)) expect(link[1]===NEWSLETTER_UNSUBSCRIBE || new URL(link[1]).protocol==='https:').toBe(true);
 expect(html).not.toContain('CONFIRMED');
});
it('uses only explicit stored confidence or the existing news/leaks category mapping',()=>{
 expect(newsletterStory({...article,section:'news'}).status).toBe('confirmed');
 expect(newsletterStory({...article,section:'leaks'}).status).toBe('reported');
 expect(newsletterStory({...article,section:'analysis'}).status).toBeNull();
 expect(newsletterStory({...article,confidence:'rumor'}).status).toBe('rumor');
 expect(()=>newsletterStory({...article,withdrawn:true})).toThrow();
 expect(()=>newsletterStory({...article,canonical_path:'https://foreign.example/story'})).toThrow();
 expect(renderNewsletter({...issue,stories:[newsletterStory({...article,confidence:'rumor'})]}).html).toContain('#F87171');
});
it('creates only an unsent draft with fixed segment, topic and sender; never calls a send endpoint',async()=>{
 const id='00000000-0000-4000-8000-000000000001';
 const fetcher=vi.fn().mockResolvedValue(new Response(JSON.stringify({id})));vi.stubGlobal('fetch',fetcher);
 expect(await createNewsletterDraft(config,'Supplied subject',issue)).toEqual({id,url:'https://resend.com/broadcasts/'+id});
 expect(fetcher).toHaveBeenCalledTimes(1);expect(fetcher.mock.calls[0][0]).toBe('https://api.resend.com/broadcasts');
 const body=JSON.parse(fetcher.mock.calls[0][1].body);
 expect(body).toMatchObject({send:false,topic_id:config.topicId,segment_id:config.segmentId,subject:'Supplied subject',from:'PhoneFuturist <contact@phonefuturist.com>'});
 expect(body).not.toHaveProperty('to');expect(body).not.toHaveProperty('scheduled_at');
 expect(body.html).toContain(NEWSLETTER_UNSUBSCRIBE);
 await expect(createNewsletterDraft({...config,topicId:undefined},'Subject',issue)).rejects.toThrow();
 expect(fetcher).toHaveBeenCalledTimes(1);
});
it('restricts test delivery to the approved address and gives it a signed test unsubscribe link',async()=>{
 const fetcher=vi.fn().mockResolvedValue(new Response('{}'));vi.stubGlobal('fetch',fetcher);
 await expect(sendNewsletterTest(config,'Subject',issue,'another@example.test')).rejects.toThrow();expect(fetcher).not.toHaveBeenCalled();
 await sendNewsletterTest(config,'Subject',issue,NEWSLETTER_TEST_ADDRESS);
 expect(fetcher.mock.calls[0][0]).toBe('https://api.resend.com/emails');
 const body=JSON.parse(fetcher.mock.calls[0][1].body);
 expect(body.to).toEqual([NEWSLETTER_TEST_ADDRESS]);expect(body.html).toContain('/newsletter/test-unsubscribe?token=');expect(body.html).not.toContain(config.apiKey);
});
it('rejects subject injection and escapes optional notes',()=>{
 expect(()=>newsletterSubject('subject\nBcc: other@example.test')).toThrow();
 expect(renderNewsletter({...issue,note:'<script>alert(1)</script>'}).html).not.toContain('<script>');
});
