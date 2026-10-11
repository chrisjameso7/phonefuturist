import { describe, expect, it } from 'vitest';
import {
  calculateGpuPowerEnvelope,
} from '../src/lib/simulation/modules/gpu-power-envelope';

describe('GPU sustainable power envelope', () => {
  it('calculates power headroom without claiming performance equivalence', () => {
    const result =
      calculateGpuPowerEnvelope({
        workload: 'gpu_sustained',
        peakGpuPowerW: 10,
        sustainableSocPowerW: 6,
      });

    expect(result.status).toBe('resolved');
    expect(
      result.sustainableGpuPowerCeilingW,
    ).toBe(6);
    expect(
      result.powerRetentionPercent,
    ).toBeCloseTo(60, 8);
    expect(
      result.thermallyPowerLimited,
    ).toBe(true);
    expect(result.note).toContain(
      'not a sustained-performance percentage',
    );
  });

  it('caps the sustainable GPU ceiling at peak GPU power when package power is higher', () => {
    const result =
      calculateGpuPowerEnvelope({
        workload: 'gaming_sustained',
        peakGpuPowerW: 8,
        sustainableSocPowerW: 12,
      });

    expect(result.status).toBe('resolved');
    expect(
      result.sustainableGpuPowerCeilingW,
    ).toBe(8);
    expect(
      result.powerRetentionPercent,
    ).toBe(100);
    expect(
      result.thermallyPowerLimited,
    ).toBe(false);
  });

  it('stays partial when only one side of the envelope is known', () => {
    const result =
      calculateGpuPowerEnvelope({
        workload: 'ray_tracing',
        peakGpuPowerW: 9,
      });

    expect(result.status).toBe('partial');
    expect(
      result.powerRetentionPercent,
    ).toBeUndefined();
  });
});
