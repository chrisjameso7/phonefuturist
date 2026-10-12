import { describe, expect, it } from 'vitest';
import {
  dividePositiveIntervals,
  multiplyPositiveIntervals,
  normalizeUncertaintyInterval,
  scaleInterval,
} from '../src/lib/simulation/modules/uncertainty-interval';

describe('uncertainty interval propagation', () => {
  it('preserves an explicit non-midpoint expected value', () => {
    const result =
      normalizeUncertaintyInterval({
        min: 5000,
        expected: 5700,
        max: 6000,
      });

    expect(result.status).toBe('resolved');
    expect(
      result.interval?.expected,
    ).toBe(5700);
  });

  it('multiplies positive intervals conservatively', () => {
    const result =
      multiplyPositiveIntervals(
        {
          min: 2,
          expected: 3,
          max: 4,
        },
        {
          min: 5,
          expected: 6,
          max: 7,
        },
      );

    expect(result.interval).toEqual({
      min: 10,
      expected: 18,
      max: 28,
    });
  });

  it('divides positive intervals using conservative endpoints', () => {
    const result =
      dividePositiveIntervals(
        {
          min: 8,
          expected: 10,
          max: 12,
        },
        {
          min: 2,
          expected: 4,
          max: 5,
        },
      );

    expect(
      result.interval?.min,
    ).toBeCloseTo(8 / 5, 8);
    expect(
      result.interval?.expected,
    ).toBeCloseTo(2.5, 8);
    expect(
      result.interval?.max,
    ).toBeCloseTo(6, 8);
  });

  it('handles negative scalar direction when scaling', () => {
    const result =
      scaleInterval(
        {
          min: 2,
          expected: 3,
          max: 4,
        },
        -2,
      );

    expect(result.interval).toEqual({
      min: -8,
      expected: -6,
      max: -4,
    });
  });

  it('rejects invalid interval ordering instead of repairing it', () => {
    const result =
      normalizeUncertaintyInterval({
        min: 10,
        expected: 5,
        max: 20,
      });

    expect(result.status).toBe(
      'unresolved',
    );
  });
});
