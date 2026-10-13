import { describe, expect, it } from 'vitest';
import { projectedDisplayPowerFactor } from './display-power-scenario';

describe('experimental display power model', () => {
  it('uses a neutral reference panel', () => {
    expect(projectedDisplayPowerFactor({ diagonalInches: 6.5, refreshRateHz: 120, resolutionWidthPx: 1080, resolutionHeightPx: 2400 }, 'gaming')).toBeCloseTo(1);
  });
  it('increases battery drain for bigger, faster, higher-resolution displays', () => {
    const small = { diagonalInches: 6.1, refreshRateHz: 60, resolutionWidthPx: 1080, resolutionHeightPx: 2340 };
    const large = { diagonalInches: 6.9, refreshRateHz: 144, resolutionWidthPx: 1440, resolutionHeightPx: 3200 };
    expect(projectedDisplayPowerFactor(large, 'gaming')).toBeGreaterThan(projectedDisplayPowerFactor(small, 'gaming'));
  });
  it('accounts for reduced rendering scale without changing panel size', () => {
    const native = { diagonalInches: 6.7, refreshRateHz: 120, resolutionWidthPx: 1440, resolutionHeightPx: 3200 };
    const scaled = { ...native, renderingWidthPx: 1080, renderingHeightPx: 2400 };
    expect(projectedDisplayPowerFactor(scaled, 'gaming')).toBeLessThan(projectedDisplayPowerFactor(native, 'gaming'));
  });
});
