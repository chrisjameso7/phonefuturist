import { describe, expect, it } from 'vitest';
import {
  calculateGpuArchitecture,
} from '../src/lib/simulation/modules/gpu-architecture';
import {
  calculateGpuPowerEnvelope,
} from '../src/lib/simulation/modules/gpu-power-envelope';
import {
  calculateGpuWorkloadDemand,
} from '../src/lib/simulation/modules/gpu-workload-demand';
import {
  interpretGpuWorkloadResponse,
} from '../src/lib/simulation/modules/gpu-workload-response';

describe('GPU workload response interpretation', () => {
  it('surfaces a power constraint without turning it into FPS retention', () => {
    const architecture =
      calculateGpuArchitecture({
        shaderCores: 1024,
        peakClockGhz: 1.2,
        peakGpuPowerW: 10,
        memoryBandwidthGbps: 120,
      });

    const envelope =
      calculateGpuPowerEnvelope({
        workload: 'gaming_sustained',
        peakGpuPowerW: 10,
        sustainableSocPowerW: 6,
      });

    const demand =
      calculateGpuWorkloadDemand({
        workload: 'gaming',
        renderWidthPx: 2400,
        renderHeightPx: 1080,
        targetFps: 120,
      });

    const result =
      interpretGpuWorkloadResponse({
        architecture,
        powerEnvelope: envelope,
        demand,
      });

    expect(result.status).toBe('resolved');
    expect(result.state).toBe(
      'power-constrained',
    );
    expect(result.powerPressure).toBe(
      'moderate',
    );
    expect(
      result.powerRetentionPercent,
    ).toBeCloseTo(60, 8);
    expect(
      result.theoreticalBandwidthBytesPerRenderedPixel,
    ).toBeGreaterThan(0);
    expect(
      result.structuralComputeIndexPerWeightedMegapixelPerSecond,
    ).toBeGreaterThan(0);
    expect(result.note).toContain(
      'does not estimate FPS',
    );
  });

  it('treats raster demand as contextualized when architecture, demand and power are all present', () => {
    const result =
      interpretGpuWorkloadResponse({
        architecture:
          calculateGpuArchitecture({
            executionUnits: 16,
            peakClockGhz: 1.4,
            peakGpuPowerW: 8,
            memoryBandwidthGbps: 100,
          }),
        powerEnvelope:
          calculateGpuPowerEnvelope({
            workload: 'gpu_sustained',
            peakGpuPowerW: 8,
            sustainableSocPowerW: 10,
          }),
        demand:
          calculateGpuWorkloadDemand({
            workload: 'raster',
            renderWidthPx: 1920,
            renderHeightPx: 1080,
            targetFps: 60,
          }),
      });

    expect(result.status).toBe('resolved');
    expect(result.state).toBe(
      'fully-contextualized',
    );
    expect(result.architectureCoverage).toBe(
      'raster',
    );
    expect(result.powerPressure).toBe('none');
  });

  it('flags an explicit memory-bandwidth over-budget workload', () => {
    const result =
      interpretGpuWorkloadResponse({
        architecture:
          calculateGpuArchitecture({
            shaderCores: 512,
            peakClockGhz: 1.1,
            memoryBandwidthGbps: 10,
          }),
        demand:
          calculateGpuWorkloadDemand({
            workload: 'gaming',
            renderWidthPx: 3840,
            renderHeightPx: 2160,
            targetFps: 120,
            estimatedMemoryTrafficBytesPerPixel:
              128,
          }),
      });

    expect(
      result.memoryBandwidthPressure,
    ).toBe('over-budget');
    expect(
      result.memoryBandwidthHeadroomGbps,
    ).toBeLessThan(0);
    expect(
      result.bottleneckSignals.some(
        (signal) =>
          signal.includes(
            'memory-traffic estimate exceeds',
          ),
      ),
    ).toBe(true);
  });

  it('flags missing RT geometry for ray-tracing demand', () => {
    const result =
      interpretGpuWorkloadResponse({
        architecture:
          calculateGpuArchitecture({
            executionUnits: 16,
            peakClockGhz: 1.3,
            memoryBandwidthGbps: 100,
          }),
        demand:
          calculateGpuWorkloadDemand({
            workload: 'ray-tracing',
            renderWidthPx: 1920,
            renderHeightPx: 1080,
            targetFps: 30,
            raysPerPixel: 1,
          }),
      });

    expect(result.architectureCoverage).toBe(
      'raster',
    );
    expect(
      result.bottleneckSignals.some(
        (signal) =>
          signal.includes(
            'RT-unit geometry is missing',
          ),
      ),
    ).toBe(true);
  });
});
