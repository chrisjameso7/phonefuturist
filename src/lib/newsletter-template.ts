import { articleConfidence, type PublishedArticle } from './editorial';
export const NEWSLETTER_ORIGIN = 'https://phonefuturist.com';
export const NEWSLETTER_UNSUBSCRIBE = '{{{RESEND_UNSUBSCRIBE_URL}}}';
export const NEWSLETTER_TEST_ADDRESS = 'jamesadebajo7@gmail.com';
export type NewsletterStory = { title: string; summary: string; url: string; status: 'confirmed' | 'reported' | 'rumor' | null; category: string };
export type NewsletterIssue = { stories: NewsletterStory[]; previewText: string; lab?: { title: string; summary: string; url: string }; note?: string };
const escape = (text: string) => text.replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));
function absoluteUrl(value: string) {
 const url = new URL(value, NEWSLETTER_ORIGIN);
 if (url.protocol !== 'https:' || url.origin !== NEWSLETTER_ORIGIN || url.username || url.password) throw new Error('Use a public PhoneFuturist HTTPS URL.');
 return url.href;
}
export function newsletterStory(article: PublishedArticle): NewsletterStory {
 if (article.withdrawn) throw new Error('Withdrawn articles cannot appear in a newsletter.');
 return { title: article.title, summary: article.summary, url: absoluteUrl(article.canonical_path), status: articleConfidence(article), category: article.section };
}
export function renderNewsletter(issue: NewsletterIssue): { html: string; text: string } {
 const ink = '#181816', cream = '#FAF9F5', gray = '#52524C', line = '#D6D4CB';
 const colors = { reported: '#F5B14A', confirmed: '#5EEAD4', rumor: '#F87171' };
 const paragraph = (text: string) => `<p style="margin:0 0 16px;color:${gray};font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;overflow-wrap:anywhere;">${escape(text).replaceAll('\n','<br>')}</p>`;
 const block = (content: string) => `<tr><td bgcolor="${cream}" style="padding:28px 24px;border-bottom:1px solid ${line};background-color:${cream};color:${ink};">${content}</td></tr>`;
 const stories = issue.stories.map(story => {
  const status = story.status && Object.hasOwn(colors,story.status) ? story.status : null;
  const label = status ? `<p style="margin:0 0 14px;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.5;letter-spacing:1.5px;font-weight:bold;color:${ink};"><span style="color:${colors[status]};font-size:16px;">■</span> ${status.toUpperCase()}</p>` : '';
  return block(`${label}<h2 style="margin:0 0 14px;color:${ink};font-family:Georgia,'Times New Roman',serif;font-size:20px;line-height:1.35;font-weight:bold;overflow-wrap:anywhere;">${escape(story.title)}</h2>${paragraph(story.summary)}<a href="${escape(absoluteUrl(story.url))}" style="color:#1A8CFF;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;text-decoration:underline;">Read the story →</a>`);
 }).join('');
 const lab = issue.lab ? block(`<p style="margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:1.5px;color:${gray};">TRY A LAB</p><h2 style="margin:0 0 14px;font-family:Georgia,'Times New Roman',serif;font-size:20px;color:${ink};">${escape(issue.lab.title)}</h2>${paragraph(issue.lab.summary)}<a href="${escape(absoluteUrl(issue.lab.url))}" style="color:#1A8CFF;font-family:Arial,Helvetica,sans-serif;font-size:15px;">Open the lab →</a>`) : '';
 const note = issue.note ? block(`<h2 style="margin:0 0 14px;font-family:Georgia,'Times New Roman',serif;font-size:20px;color:${ink};">A note from us</h2>${paragraph(issue.note)}`) : '';
 const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PhoneFuturist newsletter</title></head><body bgcolor="${cream}" style="margin:0;padding:0;background-color:${cream};color:${ink};"><div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${escape(issue.previewText)}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="${cream}" style="width:100%;background-color:${cream};"><tr><td align="center" style="padding:20px 0;"><table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" bgcolor="${cream}" style="width:100%;max-width:600px;background-color:${cream};table-layout:fixed;"><tr><td style="padding:28px 24px;border-bottom:2px solid ${ink};"><img src="${NEWSLETTER_ORIGIN}/assets/phonefuturist-official-logo.png" alt="PhoneFuturist logo" width="56" height="56" style="display:block;border:0;margin:0 0 12px;max-width:100%;"><p style="margin:0 0 8px;color:${ink};font-family:Arial,Helvetica,sans-serif;font-size:26px;line-height:1.2;font-weight:bold;letter-spacing:-1px;">PhoneFuturist</p><p style="margin:0;color:${gray};font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;">Technology, examined.</p></td></tr>${stories}${lab}${note}<tr><td style="padding:28px 24px;color:${gray};font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.7;"><p style="margin:0 0 8px;font-weight:bold;">PhoneFuturist · Technology, examined.</p><p style="margin:0 0 8px;">You receive this email because you subscribed to the PhoneFuturist newsletter.</p><p style="margin:0 0 8px;">Reply to this email if you have a tip or a correction</p><p style="margin:0 0 12px;"><a href="${NEWSLETTER_UNSUBSCRIBE}" style="color:${gray};text-decoration:underline;">Unsubscribe</a> · <a href="${NEWSLETTER_ORIGIN}/privacy" style="color:${gray};text-decoration:underline;">Privacy</a></p><p style="margin:0;">© 2026 PhoneFuturist. All rights reserved.<br>A Lumière Media &amp; Entertainment publication.</p></td></tr></table></td></tr></table></body></html>`;
 const text = ['PhoneFuturist','Technology, examined.','',issue.previewText,'',...issue.stories.flatMap(story=>[...(story.status ? [story.status.toUpperCase()] : []),story.title,story.summary,'Read the story: '+absoluteUrl(story.url),'']),...(issue.lab?['Try a lab',issue.lab.title,issue.lab.summary,absoluteUrl(issue.lab.url),'']:[]),...(issue.note?['A note from us',issue.note,'']:[]),'PhoneFuturist · Technology, examined.','You receive this email because you subscribed to the PhoneFuturist newsletter.','Reply to this email if you have a tip or a correction','Unsubscribe: '+NEWSLETTER_UNSUBSCRIBE,'Privacy: '+NEWSLETTER_ORIGIN+'/privacy','© 2026 PhoneFuturist. All rights reserved.','A Lumière Media & Entertainment publication.'].join('\n');
 return { html, text };
}
