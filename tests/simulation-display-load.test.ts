import { describe, expect, it } from 'vitest';
import { calculateDisplayLoad } from '../src/lib/simulation/modules/display-load';

describe('display load model', () => {
  it('scales OLED emissive load with APL and brightness while keeping scan load separate', () => {
    const result = calculateDisplayLoad({
      areaMm2: 11000,
      resolutionWidthPx: 1440,
      resolutionHeightPx: 3200,
      maximumRefreshRateHz: 120,
      operatingRefreshRateHz: 120,
      brightnessNits: 1000,
      averagePictureLevelPercent: 80,
      panelTechnology: 'LTPO AMOLED',
    });

    expect(result.status).toBe('resolved');
    expect(result.emissivePanel).toBe(true);
    expect(result.areaCm2).toBeCloseTo(110, 8);
    expect(result.pixelScanMpxPerSecond).toBeCloseTo(
      552.96,
      8,
    );
    expect(result.emissiveContentLoadIndex).toBeCloseTo(
      88000,
      8,
    );

    const dark = result.scenarios.find(
      (scenario) =>
        scenario.scenario === 'dark-content',
    );
    const sixty = result.scenarios.find(
      (scenario) =>
        scenario.scenario === '60hz-operating',
    );

    expect(
      dark?.deltaEmissionLoadPercent,
    ).toBeCloseTo(-75, 8);

    expect(
      sixty?.deltaPixelScanPercent,
    ).toBeCloseTo(-50, 8);
  });

  it('does not apply OLED APL emission scaling to LCD panels', () => {
    const result = calculateDisplayLoad({
      areaMm2: 11000,
      resolutionWidthPx: 1080,
      resolutionHeightPx: 2400,
      maximumRefreshRateHz: 120,
      operatingRefreshRateHz: 60,
      brightnessNits: 1000,
      averagePictureLevelPercent: 80,
      panelTechnology: 'IPS LCD',
    });

    expect(result.emissivePanel).toBe(false);
    expect(
      result.emissiveContentLoadIndex,
    ).toBeUndefined();
    expect(
      result.pixelScanMpxPerSecond,
    ).toBeGreaterThan(0);
  });

  it('fails closed on invalid APL and operating refresh', () => {
    const result = calculateDisplayLoad({
      averagePictureLevelPercent: 120,
      operatingRefreshRateHz: 0,
      maximumRefreshRateHz: 120,
      panelTechnology: 'OLED',
    });

    expect(result.warnings).toContain(
      'Average picture level must be between 0 and 100 percent.',
    );
    expect(result.warnings).toContain(
      'Operating refresh rate must be a positive finite value.',
    );
  });
});
