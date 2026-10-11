import { describe, expect, it } from 'vitest';
import {
  calculateCameraSensorNoise,
} from '../src/lib/simulation/modules/camera-sensor-noise';

describe('camera sensor electron-domain noise', () => {
  it('computes dynamic range from full well and read noise', () => {
    const result =
      calculateCameraSensorNoise({
        fullWellElectrons: 40000,
        readNoiseElectrons: 2,
      });

    expect(result.status).toBe('partial');
    expect(
      result.dynamicRangeStops,
    ).toBeCloseTo(
      Math.log2(40000 / 2),
      8,
    );
    expect(
      result.dynamicRangeDb,
    ).toBeCloseTo(
      20 * Math.log10(40000 / 2),
      8,
    );
  });

  it('adds dark-current shot noise over the explicit exposure window', () => {
    const result =
      calculateCameraSensorNoise({
        fullWellElectrons: 40000,
        readNoiseElectrons: 2,
        darkCurrentElectronsPerSecond: 100,
        exposureTimeSeconds: 1,
      });

    expect(
      result.darkElectronsDuringExposure,
    ).toBe(100);
    expect(
      result.darkShotNoiseElectrons,
    ).toBeCloseTo(10, 8);
    expect(
      result.effectiveNoiseFloorElectrons,
    ).toBeCloseTo(
      Math.sqrt(104),
      8,
    );
  });

  it('computes electron-domain SNR and saturation headroom from explicit signal electrons', () => {
    const result =
      calculateCameraSensorNoise({
        fullWellElectrons: 40000,
        readNoiseElectrons: 2,
        signalElectrons: 10000,
      });

    expect(result.status).toBe('resolved');
    expect(
      result.signalToNoiseRatio,
    ).toBeGreaterThan(0);
    expect(
      result.saturationHeadroomElectrons,
    ).toBe(30000);
    expect(
      result.saturationFraction,
    ).toBeCloseTo(0.25, 8);
  });

  it('never infers sensor electronics from geometry alone', () => {
    const result =
      calculateCameraSensorNoise({});

    expect(result.status).toBe(
      'unresolved',
    );
    expect(result.note).toContain(
      'never inferred from sensor size',
    );
  });
});
