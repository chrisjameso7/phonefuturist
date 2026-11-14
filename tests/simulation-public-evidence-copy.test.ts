import { describe, expect, it } from 'vitest';
import { publicEvidenceText } from '../src/lib/simulation/public-evidence-copy';

describe('public simulation evidence copy', () => {
  it('hides publisher names and direct source URLs from explanations', () => {
    const text = publicEvidenceText(
      'Geekerwan and GSMArena alongside DXOMARK, PhoneArena, NanoReview, SOCPK and TechAPI: https://example.com/test',
    );
    expect(text).not.toMatch(/Geekerwan|GSMArena|DXOMARK|PhoneArena|NanoReview|SOCPK|TechAPI|https?:/i);
    expect(text).toContain('independent measurement data');
  });

  it('preserves numerical results and evidence caveats', () => {
    expect(publicEvidenceText('55 W, estimated 43 min, extrapolated from Geekerwan measurements'))
      .toContain('55 W, estimated 43 min, extrapolated');
    expect(publicEvidenceText(undefined)).toBe('');
  });
});
