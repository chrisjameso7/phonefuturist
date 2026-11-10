/*
 * Scroll reveal for public editorial surfaces.
 * Progressive: nothing is hidden until this runs, reduced-motion users and
 * browsers without IntersectionObserver see content immediately, and every
 * element is revealed after a short safety timeout regardless.
 */
const TARGETS = [
  '.edition',
  '.lead-story',
  '.next-stories > article',
  '.latest-edition > h2',
  '.latest-grid > article',
  '.pf-home-path',
  '.coverage-links',
  '.newsletter-signup',
  '.labs-directory .lab-hero',
  '.labs-directory .lab-card',
  '.labs-directory .lab-suggestion',
  '.article-grid > .article-card',
  '.story-hero',
  '.story-related-grid > article',
].join(',');

export function enhanceReveal(): void {
  if (typeof window === 'undefined') return;
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !('IntersectionObserver' in window)) return;

  const elements = Array.from(document.querySelectorAll<HTMLElement>(TARGETS));
  if (!elements.length) return;

  // Stagger siblings that share a parent (grids, columns).
  const counters = new Map<Element, number>();
  for (const element of elements) {
    const parent = element.parentElement ?? document.body;
    const index = counters.get(parent) ?? 0;
    counters.set(parent, index + 1);
    element.style.setProperty('--pf-reveal-i', String(Math.min(index, 6)));
    element.classList.add('pf-reveal');
  }

  // Once the entrance finishes, drop the reveal classes so later hover
  // transitions run without the stagger delay.
  const show = (element: Element) => {
    const target = element as HTMLElement;
    if (!target.classList.contains('pf-reveal') || target.classList.contains('pf-reveal-in')) return;
    target.classList.add('pf-reveal-in');
    const index = Number(target.style.getPropertyValue('--pf-reveal-i')) || 0;
    window.setTimeout(() => {
      target.classList.remove('pf-reveal', 'pf-reveal-in');
      target.style.removeProperty('--pf-reveal-i');
    }, 1200 + index * 70);
  };
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        show(entry.target);
        observer.unobserve(entry.target);
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
  );

  // Wait two frames so the hidden state is painted before anything is
  // revealed; elements already in view then animate in instead of popping.
  requestAnimationFrame(() =>
    requestAnimationFrame(() => elements.forEach((element) => observer.observe(element))),
  );

  // Never leave content hidden (e.g. print, unusual scroll containers).
  window.setTimeout(() => elements.forEach(show), 4000);
  window.addEventListener('beforeprint', () => elements.forEach(show), { once: true });
}
