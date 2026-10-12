import { describe, expect, it } from 'vitest';
import {
  buildGeekerwanChargingCurveCorpus,
  geekerwanChargingCurveCount,
} from '../src/lib/simulation/modules/geekerwan-charging-curve-corpus';

describe('Geekerwan wall-input charging curves', () => {
  it('contains twelve protocol-isolated charging curves', () => {
    const corpus =
      buildGeekerwanChargingCurveCorpus();

    expect(
      geekerwanChargingCurveCount(),
    ).toBe(12);

    expect(
      corpus.devices,
    ).toHaveLength(12);

    expect(
      corpus.sources[0]?.sourceRole,
    ).toBe('measurement-lab');
  });

  it('pins the Galaxy S26 Ultra 30-minute wall-input energy point', () => {
    const corpus =
      buildGeekerwanChargingCurveCorpus();

    const point =
      corpus.measurements.find(
        (measurement) =>
          measurement.deviceVariantId ===
            'geekerwan-charge-samsung-galaxy-s26-ultra' &&
          measurement.metric ===
            'geekerwan_wall_input_energy_wh_at_30m',
      );

    expect(
      point?.value,
    ).toBeCloseTo(
      16.555,
      8,
    );
  });

  it('keeps wall-input energy separate from battery energy', () => {
    const corpus =
      buildGeekerwanChargingCurveCorpus();

    const onePlusEnd =
      corpus.measurements.find(
        (measurement) =>
          measurement.deviceVariantId ===
            'geekerwan-charge-oneplus-15' &&
          measurement.metric ===
            'geekerwan_wall_input_energy_curve_end_wh',
      );

    expect(
      onePlusEnd?.value,
    ).toBeCloseTo(
      31.418,
      8,
    );

    expect(
      onePlusEnd?.notes?.join(' '),
    ).toContain(
      'including charging/circuit losses',
    );
  });
});
