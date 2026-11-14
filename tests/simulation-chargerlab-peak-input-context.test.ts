import { describe, expect, it } from 'vitest';
import {
  estimateChargerLabPeakInputContext,
} from '../src/lib/simulation/modules/chargerlab-peak-input-context';

describe('ChargerLAB peak input context', () => {
  it('builds a bounded Samsung 60 W peak-input envelope from recent measured peers', () => {
    const result =
      estimateChargerLabPeakInputContext(
        'Samsung',
        60,
        20,
      );

    expect(result.status).toBe('resolved');
    expect(result.referenceCount).toBe(2);
    expect(result.referenceModels).toEqual(
      expect.arrayContaining([
        'Galaxy S26 Ultra',
        'Galaxy S25 Ultra',
      ]),
    );

    expect(
      result.observedPeakMinW,
    ).toBeCloseTo(51.54, 2);

    expect(
      result.observedPeakExpectedW,
    ).toBeGreaterThan(51.54);

    expect(
      result.observedPeakExpectedW,
    ).toBeLessThan(
      result.observedPeakMaxW!,
    );

    expect(result.note).toContain(
      'not a full-charge-time prediction',
    );
  });

  it('does not borrow a Samsung charging ratio for an unrelated manufacturer', () => {
    const result =
      estimateChargerLabPeakInputContext(
        'Example',
        60,
      );

    expect(result.status).toBe(
      'unresolved',
    );
    expect(result.referenceCount).toBe(0);
  });

  it('fails closed on invalid advertised charging power', () => {
    const result =
      estimateChargerLabPeakInputContext(
        'Samsung',
        0,
      );

    expect(result.status).toBe(
      'unresolved',
    );
  });
});
