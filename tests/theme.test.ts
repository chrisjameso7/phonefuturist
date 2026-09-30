import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const script = readFileSync(
  new URL('../public/theme-init.js', import.meta.url),
  'utf8'
);

function boot(saved: string | null = null, denied = false) {
  const events: Record<string, Function> = {};

  const choices = [
    {
      value: '',
      addEventListener: (_name: string, fn: Function) => {
        events.choice = fn;
      },
    },
  ];

  const dataset: Record<string, string> = {};

  const system = {
    matches: true,
    addEventListener: (_name: string, fn: Function) => {
      events.system = fn;
    },
  };

  let stored = saved;

  runInNewContext(script, {
    matchMedia: () => system,

    localStorage: {
      getItem: () => {
        if (denied) throw Error('blocked');
        return stored;
      },

      setItem: (_key: string, value: string) => {
        if (denied) throw Error('blocked');
        stored = value;
      },
    },

    document: {
      documentElement: { dataset },

      querySelectorAll: () => choices,

      addEventListener: (name: string, fn: Function) => {
        events[name] = fn;
      },
    },

    addEventListener: (name: string, fn: Function) => {
      events[name] = fn;
    },
  });

  const beforeReady = { ...dataset };
  events.DOMContentLoaded();

  return {
    dataset,
    beforeReady,
    system,
    events,
    choices,
    stored: () => stored,
  };
}

describe('theme preference integration', () => {
  it('keeps System as the preference while resolving the current dark theme', () => {
    const browser = boot();

    expect(browser.dataset.themePreference).toBe('system');
    expect(browser.dataset.theme).toBe('dark');
  });

  it('follows system appearance changes while preference is System', () => {
    const browser = boot();

    expect(browser.dataset.theme).toBe('dark');

    browser.system.matches = false;
    browser.events.system();

    expect(browser.dataset.themePreference).toBe('system');
    expect(browser.dataset.theme).toBe('light');
  });

  it('persists a manual Light override', () => {
    const browser = boot();

    browser.choices[0].value = 'light';
    browser.events.choice();

    expect(browser.stored()).toBe('light');
    expect(browser.dataset.themePreference).toBe('light');
    expect(browser.dataset.theme).toBe('light');

    browser.system.matches = true;
    browser.events.system();

    expect(browser.dataset.theme).toBe('light');
  });

  it('persists a manual Dark override', () => {
    const browser = boot();

    browser.choices[0].value = 'dark';
    browser.events.choice();

    expect(browser.stored()).toBe('dark');
    expect(browser.dataset.themePreference).toBe('dark');
    expect(browser.dataset.theme).toBe('dark');
  });

  it('returns to live system appearance when reset to System', () => {
    const browser = boot('light');

    expect(browser.dataset.themePreference).toBe('light');
    expect(browser.dataset.theme).toBe('light');

    browser.system.matches = true;
    browser.choices[0].value = 'system';
    browser.events.choice();

    expect(browser.stored()).toBe('system');
    expect(browser.dataset.themePreference).toBe('system');
    expect(browser.dataset.theme).toBe('dark');

    browser.system.matches = false;
    browser.events.system();

    expect(browser.dataset.theme).toBe('light');
  });

  it('loads a saved override before DOM readiness', () => {
    const browser = boot('light');

    expect(browser.dataset.themePreference).toBe('light');
    expect(browser.dataset.theme).toBe('light');
  });

  it('continues working when localStorage is blocked', () => {
    const browser = boot(null, true);

    expect(browser.dataset.themePreference).toBe('system');
    expect(browser.dataset.theme).toBe('dark');

    browser.choices[0].value = 'light';

    expect(() => browser.events.choice()).not.toThrow();

    expect(browser.dataset.themePreference).toBe('light');
    expect(browser.dataset.theme).toBe('light');
  });

  it('synchronizes another tab', () => {
    const browser = boot();

    browser.events.storage({
      key: 'phonefuturist-theme',
      newValue: 'light',
    });

    expect(browser.choices[0].value).toBe('light');
    expect(browser.dataset.themePreference).toBe('light');
    expect(browser.dataset.theme).toBe('light');
  });

  it('sanitizes invalid saved preferences back to System', () => {
    const browser = boot('definitely-not-a-theme');

    expect(browser.dataset.themePreference).toBe('system');
    expect(browser.dataset.theme).toBe('dark');
  });
});

describe('AMOLED preference', () => {
  it('can be explicitly selected and survives a reload', () => {
    const browser = boot();
    browser.choices[0].value = 'amoled';
    browser.events.choice();
    expect(browser.dataset).toEqual({ theme:'amoled', themePreference:'amoled' });
    expect(browser.stored()).toBe('amoled');
    const reloaded = boot(browser.stored());
    expect(reloaded.dataset).toEqual(browser.dataset);
    expect(reloaded.beforeReady).toEqual(browser.dataset);
    expect(reloaded.choices[0].value).toBe('amoled');
  });
  it('synchronizes to another tab', () => {
    const source = boot();
    const other = boot('light');
    source.choices[0].value = 'amoled'; source.events.choice();
    other.events.storage({key:'phonefuturist-theme',newValue:source.stored()});
    expect(other.dataset.theme).toBe('amoled');
    expect(other.dataset.themePreference).toBe('amoled');
    expect(other.choices[0].value).toBe('amoled');
  });
  it('is not overridden by either OS appearance', () => {
    const browser = boot('amoled');
    for (const dark of [false,true,false]) {
      browser.system.matches=dark; browser.events.system();
      expect(browser.dataset.theme).toBe('amoled');
      expect(browser.dataset.themePreference).toBe('amoled');
    }
  });
  it('returns from AMOLED to System without resolving System to AMOLED', () => {
    const browser=boot('amoled');
    browser.choices[0].value='system'; browser.events.choice();
    for (const dark of [false,true,false]) {
      browser.system.matches=dark; browser.events.system();
      expect(browser.dataset.theme).toBe(dark?'dark':'light');
      expect(browser.dataset.themePreference).toBe('system');
    }
  });
  it('falls back safely for invalid cross-tab values and storage clearing', () => {
    const browser=boot('amoled');
    browser.system.matches=false;
    for (const value of ['AMOLED','black','invalid',null]) {
      browser.events.storage({key:'phonefuturist-theme',newValue:value});
      expect(browser.dataset.themePreference).toBe('system');
      expect(browser.dataset.theme).toBe('light');
    }
  });
  it('allows session-only AMOLED when storage is blocked', () => {
    const browser=boot(null,true);
    browser.choices[0].value='amoled';
    expect(()=>browser.events.choice()).not.toThrow();
    expect(browser.dataset.theme).toBe('amoled');
  });
});
