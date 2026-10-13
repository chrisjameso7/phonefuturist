import { describe, expect, it } from 'vitest';
import { batterySocEvidenceContext, isSelectableSoc } from './soc-model-catalog';

describe('SoC evidence gates', () => {
  it('allows documented Exynos preview chips in the picker without inventing battery evidence', () => {
    expect(isSelectableSoc('Samsung', 'Exynos 2700')).toBe(true);
    expect(batterySocEvidenceContext('Samsung', 'Exynos 2700')).toEqual({
      experimental: true,
      socVendor: undefined,
      socName: undefined,
    });
  });

  it('does not strip evidence context from released SoCs', () => {
    expect(batterySocEvidenceContext('Samsung', 'Exynos 2600')).toEqual({
      experimental: false,
      socVendor: 'Samsung',
      socName: 'Exynos 2600',
    });
  });

  it('rejects unsupported future processors', () => {
    expect(isSelectableSoc('Samsung', 'Exynos 3000')).toBe(false);
  });
});
