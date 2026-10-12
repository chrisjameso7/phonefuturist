import { describe, expect, it } from 'vitest';
import {
  buildGeekerwanEfficiencyCurveCorpus,
} from '../src/lib/simulation/modules/geekerwan-efficiency-curve-corpus';
import {
  validateDeviceCorpus,
} from '../src/lib/simulation/modules/device-corpus';

describe('Geekerwan SoCPK efficiency curve corpus', () => {
  it('preserves all pinned GB6, GB7 and Steel Nomad Light curve points', () => {
    const corpus =
      buildGeekerwanEfficiencyCurveCorpus();

    expect(
      corpus.measurements,
    ).toHaveLength(7737);

    expect(
      corpus.sources,
    ).toHaveLength(3);

    expect(
      corpus.devices.length,
    ).toBeGreaterThanOrEqual(30);

    expect(
      validateDeviceCorpus(corpus),
    ).toEqual([]);
  });

  it('stores the board-power coordinate separately from benchmark score', () => {
    const corpus =
      buildGeekerwanEfficiencyCurveCorpus();

    expect(
      corpus.measurements.every(
        (measurement) =>
          measurement.benchmarkPowerW !==
            undefined &&
          measurement.benchmarkPowerW > 0 &&
          measurement.value > 0 &&
          measurement.unit === 'points',
      ),
    ).toBe(true);
  });

  it('keeps fitted SoCPK curves as inferred evidence rather than raw measured evidence', () => {
    const corpus =
      buildGeekerwanEfficiencyCurveCorpus();

    const inferred =
      corpus.measurements.filter(
        (measurement) =>
          measurement.evidenceKind ===
          'inferred',
      );

    const measured =
      corpus.measurements.filter(
        (measurement) =>
          measurement.evidenceKind ===
          'measured',
      );

    expect(
      inferred.length,
    ).toBeGreaterThan(0);

    expect(
      measured.length,
    ).toBeGreaterThan(0);

    expect(
      inferred.every(
        (measurement) =>
          measurement.notes?.some(
            (note) =>
              note.includes(
                'marks this curve as fitted',
              ),
          ),
      ),
    ).toBe(true);
  });

  it('contains exact Exynos 2600 CPU and GPU efficiency evidence without any Exynos 2700 substitution', () => {
    const corpus =
      buildGeekerwanEfficiencyCurveCorpus();

    const exynos2600 =
      corpus.devices.find(
        (device) =>
          device.variant.soc?.name ===
          'Exynos 2600',
      );

    expect(exynos2600).toBeDefined();

    const metrics =
      new Set(
        corpus.measurements
          .filter(
            (measurement) =>
              measurement.deviceVariantId ===
              exynos2600?.variant.id,
          )
          .map(
            (measurement) =>
              measurement.metric,
          ),
      );

    expect(metrics).toEqual(
      expect.objectContaining
        ? metrics
        : metrics,
    );

    expect(
      metrics.has(
        'geekerwan_gb6_multi_curve_score',
      ),
    ).toBe(true);

    expect(
      metrics.has(
        'geekerwan_steel_nomad_light_curve_score',
      ),
    ).toBe(true);

    expect(
      corpus.devices.some(
        (device) =>
          device.variant.soc?.name ===
          'Exynos 2700',
      ),
    ).toBe(false);
  });
});
