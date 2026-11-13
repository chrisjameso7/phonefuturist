import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const page = readFileSync(new URL('../src/layouts/Page.astro', import.meta.url), 'utf8');
const simulator = readFileSync(new URL('../src/components/interactive-leaks/InteractiveLeaksSimulator.tsx', import.meta.url), 'utf8');
const logo = readFileSync(new URL('../public/assets/phonefuturist-mark.svg', import.meta.url), 'utf8');

describe('share card branding', () => {
  it('uses the exact same SVG asset as the site navigation', () => {
    const asset = '/assets/phonefuturist-mark.svg';
    expect(page).toContain(`src="${asset}"`);
    expect(simulator).toContain(`brandLogo.src = '${asset}'`);
    expect(simulator).toContain(`src="${asset}"`);
    expect(logo).toContain('<svg');
  });

  it('keeps portrait export dimensions', () => {
    expect(simulator).toMatch(/canvas\.width\s*=\s*1080\s*;/);
    expect(simulator).toMatch(/canvas\.height\s*=\s*1350\s*;/);
  });

  it('fails clearly rather than silently exporting without the brand logo', () => {
    expect(simulator).toContain('PhoneFuturist logo could not be loaded for export.');
    expect(simulator).toContain('ctx.drawImage(brandLogo,');
  });
});
