import { describe, expect, it } from 'vitest';
import { calculateCamera } from '../src/lib/simulation/modules/camera';

describe('camera optical plausibility warnings', () => {
  it('flags aggressive long-telephoto fast-aperture combinations', () => {
    const result = calculateCamera({
      type: 'periscope',
      sensorFormatDenominator: 2.0,
      resolutionMp: 50,
      equivalentFocalLengthMm: 120,
      apertureFNumber: 1.6,
    });

    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'AGGRESSIVE_TELEPHOTO_APERTURE',
        }),
      ]),
    );
  });

  it('flags very small native pixel pitch', () => {
    const result = calculateCamera({
      type: 'wide',
      sensorFormatDenominator: 2.0,
      resolutionMp: 200,
      equivalentFocalLengthMm: 24,
      apertureFNumber: 2.0,
    });

    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'VERY_SMALL_PIXEL_PITCH',
        }),
      ]),
    );
  });
});
