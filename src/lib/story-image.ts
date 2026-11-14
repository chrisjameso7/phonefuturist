import { safeHttps, type PublishedArticle } from './editorial';
export function storyImage(article: PublishedArticle) {
 if (article.withdrawn) return null;
 const card = article.card_image && safeHttps(article.card_image.url) ? article.card_image : null;
 const block = card ? article.blocks.find(block => block.type === 'image' && block.url === card.url)
  : article.blocks.find(block => block.type === 'image' && safeHttps(block.url));
 const url = card?.url ?? block?.url;
 return url && safeHttps(url) ? { url, alt: card?.alt ?? block?.alt ?? '', caption: card?.caption ?? block?.caption ?? '', credit: card?.credit ?? block?.credit ?? '', sourceName: card?.sourceName ?? block?.sourceName ?? '' } : null;
}
