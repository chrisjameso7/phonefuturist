import { describe, expect, it } from 'vitest';
import {
  buildDxomarkCurrentBatteryCorpus,
} from '../src/lib/simulation/modules/dxomark-current-battery-corpus';

describe('DXOMARK current battery context', () => {
  it('keeps battery score context separate from raw runtime metrics', () => {
    const corpus =
      buildDxomarkCurrentBatteryCorpus();

    const scores =
      corpus.measurements.filter(
        (measurement) =>
          measurement.metric ===
          'dxomark_battery_score',
      );

    expect(scores.length).toBeGreaterThanOrEqual(17);

    expect(
      scores.every(
        (measurement) =>
          measurement.unit === 'points',
      ),
    ).toBe(true);

    expect(
      corpus.sources.every(
        (source) =>
          source.sourceRole ===
          'measurement-lab',
      ),
    ).toBe(true);
  });

  it('pins Motorola Edge 2025 charging measurements', () => {
    const corpus =
      buildDxomarkCurrentBatteryCorpus();

    const full =
      corpus.measurements.find(
        (measurement) =>
          measurement.deviceVariantId ===
            'dxomark-battery-motorola-edge-2025' &&
          measurement.metric ===
            'dxomark_wired_full_charge_minutes',
      );

    const thirty =
      corpus.measurements.find(
        (measurement) =>
          measurement.deviceVariantId ===
            'dxomark-battery-motorola-edge-2025' &&
          measurement.metric ===
            'dxomark_wired_30m_percent',
      );

    expect(full?.value).toBe(64);
    expect(
      full?.testChargerWatts,
    ).toBe(68);
    expect(thirty?.value).toBe(61);
  });

  it('pins Oppo Find X8 wired and wireless charging measurements', () => {
    const corpus =
      buildDxomarkCurrentBatteryCorpus();

    const wired =
      corpus.measurements.find(
        (measurement) =>
          measurement.deviceVariantId ===
            'dxomark-battery-oppo-find-x8' &&
          measurement.metric ===
            'dxomark_wired_full_charge_minutes',
      );

    const wireless =
      corpus.measurements.find(
        (measurement) =>
          measurement.deviceVariantId ===
            'dxomark-battery-oppo-find-x8' &&
          measurement.metric ===
            'dxomark_wireless_full_charge_minutes',
      );

    expect(wired?.value).toBe(55);
    expect(wired?.testChargerWatts).toBe(80);
    expect(wireless?.value).toBe(79);
    expect(
      wireless?.testChargerWatts,
    ).toBe(50);
  });

  it('does not manufacture wireless data for a phone with no stated wireless charger', () => {
    const corpus =
      buildDxomarkCurrentBatteryCorpus();

    expect(
      corpus.measurements.some(
        (measurement) =>
          measurement.deviceVariantId ===
            'dxomark-battery-honor-x7d-400-smart' &&
          measurement.metric.startsWith(
            'dxomark_wireless_',
          ),
      ),
    ).toBe(false);
  });
});
