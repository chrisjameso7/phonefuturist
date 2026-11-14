import { describe, expect, it } from 'vitest';
import {
  buildGeekerwanBatteryCorpus,
  geekerwanBatteryRowCount,
} from '../src/lib/simulation/modules/geekerwan-battery-corpus';

describe('Geekerwan Battery Life 5.0 corpus', () => {
  it('tracks the live 80-phone SOCPK chart', () => {
    const corpus =
      buildGeekerwanBatteryCorpus();

    expect(
      geekerwanBatteryRowCount(),
    ).toBe(80);

    expect(
      corpus.devices,
    ).toHaveLength(80);

    expect(
      corpus.sources[0]?.sourceRole,
    ).toBe('measurement-lab');
  });

  it('pins known Galaxy S26 Ultra and Pixel 10 Pro XL results', () => {
    const corpus =
      buildGeekerwanBatteryCorpus();

    const s26 =
      corpus.measurements.find(
        (measurement) =>
          measurement.deviceVariantId ===
            'geekerwan-battery-samsung-galaxy-s26-ultra' &&
          measurement.metric ===
            'geekerwan_battery_life_5_0_hours',
      );

    const pixel =
      corpus.measurements.find(
        (measurement) =>
          measurement.deviceVariantId ===
            'geekerwan-battery-google-pixel-10-pro-xl' &&
          measurement.metric ===
            'geekerwan_battery_life_5_0_hours',
      );

    expect(s26?.value).toBeCloseTo(
      7.25,
      8,
    );

    expect(pixel?.value).toBeCloseTo(
      5 + 51 / 60,
      8,
    );
  });

  it('keeps published Wh values source-derived and leaves absent values unknown', () => {
    const corpus =
      buildGeekerwanBatteryCorpus();

    const s26Energy =
      corpus.measurements.find(
        (measurement) =>
          measurement.deviceVariantId ===
            'geekerwan-battery-samsung-galaxy-s26-ultra' &&
          measurement.metric ===
            'geekerwan_published_battery_energy_wh',
      );

    const iphone18Energy =
      corpus.measurements.find(
        (measurement) =>
          measurement.deviceVariantId ===
            'geekerwan-battery-apple-iphone-18-pro-max' &&
          measurement.metric ===
            'geekerwan_published_battery_energy_wh',
      );

    expect(
      s26Energy?.value,
    ).toBeCloseTo(18.94, 8);

    expect(
      iphone18Energy,
    ).toBeUndefined();
  });
});
