import { describe, expect, it } from 'vitest';
import {
  estimateLivePeakPerformance,
  estimatePeakPerformance,
} from '../src/lib/simulation/modules/peak-performance-estimator';
import type { DeviceCorpus } from '../src/lib/simulation/modules/device-corpus';

const corpus: DeviceCorpus = {
  version: 'peak-test',
  sources: [
    {
      id: 'gb',
      publisher: 'Lab',
      url: 'https://example.com/gb',
      protocol: 'Geekbench 6.7.1',
    },
    {
      id: 'wle',
      publisher: 'Lab',
      url: 'https://example.com/wle',
      protocol: '3DMark Wild Life Extreme Unlimited',
    },
  ],
  devices: [
    {
      variant: {
        id: 'a',
        identity: {
          manufacturer: 'Example',
          family: 'Phone A',
          modelName: 'Phone A',
        },
        soc: {
          vendor: 'Samsung',
          name: 'Exynos 2600',
        },
      },
    },
    {
      variant: {
        id: 'b',
        identity: {
          manufacturer: 'Example',
          family: 'Phone B',
          modelName: 'Phone B',
        },
        soc: {
          vendor: 'Samsung',
          name: 'Exynos 2600',
        },
      },
    },
    {
      variant: {
        id: 'c',
        identity: {
          manufacturer: 'Example',
          family: 'Phone C',
          modelName: 'Phone C',
        },
        soc: {
          vendor: 'Qualcomm',
          name: 'Snapdragon X',
        },
      },
    },
  ],
  measurements: [
    {
      id: 'a-single',
      deviceVariantId: 'a',
      workload: 'benchmark',
      metric: 'geekbench_6_7_single_core',
      value: 3000,
      unit: 'points',
      sourceId: 'gb',
      evidenceKind: 'measured',
    },
    {
      id: 'b-single',
      deviceVariantId: 'b',
      workload: 'benchmark',
      metric: 'geekbench_6_7_single_core',
      value: 3200,
      unit: 'points',
      sourceId: 'gb',
      evidenceKind: 'measured',
    },
    {
      id: 'c-single',
      deviceVariantId: 'c',
      workload: 'benchmark',
      metric: 'geekbench_6_7_single_core',
      value: 5000,
      unit: 'points',
      sourceId: 'gb',
      evidenceKind: 'measured',
    },
    {
      id: 'a-wle',
      deviceVariantId: 'a',
      workload: 'benchmark',
      metric: '3dmark_wild_life_extreme_unlimited',
      value: 6800,
      unit: 'points',
      sourceId: 'wle',
      evidenceKind: 'measured',
    },
    {
      id: 'b-wle',
      deviceVariantId: 'b',
      workload: 'benchmark',
      metric: '3dmark_wild_life_extreme_unlimited',
      value: 7200,
      unit: 'points',
      sourceId: 'wle',
      evidenceKind: 'measured',
    },
  ],
};

describe('peak performance estimator', () => {
  it('uses same-family measured peak evidence without mixing benchmark protocols', () => {
    const result = estimatePeakPerformance(
      corpus,
      {
        domain: 'geekbench6_single',
        socVendor: 'Samsung',
        socName: 'Exynos 2600',
      },
    );

    expect(result.status).toBe('resolved');
    expect(result.evidenceScope).toBe(
      'same-soc-family',
    );
    expect(result.referenceCount).toBe(2);
    expect(result.baselineExpected).toBeGreaterThan(
      2999,
    );
    expect(result.baselineExpected).toBeLessThan(
      3201,
    );
    expect(result.metric).toBe(
      'geekbench_6_7_single_core',
    );
    expect(result.neighborIds.sort()).toEqual([
      'a',
      'b',
    ]);
  });

  it('uses same-vendor evidence for a future SoC and applies uplift only when explicitly supplied', () => {
    const baseline = estimatePeakPerformance(
      corpus,
      {
        domain: '3dmark_wle',
        socVendor: 'Samsung',
        socName: 'Exynos 2700',
      },
    );

    const uplifted = estimatePeakPerformance(
      corpus,
      {
        domain: '3dmark_wle',
        socVendor: 'Samsung',
        socName: 'Exynos 2700',
        assumedGenerationUpliftPercent: 15,
      },
    );

    expect(baseline.status).toBe('resolved');
    expect(baseline.evidenceScope).toBe(
      'same-soc-vendor',
    );
    expect(baseline.assumptionApplied).toBe(
      false,
    );

    expect(uplifted.assumptionApplied).toBe(
      true,
    );
    expect(
      uplifted.adjustedExpected,
    ).toBeCloseTo(
      baseline.baselineExpected! * 1.15,
      8,
    );
    expect(
      uplifted.baselineExpected,
    ).toBeCloseTo(
      baseline.baselineExpected!,
      8,
    );
  });

  it('keeps Geekbench and 3DMark completely separate', () => {
    const result = estimatePeakPerformance(
      corpus,
      {
        domain: 'geekbench6_single',
        socVendor: 'Samsung',
      },
    );

    expect(result.status).toBe('resolved');
    expect(result.baselineMax).toBeLessThan(
      4000,
    );
  });

  it('resolves a future Snapdragon peak prior from same-vendor measured references', () => {
    const result =
      estimateLivePeakPerformance({
        domain: 'geekbench6_single',
        socVendor: 'Qualcomm',
        socName: 'Snapdragon Future',
      });

    expect(result.status).toBe('resolved');
    expect(result.evidenceScope).toBe(
      'same-soc-vendor',
    );
    expect(
      result.sameSocVendorReferences,
    ).toBeGreaterThanOrEqual(2);
    expect(result.baselineExpected).toBeGreaterThan(
      3400,
    );
    expect(result.baselineExpected).toBeLessThan(
      3900,
    );
  });

  it('resolves a future Dimensity peak prior from same-vendor measured references', () => {
    const result =
      estimateLivePeakPerformance({
        domain: '3dmark_wle',
        socVendor: 'MediaTek',
        socName: 'Dimensity Future',
      });

    expect(result.status).toBe('resolved');
    expect(result.evidenceScope).toBe(
      'same-soc-vendor',
    );
    expect(
      result.sameSocVendorReferences,
    ).toBeGreaterThanOrEqual(2);
    expect(result.baselineExpected).toBeGreaterThan(
      7000,
    );
    expect(result.baselineExpected).toBeLessThan(
      7800,
    );
  });

  it('resolves a live Exynos 2700 peak prior from measured Exynos 2600 references', () => {
    const result =
      estimateLivePeakPerformance({
        domain: 'geekbench6_multi',
        manufacturer: 'Samsung',
        socVendor: 'Samsung',
        socName: 'Exynos 2700',
      });

    expect(result.status).toBe('resolved');
    expect(result.evidenceScope).toBe(
      'same-soc-vendor',
    );
    expect(
      result.sameSocVendorReferences,
    ).toBeGreaterThanOrEqual(2);
    expect(result.baselineExpected).toBeGreaterThan(
      10000,
    );
    expect(result.baselineExpected).toBeLessThan(
      11500,
    );
  });
});
