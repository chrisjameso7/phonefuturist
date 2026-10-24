export function isPageNavigation(current: URL, destination: string): boolean {
  const next = new URL(destination, current);
  return next.origin === current.origin &&
    (next.pathname !== current.pathname || next.search !== current.search);
}

/** Feedback only: keep native navigation, browser history and Astro islands intact. */
export function enhanceInteractionFeedback() {
  const root = document.documentElement;
  if (root.dataset.interactionFeedback) return;
  root.dataset.interactionFeedback = 'ready';
  let timer: ReturnType<typeof setTimeout> | undefined;
  let recovery: ReturnType<typeof setTimeout> | undefined;
  let pending: HTMLAnchorElement | undefined;
  const clear = () => {
    clearTimeout(timer);
    clearTimeout(recovery);
    delete root.dataset.navigationPending;
    if (pending) {
      delete pending.dataset.navigationPending;
      pending.removeAttribute('aria-busy');
      pending = undefined;
    }
  };
  document.addEventListener('click', event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href]') : null;
    if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self') ||
      !isPageNavigation(new URL(location.href), link.href)) return;
    queueMicrotask(() => {
      if (event.defaultPrevented) return;
      clear();
      pending = link;
      link.dataset.navigationPending = 'true';
      link.setAttribute('aria-busy', 'true');
      // Fast page changes need no loading flash.
      timer = setTimeout(() => { root.dataset.navigationPending = 'true'; }, 100);
      recovery = setTimeout(clear, 10000);
    });
  });
  window.addEventListener('pageshow', clear);
  window.addEventListener('pagehide', clear);
}
