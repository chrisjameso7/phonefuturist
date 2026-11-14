import { describe, expect, it } from 'vitest';
import {
  buildCalibrationRegistry,
  clearCalibrationRegistryCache,
} from '../src/lib/simulation/modules/calibration-registry';
import {
  estimateGeekerwanGb6Multi,
} from '../src/lib/simulation/modules/geekerwan-gb6-estimator';

describe('Geekerwan Geekbench 6 estimator', () => {
  it('resolves only an exact SoC-family score', () => {
    clearCalibrationRegistryCache();
    const corpus =
      buildCalibrationRegistry();

    const result =
      estimateGeekerwanGb6Multi(
        corpus,
        {
          socVendor: 'Qualcomm',
          socName:
            'Snapdragon 8 Elite Gen 5',
        },
      );

    expect(result.status).toBe(
      'resolved',
    );
    expect(
      result.expectedScore,
    ).toBe(12352);
    expect(
      result.evidenceScope,
    ).toBe(
      'same-soc-family',
    );
  });

  it('keeps Exynos 2700 unresolved while showing Samsung context', () => {
    clearCalibrationRegistryCache();
    const corpus =
      buildCalibrationRegistry();

    const result =
      estimateGeekerwanGb6Multi(
        corpus,
        {
          socVendor: 'Samsung',
          socName: 'Exynos 2700',
        },
      );

    expect(result.status).toBe(
      'unresolved',
    );
    expect(
      result.sameVendorContextCount,
    ).toBeGreaterThan(0);
    expect(
      result.expectedScore,
    ).toBeUndefined();
  });

  it('does not cross-label Geekerwan GB6 as Geekbench 6.7', () => {
    clearCalibrationRegistryCache();
    const corpus =
      buildCalibrationRegistry();

    const rows =
      corpus.measurements.filter(
        (measurement) =>
          measurement.sourceId ===
          'geekerwan-geekbench6-ranking',
      );

    expect(rows.length).toBeGreaterThanOrEqual(
      35,
    );

    expect(
      rows.every(
        (row) =>
          row.metric ===
          'geekerwan_geekbench_6_multi_core',
      ),
    ).toBe(true);
  });
});
