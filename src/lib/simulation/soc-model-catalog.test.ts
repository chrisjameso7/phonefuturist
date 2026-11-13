import { describe, expect, it } from 'vitest';
import { batterySocEvidenceContext, isSelectableSoc, projectedSocPowerFactor } from './soc-model-catalog';

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

describe('experimental SoC power assumptions', () => {
  it('keeps future Exynos predictions close to the neutral profile', () => {
    expect(projectedSocPowerFactor('Exynos 2700')).toBe(1.02);
    expect(projectedSocPowerFactor('Snapdragon 8 Elite Gen 6')).toBe(0.98);
    expect(1 / projectedSocPowerFactor('Snapdragon 8 Elite Gen 6') - 1 / projectedSocPowerFactor('Exynos 2700')).toBeLessThan(0.05);
  });

  it('keeps unknown chip names neutral instead of inventing an efficiency advantage', () => {
    expect(projectedSocPowerFactor('Imaginary 3000')).toBe(1);
    expect(projectedSocPowerFactor()).toBe(1);
  });
});
