import { describe, expect, it } from 'vitest';
import {
  buildPhoneArenaCurrentBatteryCorpus,
} from '../src/lib/simulation/modules/phonearena-current-battery-corpus';
import {
  buildPhoneArenaCurrentChargingCorpus,
} from '../src/lib/simulation/modules/phonearena-current-charging-corpus';

describe('PhoneArena current 2025-2026 cohorts', () => {
  it('keeps a broad modern battery cohort', () => {
    const corpus =
      buildPhoneArenaCurrentBatteryCorpus();

    expect(
      corpus.devices.length,
    ).toBeGreaterThanOrEqual(80);

    expect(
      corpus.measurements.length,
    ).toBe(
      corpus.devices.length * 4,
    );

    expect(
      corpus.sources[0]?.sourceRole,
    ).toBe('measurement-lab');
  });

  it('keeps a broad wired charging cohort across slow and fast charging classes', () => {
    const corpus =
      buildPhoneArenaCurrentChargingCorpus();

    expect(
      corpus.devices.length,
    ).toBeGreaterThanOrEqual(70);

    const wiredWatts =
      corpus.devices
        .map(
          (device) =>
            device.charging
              ?.referenceWiredWatts,
        )
        .filter(
          (
            value,
          ): value is number =>
            value !== undefined,
        );

    expect(
      Math.min(...wiredWatts),
    ).toBeLessThanOrEqual(20);
    expect(
      Math.max(...wiredWatts),
    ).toBeGreaterThanOrEqual(120);
  });

  it('uses the corrected Edge 70 Pro charging measurement', () => {
    const corpus =
      buildPhoneArenaCurrentChargingCorpus();

    const full =
      corpus.measurements.find(
        (measurement) =>
          measurement.deviceVariantId ===
            'pa-charge-edge70-pro' &&
          measurement.metric ===
            'wiredFullChargeMinutes',
      );

    const thirty =
      corpus.measurements.find(
        (measurement) =>
          measurement.deviceVariantId ===
            'pa-charge-edge70-pro' &&
          measurement.metric ===
            'charge30mPercent',
      );

    expect(
      full?.testChargerWatts,
    ).toBe(90);
    expect(full?.value).toBe(56);
    expect(thirty?.value).toBe(64);
  });

  it('keeps untested 30-minute charging fields unknown', () => {
    const corpus =
      buildPhoneArenaCurrentChargingCorpus();

    const redmiFull =
      corpus.measurements.find(
        (measurement) =>
          measurement.deviceVariantId ===
            'pa-charge-redmi-note14-pro-plus' &&
          measurement.metric ===
            'wiredFullChargeMinutes',
      );

    const redmiThirty =
      corpus.measurements.find(
        (measurement) =>
          measurement.deviceVariantId ===
            'pa-charge-redmi-note14-pro-plus' &&
          measurement.metric ===
            'charge30mPercent',
      );

    expect(redmiFull?.value).toBe(25);
    expect(
      redmiThirty,
    ).toBeUndefined();
  });
});
