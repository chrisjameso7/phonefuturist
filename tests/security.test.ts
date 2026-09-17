import { describe, expect, it } from 'vitest';
import { boundedForm, safeNext, validOrigin, validPassword } from '../src/lib/security';
describe('authentication request boundaries', () => {
  it('rejects foreign and missing origins', () => {
    expect(validOrigin(null, 'https://phonefuturist.test')).toBe(false);
    expect(validOrigin('https://phonefuturist.test.attacker.test', 'https://phonefuturist.test')).toBe(false);
    expect(validOrigin('https://phonefuturist.test', 'https://phonefuturist.test')).toBe(true);
  });
  it('never redirects OAuth callbacks to user-provided external paths', () => {
    for (const input of ['https://evil.test', '//evil.test', '/\\evil.test', '/studio', null]) expect(safeNext(input)).toBe('/account');
    expect(safeNext('/account/password')).toBe('/account/password');
  });
  it('bounds password sizes', () => { expect(validPassword('x'.repeat(11))).toBe(false); expect(validPassword('x'.repeat(12))).toBe(true); expect(validPassword('x'.repeat(129))).toBe(false); });
  it('rejects oversized bodies even without Content-Length', async () => {
    await expect(boundedForm(new Request('https://app.test', { method: 'POST', headers: {'Content-Type':'application/x-www-form-urlencoded'}, body: 'x'.repeat(17000) }))).rejects.toThrow('Form too large');
  });
  it('rejects unsupported content types', async () => {
    await expect(boundedForm(new Request('https://app.test', { method: 'POST', body: '{}' }))).rejects.toThrow('Unsupported form');
  });
});
