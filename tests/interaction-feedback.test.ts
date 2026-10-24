import { describe, expect, it } from 'vitest';
import { isPageNavigation } from '../src/lib/interaction-client';

describe('native navigation feedback eligibility', () => {
  const current = new URL('https://phonefuturist.example/articles?section=news');
  it('recognizes section and page changes', () => {
    expect(isPageNavigation(current, '/articles?section=reports')).toBe(true);
    expect(isPageNavigation(current, '/interactive-leaks')).toBe(true);
  });
  it('does not flash a loader on current-page links and anchor jumps', () => {
    expect(isPageNavigation(current, current.href)).toBe(false);
    expect(isPageNavigation(current, '#main')).toBe(false);
  });
  it('leaves external and non-page links alone', () => {
    expect(isPageNavigation(current, 'https://other.example/articles')).toBe(false);
    expect(isPageNavigation(current, 'mailto:editor@example.com')).toBe(false);
    expect(isPageNavigation(current, 'tel:+123456789')).toBe(false);
  });
});
