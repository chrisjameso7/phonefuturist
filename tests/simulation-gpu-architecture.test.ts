import { describe, expect, it } from 'vitest';
import {
  calculateGpuArchitecture,
} from '../src/lib/simulation/modules/gpu-architecture';

describe('GPU architecture model', () => {
  it('computes structural GPU indices without inventing benchmark points', () => {
    const result =
      calculateGpuArchitecture({
        shaderCores: 1024,
        peakClockGhz: 1.2,
        peakGpuPowerW: 8,
        memoryBandwidthGbps: 120,
        textureUnits: 64,
        renderOutputUnits: 32,
      });

    expect(result.status).toBe('resolved');
    expect(
      result.computeGeometrySource,
    ).toBe('shader-cores');
    expect(
      result.rawComputeClockIndex,
    ).toBeCloseTo(1228.8, 8);
    expect(
      result.rawComputePerWIndex,
    ).toBeCloseTo(153.6, 8);
    expect(
      result.bandwidthPerComputeUnit,
    ).toBeCloseTo(
      120 / 1024,
      8,
    );
  });

  it('uses relative architecture efficiency only when explicitly supplied', () => {
    const result =
      calculateGpuArchitecture({
        executionUnits: 16,
        peakClockGhz: 1.4,
        peakGpuPowerW: 7,
        relativeArchitectureEfficiency:
          1.15,
      });

    expect(
      result.efficiencyAdjustedComputeIndex,
    ).toBeCloseTo(
      16 * 1.4 * 1.15,
      8,
    );
    expect(
      result.efficiencyAdjustedComputePerWIndex,
    ).toBeCloseTo(
      (16 * 1.4 * 1.15) / 7,
      8,
    );
    expect(
      result.completeEfficiencyCoverage,
    ).toBe(true);
  });

  it('records process node as metadata without converting it into a performance multiplier', () => {
    const result =
      calculateGpuArchitecture({
        shaderCores: 512,
        peakClockGhz: 1,
        fabricationNodeNm: 2,
      });

    expect(
      result.rawComputeClockIndex,
    ).toBe(512);
    expect(
      result.efficiencyAdjustedComputeIndex,
    ).toBeUndefined();
    expect(
      result.warnings.some(
        (warning) =>
          warning.includes(
            'does not create an automatic GPU performance',
          ),
      ),
    ).toBe(true);
  });

  it('keeps ray tracing unresolved when RT geometry is absent', () => {
    const result =
      calculateGpuArchitecture({
        executionUnits: 12,
        peakClockGhz: 1.3,
        memoryBandwidthGbps: 100,
      });

    expect(
      result.rayTracingUnits,
    ).toBeUndefined();
    expect(
      result.rayTracingDensityPerComputeUnit,
    ).toBeUndefined();
    expect(
      result.warnings.some(
        (warning) =>
          warning.includes(
            'Ray-tracing throughput remains unresolved',
          ),
      ),
    ).toBe(true);
  });
});
