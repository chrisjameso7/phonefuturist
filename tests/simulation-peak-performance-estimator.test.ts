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

  it('projects a curated future SoC using a clearly marked same-vendor scenario', () => {
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
    expect(baseline.assumptionApplied).toBe(true);
    expect(baseline.evidenceScope).toBe('same-soc-vendor');
    expect(baseline.note).toContain('automatically selected measured predecessor Exynos 2600');
    expect(
      baseline.sameSocVendorReferences,
    ).toBe(2);
    expect(baseline.baselineExpected).toBeCloseTo(7000, 8);

    expect(uplifted.status).toBe('resolved');
    expect(uplifted.evidenceScope).toBe(
      'same-soc-vendor',
    );
    expect(uplifted.assumptionApplied).toBe(
      true,
    );
    expect(
      uplifted.baselineExpected,
    ).toBeCloseTo(7000, 8);
    expect(
      uplifted.adjustedExpected,
    ).toBeCloseTo(8050, 8);
  });

  it('uses a clearly labelled optimistic Geekbench 6 scenario for Exynos 2700', () => {
    const single = estimatePeakPerformance(corpus, {
      domain: 'geekbench6_single',
      socVendor: 'Samsung',
      socName: 'Exynos 2700',
    });
    expect(single.status).toBe('resolved');
    expect(single.assumptionApplied).toBe(true);
    expect(single.assumedGenerationUpliftPercent).toBe(27);
    expect(single.adjustedExpected).toBeCloseTo(single.baselineExpected! * 1.27, 8);
    expect(single.note).toContain('what-if');

    const multiCorpus: DeviceCorpus = {
      ...corpus,
      measurements: [
        ...corpus.measurements,
        { id: 'a-multi', deviceVariantId: 'a', workload: 'benchmark',
          metric: 'geekbench_6_7_multi_core', value: 10500, unit: 'points', sourceId: 'gb', evidenceKind: 'measured' },
        { id: 'b-multi', deviceVariantId: 'b', workload: 'benchmark',
          metric: 'geekbench_6_7_multi_core', value: 11100, unit: 'points', sourceId: 'gb', evidenceKind: 'measured' },
      ],
    };
    const multi = estimatePeakPerformance(multiCorpus, {
      domain: 'geekbench6_multi', socVendor: 'Samsung', socName: 'Exynos 2700',
    });
    expect(multi.status).toBe('resolved');
    expect(multi.assumedGenerationUpliftPercent).toBe(25);
    expect(multi.adjustedExpected).toBeCloseTo(multi.baselineExpected! * 1.25, 8);
    // Advanced controls always override the preset, including explicit 0.
    const manual = estimatePeakPerformance(multiCorpus, {
      domain: 'geekbench6_multi', socVendor: 'Samsung', socName: 'Exynos 2700',
      assumedGenerationUpliftPercent: 0,
    });
    expect(manual.adjustedExpected).toBeCloseTo(manual.baselineExpected!, 8);
    expect(manual.assumedGenerationUpliftPercent).toBe(0);
  });

  it('does not silently substitute another chip when the selected predecessor is missing', () => {
    const result = estimatePeakPerformance(corpus, {
      domain: 'geekbench6_single',
      socVendor: 'Samsung',
      socName: 'Exynos 2700',
      referenceSocName: 'Exynos 2500',
      assumedGenerationUpliftPercent: 15,
    });
    expect(result.status).toBe('unresolved');
    expect(result.baselineExpected).toBeUndefined();
    expect(result.unresolvedReason).toContain('selected predecessor');
  });

  it('keeps Geekbench and 3DMark completely separate', () => {
    const result = estimatePeakPerformance(
      corpus,
      {
        domain: 'geekbench6_single',
        socVendor: 'Samsung',
        socName: 'Exynos 2600',
      },
    );

    expect(result.status).toBe('resolved');
    expect(result.baselineMax).toBeLessThan(
      4000,
    );
  });

  it('does not fabricate a future Snapdragon peak score from same-vendor references', () => {
    const result =
      estimateLivePeakPerformance({
        domain: 'geekbench6_single',
        socVendor: 'Qualcomm',
        socName: 'Snapdragon Future',
      });

    expect(result.status).toBe('unresolved');
    expect(
      result.sameSocVendorReferences,
    ).toBeGreaterThanOrEqual(2);
    expect(
      result.baselineExpected,
    ).toBeUndefined();
  });

  it('does not fabricate a future Dimensity peak score from same-vendor references', () => {
    const result =
      estimateLivePeakPerformance({
        domain: '3dmark_wle',
        socVendor: 'MediaTek',
        socName: 'Dimensity Future',
      });

    expect(result.status).toBe('unresolved');
    expect(
      result.sameSocVendorReferences,
    ).toBeGreaterThanOrEqual(2);
    expect(
      result.baselineExpected,
    ).toBeUndefined();
  });

  it('provides an assumption-labeled Exynos 2700 baseline when exact evidence is absent', () => {
    const result =
      estimateLivePeakPerformance({
        domain: 'geekbench6_multi',
        manufacturer: 'Samsung',
        socVendor: 'Samsung',
        socName: 'Exynos 2700',
      });

    expect(result.status).toBe('resolved');
    expect(result.assumptionApplied).toBe(true);
    expect(result.sameSocVendorReferences).toBeGreaterThanOrEqual(2);
    expect(result.baselineExpected).toBeGreaterThan(0);
    expect(result.note).toContain('automatically selected measured predecessor Exynos 2600');
  });
});
