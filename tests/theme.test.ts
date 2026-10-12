import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const script = readFileSync(
  new URL('../public/theme-init.js', import.meta.url),
  'utf8'
);

describe('Early Access appearance', () => {
  it('always renders the PhoneFuturist dark theme', () => {
    const dataset: Record<string, string> = {};
    let removed = '';

    runInNewContext(script, {
      document: {
        documentElement: { dataset },
      },
      localStorage: {
        removeItem: (key: string) => { removed = key; },
      },
    });

    expect(dataset).toEqual({
      theme: 'dark',
      themePreference: 'dark',
    });
    expect(removed).toBe('phonefuturist-theme');
  });

  it('still renders dark when storage is blocked', () => {
    const dataset: Record<string, string> = {};

    expect(() => runInNewContext(script, {
      document: {
        documentElement: { dataset },
      },
      localStorage: {
        removeItem: () => { throw Error('blocked'); },
      },
    })).not.toThrow();

    expect(dataset.theme).toBe('dark');
    expect(dataset.themePreference).toBe('dark');
  });
});
