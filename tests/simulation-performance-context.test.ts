import { describe, expect, it } from 'vitest';
import {
  buildPerformanceContext,
} from '../src/lib/simulation/modules/performance-context';
import {
  calculateSocArchitecture,
} from '../src/lib/simulation/modules/soc-architecture';
import {
  calculateGpuArchitecture,
} from '../src/lib/simulation/modules/gpu-architecture';
import type {
  PeakPerformanceEstimate,
} from '../src/lib/simulation/modules/peak-performance-estimator';

function peak(
  overrides: Partial<PeakPerformanceEstimate> = {},
): PeakPerformanceEstimate {
  return {
    version: 'test',
    status: 'unresolved',
    domain: 'geekbench6_multi',
    assumptionApplied: false,
    referenceCount: 0,
    neighborIds: [],
    sameSocFamilyReferences: 0,
    sameSocVendorReferences: 2,
    sourceRecordCount: 0,
    publisherCount: 0,
    ...overrides,
  };
}

describe('performance context guardrail', () => {
  it('withholds a future-chip score even when CPU architecture is fully specified', () => {
    const architecture =
      calculateSocArchitecture({
        cpuClusters: [
          {
            cores: 1,
            maxClockGhz: 4.1,
            relativeIpc: 1.15,
          },
          {
            cores: 4,
            maxClockGhz: 3.4,
            relativeIpc: 1.08,
          },
          {
            cores: 5,
            maxClockGhz: 2.9,
            relativeIpc: 1,
          },
        ],
        peakSocPowerW: 10,
        memoryBandwidthGbps: 120,
        fabricationNodeNm: 2,
      });

    const result =
      buildPerformanceContext({
        peak: peak(),
        architecture,
      });

    expect(result.status).toBe('partial');
    expect(result.scoreDisposition).toBe(
      'withheld',
    );
    expect(
      result.benchmarkScore,
    ).toBeUndefined();
    expect(
      result.architectureCanExplainDirection,
    ).toBe(true);
    expect(result.note).toContain(
      'no benchmark points are derived',
    );
  });

  it('preserves exact-family measured score provenance', () => {
    const result =
      buildPerformanceContext({
        peak: peak({
          status: 'resolved',
          evidenceScope:
            'same-soc-family',
          baselineExpected: 11000,
          adjustedExpected: 11000,
          unit: 'points',
          referenceCount: 2,
          sameSocFamilyReferences: 2,
        }),
      });

    expect(result.status).toBe('resolved');
    expect(result.scoreDisposition).toBe(
      'measured-family',
    );
    expect(result.benchmarkScore).toBe(
      11000,
    );
  });

  it('keeps explicit uplift scenarios separate from measured target-family evidence', () => {
    const result =
      buildPerformanceContext({
        peak: peak({
          status: 'resolved',
          evidenceScope:
            'same-soc-vendor',
          baselineExpected: 10000,
          adjustedExpected: 11500,
          assumedGenerationUpliftPercent: 15,
          assumptionApplied: true,
          unit: 'points',
          referenceCount: 2,
        }),
      });

    expect(result.scoreDisposition).toBe(
      'explicit-assumption',
    );
    expect(result.benchmarkScore).toBe(
      11500,
    );
    expect(result.note).toContain(
      'what-if scenario',
    );
  });

  it('uses GPU compute and bandwidth as structural context for raster benchmarks without inventing points', () => {
    const gpuArchitecture =
      calculateGpuArchitecture({
        shaderCores: 1024,
        peakClockGhz: 1.25,
        peakGpuPowerW: 8,
        memoryBandwidthGbps: 120,
      });

    const result =
      buildPerformanceContext({
        peak: peak({
          domain: '3dmark_wle',
        }),
        gpuArchitecture,
      });

    expect(result.status).toBe('partial');
    expect(
      result.architectureCanExplainDirection,
    ).toBe(true);
    expect(
      result.benchmarkScore,
    ).toBeUndefined();
    expect(
      result.architectureSignals.some(
        (signal) =>
          signal.key ===
          'gpu_compute_clock',
      ),
    ).toBe(true);
  });

  it('requires explicit RT geometry before Solar Bay direction is considered explainable', () => {
    const withoutRt =
      calculateGpuArchitecture({
        executionUnits: 16,
        peakClockGhz: 1.3,
        memoryBandwidthGbps: 120,
      });

    const withRt =
      calculateGpuArchitecture({
        executionUnits: 16,
        peakClockGhz: 1.3,
        memoryBandwidthGbps: 120,
        rayTracingUnits: 8,
      });

    const unresolved =
      buildPerformanceContext({
        peak: peak({
          domain: '3dmark_solar_bay',
        }),
        gpuArchitecture: withoutRt,
      });

    const resolvedDirection =
      buildPerformanceContext({
        peak: peak({
          domain: '3dmark_solar_bay',
        }),
        gpuArchitecture: withRt,
      });

    expect(
      unresolved.architectureCanExplainDirection,
    ).toBe(false);
    expect(
      resolvedDirection.architectureCanExplainDirection,
    ).toBe(true);
    expect(
      resolvedDirection.benchmarkScore,
    ).toBeUndefined();
  });

  it('does not let CPU architecture pretend to explain GPU benchmark scores', () => {
    const architecture =
      calculateSocArchitecture({
        cpuClusters: [
          {
            cores: 8,
            maxClockGhz: 3.8,
            relativeIpc: 1,
          },
        ],
        peakSocPowerW: 10,
      });

    const result =
      buildPerformanceContext({
        peak: peak({
          domain: '3dmark_wle',
        }),
        architecture,
      });

    expect(
      result.architectureCanExplainDirection,
    ).toBe(false);
    expect(
      result.warnings.some((warning) =>
        warning.includes(
          'does not predict 3DMark',
        ),
      ),
    ).toBe(true);
  });
});
