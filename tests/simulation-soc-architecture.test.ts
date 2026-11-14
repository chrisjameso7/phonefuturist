import { describe, expect, it } from 'vitest';
import {
  calculateSocArchitecture,
  compareSocArchitectures,
} from '../src/lib/simulation/modules/soc-architecture';

describe('SoC architecture indices', () => {
  it('computes transparent clock/core capacity without inventing IPC', () => {
    const result = calculateSocArchitecture({
      cpuClusters: [
        {
          label: 'prime',
          cores: 1,
          maxClockGhz: 3.8,
        },
        {
          label: 'performance',
          cores: 3,
          maxClockGhz: 3.3,
        },
        {
          label: 'efficiency',
          cores: 6,
          maxClockGhz: 2.8,
        },
      ],
      fabricationNodeNm: 2,
    });

    expect(result.status).toBe('partial');
    expect(result.totalCpuCores).toBe(10);
    expect(
      result.maximumCpuClockGhz,
    ).toBeCloseTo(3.8, 8);
    expect(
      result.clockCapacityIndex,
    ).toBeCloseTo(30.5, 8);
    expect(
      result.ipcAdjustedAggregateIndex,
    ).toBeUndefined();
    expect(result.completeIpcCoverage).toBe(
      false,
    );
    expect(
      result.warnings.some((warning) =>
        warning.includes(
          'does not infer performance or efficiency gains from node size',
        ),
      ),
    ).toBe(true);
  });

  it('computes IPC-adjusted and per-watt indices only from explicitly supplied values', () => {
    const result = calculateSocArchitecture({
      cpuClusters: [
        {
          cores: 1,
          maxClockGhz: 4,
          relativeIpc: 1.2,
        },
        {
          cores: 4,
          maxClockGhz: 3,
          relativeIpc: 1,
        },
      ],
      peakSocPowerW: 10,
      memoryBandwidthGbps: 100,
    });

    expect(result.status).toBe('resolved');
    expect(
      result.ipcAdjustedSingleThreadIndex,
    ).toBeCloseTo(4.8, 8);
    expect(
      result.ipcAdjustedAggregateIndex,
    ).toBeCloseTo(16.8, 8);
    expect(
      result.ipcAdjustedAggregatePerWIndex,
    ).toBeCloseTo(1.68, 8);
    expect(
      result.memoryBandwidthPerCoreGbps,
    ).toBeCloseTo(20, 8);
  });

  it('compares architectures without claiming benchmark-score equivalence', () => {
    const reference = calculateSocArchitecture({
      cpuClusters: [
        {
          cores: 1,
          maxClockGhz: 3.8,
          relativeIpc: 1,
        },
        {
          cores: 3,
          maxClockGhz: 3.3,
          relativeIpc: 1,
        },
        {
          cores: 6,
          maxClockGhz: 2.8,
          relativeIpc: 1,
        },
      ],
      peakSocPowerW: 10,
    });

    const target = calculateSocArchitecture({
      cpuClusters: [
        {
          cores: 1,
          maxClockGhz: 4,
          relativeIpc: 1.1,
        },
        {
          cores: 4,
          maxClockGhz: 3.4,
          relativeIpc: 1.05,
        },
        {
          cores: 5,
          maxClockGhz: 2.9,
          relativeIpc: 1,
        },
      ],
      peakSocPowerW: 10,
    });

    const comparison =
      compareSocArchitectures(
        target,
        reference,
      );

    expect(
      comparison.clockCapacityDeltaPercent,
    ).toBeGreaterThan(0);
    expect(
      comparison.ipcAdjustedAggregateDeltaPercent,
    ).toBeGreaterThan(0);
    expect(comparison.note).toContain(
      'do not automatically translate into Geekbench',
    );
  });
});
