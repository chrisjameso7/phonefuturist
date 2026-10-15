import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('public Interactive Leaks route', () => {
  const middleware = readFileSync(new URL('../src/middleware.ts', import.meta.url), 'utf8');
  const redirect = readFileSync(new URL('../src/pages/interactive-leaks/simulate.astro', import.meta.url), 'utf8');

  it('keeps legacy /simulate as a public redirect instead of an early-access page', () => {
    expect(redirect).toContain("Astro.redirect('/interactive-leaks', 302)");
    expect(middleware).toContain("const earlyAccessPage = path.startsWith('/interactive-leaks/api/')");
    expect(middleware).not.toMatch(/earlyAccessPage\s*=\s*path\s*===\s*['"]\/interactive-leaks\/simulate['"]/);
  });

  it('preserves the existing protected lab API checks', () => {
    expect(middleware).toContain("path.startsWith('/interactive-leaks/api/')");
    expect(middleware).toContain("rpc('lab_early_access_status')");
  });
});
