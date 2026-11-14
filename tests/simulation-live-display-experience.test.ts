import { describe, expect, it } from 'vitest';
import { simulateLiveDisplayExperience } from '../src/lib/simulation/live-display-experience';

describe('live display experience', () => {
  it('keeps electrical panel watts unresolved without isolated live-corpus measurements', () => {
    const result = simulateLiveDisplayExperience({
      diagonalInches: 6.8,
      resolutionWidthPx: 1440,
      resolutionHeightPx: 3200,
      refreshRateHz: 120,
      operatingRefreshRateHz: 120,
      brightnessNits: 500,
      averagePictureLevelPercent: 50,
      panelTechnology: 'LTPO OLED',
    });

    expect(
      result.electricalPower.status,
    ).toBe('unresolved');
    expect(
      result.electricalPower.expectedPowerW,
    ).toBeUndefined();
    expect(
      result.electricalPower.referenceCount,
    ).toBe(0);
  });


  it('calculates deterministic pixel throughput and display scenarios', () => {
    const result = simulateLiveDisplayExperience({
      diagonalInches: 6.7,
      resolutionWidthPx: 1440,
      resolutionHeightPx: 3200,
      aspectWidth: 9,
      aspectHeight: 20,
      refreshRateHz: 120,
      brightnessNits: 1000,
      panelTechnology: 'LTPO OLED',
    });

    expect(result.status).toBe('resolved');
    expect(result.megapixelsPerFrame).toBeCloseTo(4.608, 6);
    expect(
      result.pixelThroughputMpxPerSecond,
    ).toBeCloseTo(552.96, 6);
    expect(result.refreshMultiplierVs60).toBeCloseTo(2, 6);
    expect(result.rasterLoadIndex).toBeCloseTo(
      552.96 / 155.52,
      6,
    );
    expect(result.luminanceAreaNitCm2).toBeGreaterThan(0);

    const sixty = result.scenarios.find(
      (scenario) => scenario.scenario === '60hz',
    );
    const lowerResolution = result.scenarios.find(
      (scenario) =>
        scenario.scenario === '1080-class',
    );

    expect(sixty?.deltaPixelThroughputPercent).toBeCloseTo(
      -50,
      6,
    );
    expect(
      lowerResolution?.pixelThroughputMpxPerSecond,
    ).toBeCloseTo(311.04, 6);
    expect(
      lowerResolution?.deltaPixelThroughputPercent,
    ).toBeCloseTo(-43.75, 6);
  });

  it('fails closed on invalid refresh and brightness inputs', () => {
    const result = simulateLiveDisplayExperience({
      resolutionWidthPx: 1080,
      resolutionHeightPx: 2400,
      refreshRateHz: 0,
      brightnessNits: -1,
    });

    expect(result.warnings).toContain(
      'Refresh rate must be a positive finite value.',
    );
    expect(result.warnings).toContain(
      'Brightness must be a positive finite value.',
    );
  });
});
