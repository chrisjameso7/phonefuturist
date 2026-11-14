import { describe, expect, it } from 'vitest';
import {
  calculateDisplayRefreshProfile,
} from '../src/lib/simulation/modules/display-refresh-profile';

describe('adaptive display refresh profile', () => {
  it('computes time-weighted refresh and pixel throughput', () => {
    const result =
      calculateDisplayRefreshProfile({
        resolutionWidthPx: 1440,
        resolutionHeightPx: 3200,
        states: [
          {
            label: 'idle',
            refreshRateHz: 10,
            dutyFraction: 0.7,
          },
          {
            label: 'interactive',
            refreshRateHz: 120,
            dutyFraction: 0.3,
          },
        ],
      });

    expect(result.status).toBe('resolved');
    expect(
      result.weightedAverageRefreshRateHz,
    ).toBeCloseTo(43, 8);
    expect(
      result.highRefreshDutyPercent,
    ).toBeCloseTo(30, 8);
    expect(
      result.weightedPixelThroughputMpxPerSecond,
    ).toBeCloseTo(
      1440 * 3200 / 1_000_000 * 43,
      8,
    );
  });

  it('refuses to silently renormalize incomplete duty fractions', () => {
    const result =
      calculateDisplayRefreshProfile({
        states: [
          {
            refreshRateHz: 10,
            dutyFraction: 0.5,
          },
          {
            refreshRateHz: 120,
            dutyFraction: 0.3,
          },
        ],
      });

    expect(result.status).toBe(
      'unresolved',
    );
    expect(result.unresolvedReason).toContain(
      'must sum to 1.0',
    );
  });

  it('does not claim weighted refresh equals electrical power behavior', () => {
    const result =
      calculateDisplayRefreshProfile({
        states: [
          {
            refreshRateHz: 1,
            dutyFraction: 0.5,
          },
          {
            refreshRateHz: 120,
            dutyFraction: 0.5,
          },
        ],
      });

    expect(result.note).toContain(
      'not substituted into electrical panel-power calibration',
    );
  });
});
