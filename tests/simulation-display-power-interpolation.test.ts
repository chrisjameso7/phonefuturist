import { describe, expect, it } from 'vitest';
import {
  interpolateDisplayPower,
} from '../src/lib/simulation/modules/display-power-interpolation';

describe('measured-only display power interpolation', () => {
  it('interpolates brightness only inside a controlled measured interval', () => {
    const result =
      interpolateDisplayPower({
        axis: 'brightness-nits',
        low: {
          powerW: 1.2,
          brightnessNits: 300,
          averagePictureLevelPercent: 50,
          refreshRateHz: 120,
        },
        high: {
          powerW: 2,
          brightnessNits: 700,
          averagePictureLevelPercent: 50,
          refreshRateHz: 120,
        },
        targetValue: 500,
      });

    expect(result.status).toBe('resolved');
    expect(
      result.interpolationFraction,
    ).toBeCloseTo(0.5, 8);
    expect(result.expectedPowerW).toBeCloseTo(
      1.6,
      8,
    );
  });

  it('refuses extrapolation beyond the measured range', () => {
    const result =
      interpolateDisplayPower({
        axis: 'refresh-hz',
        low: {
          powerW: 1.5,
          brightnessNits: 500,
          averagePictureLevelPercent: 50,
          refreshRateHz: 60,
        },
        high: {
          powerW: 1.9,
          brightnessNits: 500,
          averagePictureLevelPercent: 50,
          refreshRateHz: 120,
        },
        targetValue: 144,
      });

    expect(result.status).toBe('unresolved');
    expect(result.unresolvedReason).toContain(
      'outside the measured interval',
    );
  });

  it('refuses endpoints that change more than one operating variable', () => {
    const result =
      interpolateDisplayPower({
        axis: 'brightness-nits',
        low: {
          powerW: 1.2,
          brightnessNits: 300,
          averagePictureLevelPercent: 50,
          refreshRateHz: 60,
        },
        high: {
          powerW: 2,
          brightnessNits: 700,
          averagePictureLevelPercent: 80,
          refreshRateHz: 120,
        },
        targetValue: 500,
      });

    expect(result.status).toBe('unresolved');
    expect(result.unresolvedReason).toContain(
      'Only one operating variable',
    );
  });
});
