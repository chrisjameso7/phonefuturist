import { describe, expect, it } from 'vitest';
import {
  calculateSustainedBenchmarkEnvelope,
} from '../src/lib/simulation/modules/sustained-benchmark-envelope';
import type {
  PeakPerformanceEstimate,
} from '../src/lib/simulation/modules/peak-performance-estimator';
import type {
  SustainedPerformanceEstimate,
} from '../src/lib/simulation/modules/sustained-performance-estimator';

function peak(
  overrides: Partial<PeakPerformanceEstimate> = {},
): PeakPerformanceEstimate {
  return {
    version: 'test',
    status: 'resolved',
    domain: '3dmark_wle',
    metric:
      '3dmark_wild_life_extreme_unlimited',
    unit: 'points',
    baselineExpected: 8000,
    baselineMin: 7600,
    baselineMax: 8400,
    adjustedExpected: 8000,
    adjustedMin: 7600,
    adjustedMax: 8400,
    assumptionApplied: false,
    referenceCount: 2,
    neighborIds: ['a', 'b'],
    evidenceScope:
      'same-soc-family',
    sameSocFamilyReferences: 2,
    sameSocVendorReferences: 2,
    sourceRecordCount: 1,
    publisherCount: 1,
    protocolKey: 'wle',
    ...overrides,
  };
}

function sustained(
  overrides: Partial<SustainedPerformanceEstimate> = {},
): SustainedPerformanceEstimate {
  return {
    version: 'test',
    status: 'resolved',
    domain: 'gpu_sustained',
    expectedPercent: 60,
    minPercent: 55,
    maxPercent: 65,
    referenceCount: 2,
    neighborIds: ['a', 'b'],
    evidenceScope:
      'same-soc-family',
    sameSocFamilyReferences: 2,
    sameSocVendorReferences: 2,
    sourceRecordCount: 1,
    publisherCount: 1,
    ...overrides,
  };
}

describe('strict sustained benchmark envelope', () => {
  it('derives a WLE-family sustained score only from exact-family measured evidence', () => {
    const result =
      calculateSustainedBenchmarkEnvelope({
        peak: peak(),
        sustained: sustained(),
      });

    expect(result.status).toBe('resolved');
    expect(
      result.derivedSustainedScore,
    ).toBeCloseTo(4800, 8);
    expect(
      result.derivedMinScore,
    ).toBeCloseTo(4560, 8);
    expect(
      result.derivedMaxScore,
    ).toBeCloseTo(5040, 8);
  });

  it('uses the final calibrated thermal retention when supplied', () => {
    const result =
      calculateSustainedBenchmarkEnvelope({
        peak: peak(),
        sustained: sustained(),
        finalSustainedPerformancePercent:
          50,
      });

    expect(
      result.sustainedRetentionPercent,
    ).toBe(50);
    expect(
      result.derivedSustainedScore,
    ).toBe(4000);
  });

  it('rejects future-chip or assumed peak scores', () => {
    const result =
      calculateSustainedBenchmarkEnvelope({
        peak: peak({
          evidenceScope:
            'same-soc-vendor',
          assumptionApplied: true,
          assumedGenerationUpliftPercent:
            15,
        }),
        sustained: sustained(),
      });

    expect(result.status).toBe('unresolved');
    expect(result.reason).toContain(
      'exact SoC family',
    );
  });

  it('rejects same-vendor sustained priors', () => {
    const result =
      calculateSustainedBenchmarkEnvelope({
        peak: peak(),
        sustained: sustained({
          evidenceScope:
            'same-soc-vendor',
        }),
      });

    expect(result.status).toBe('unresolved');
    expect(result.reason).toContain(
      'exact-family measured evidence',
    );
  });

  it('never combines Geekbench with GPU stability', () => {
    const result =
      calculateSustainedBenchmarkEnvelope({
        peak: peak({
          domain:
            'geekbench6_multi',
        }),
        sustained: sustained(),
      });

    expect(result.status).toBe('unresolved');
    expect(result.note).toContain(
      'never multiplied together',
    );
  });
});
