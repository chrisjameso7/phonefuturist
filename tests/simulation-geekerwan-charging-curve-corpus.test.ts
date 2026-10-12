import { describe, expect, it } from 'vitest';
import {
  buildGeekerwanChargingCurveCorpus,
  geekerwanChargingCurveCount,
  geekerwanDetailedCurveCount,
} from '../src/lib/simulation/modules/geekerwan-charging-curve-corpus';

describe('Geekerwan wall-input charging curves', () => {
  it('contains the full 74-phone metadata cohort plus twelve detailed curves', () => {
    const corpus =
      buildGeekerwanChargingCurveCorpus();

    expect(
      geekerwanChargingCurveCount(),
    ).toBe(74);

    expect(
      geekerwanDetailedCurveCount(),
    ).toBe(12);

    expect(
      corpus.devices,
    ).toHaveLength(74);

    expect(
      corpus.sources[0]?.sourceRole,
    ).toBe('measurement-lab');
  });

  it('pins charger metadata from the SOCPK API', () => {
    const corpus =
      buildGeekerwanChargingCurveCorpus();

    const s26 =
      corpus.devices.find(
        (device) =>
          device.variant.id ===
          'geekerwan-charge-samsung-galaxy-s26-ultra',
      );

    const onePlus =
      corpus.devices.find(
        (device) =>
          device.variant.id ===
          'geekerwan-charge-oneplus-15',
      );

    expect(
      s26?.charging?.referenceWiredWatts,
    ).toBe(60);

    expect(
      onePlus?.charging?.referenceWiredWatts,
    ).toBe(120);
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
