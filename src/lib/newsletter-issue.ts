import { publishedArticles } from './publication';
import { newsletterStory, type NewsletterIssue } from './newsletter-template';
export async function newsletterIssue(form: URLSearchParams, defaults = false) {
 const { articles, unavailable } = await publishedArticles();
 if (unavailable) throw new Error('Published articles could not be loaded. Please retry.');
 const eligible = articles.filter(article => !article.withdrawn);
 const selected = form.getAll('article');
 if (selected.length > 8 || new Set(selected).size !== selected.length) throw new Error('Choose up to eight distinct published articles.');
 const chosen = defaults ? eligible.slice(0,5) : selected.map(id => {
  const article = eligible.find(article => article.id === id);
  if (!article) throw new Error('An article is no longer available for this issue. Reload the page.');
  return article;
 });
 const previewText = form.get('preview_text') ?? '';
 const note = form.get('note') ?? '';
 if (previewText.length > 200 || note.length > 3000) throw new Error('Preview text is limited to 200 characters and the note to 3,000.');
 const issue: NewsletterIssue = { stories: chosen.map(newsletterStory), previewText,
  ...(note.trim() ? { note: note.trim() } : {}),
  ...(form.get('lab') === 'yes' ? { lab: { title:'Labs', summary:'Design devices, test hardware scenarios and make predictions.', url:'https://phonefuturist.com/labs' } } : {}) };
 return { issue, articles: eligible, selected: chosen.map(article=>article.id) };
}
