import { describe, expect, it } from 'vitest';
import {
  calculateGpuWorkloadDemand,
} from '../src/lib/simulation/modules/gpu-workload-demand';

describe('GPU workload demand', () => {
  it('computes frame budget and pixel throughput deterministically', () => {
    const result =
      calculateGpuWorkloadDemand({
        workload: 'gaming',
        renderWidthPx: 1440,
        renderHeightPx: 3200,
        targetFps: 120,
      });

    expect(result.status).toBe('resolved');
    expect(result.frameBudgetMs).toBeCloseTo(
      1000 / 120,
      8,
    );
    expect(
      result.megapixelsPerFrame,
    ).toBeCloseTo(4.608, 8);
    expect(
      result.megapixelsPerSecond,
    ).toBeCloseTo(552.96, 8);
  });

  it('applies render scale to both dimensions rather than linearly to pixel count', () => {
    const result =
      calculateGpuWorkloadDemand({
        workload: 'gaming',
        renderWidthPx: 2400,
        renderHeightPx: 1080,
        targetFps: 60,
        renderScaleFraction: 0.75,
      });

    expect(
      result.effectiveRenderWidthPx,
    ).toBeCloseTo(1800, 8);
    expect(
      result.effectiveRenderHeightPx,
    ).toBeCloseTo(810, 8);
    expect(
      result.megapixelsPerFrame,
    ).toBeCloseTo(1.458, 8);
  });

  it('keeps complexity explicit and does not treat it as measured GPU performance', () => {
    const result =
      calculateGpuWorkloadDemand({
        workload: 'raster',
        renderWidthPx: 1920,
        renderHeightPx: 1080,
        targetFps: 60,
        relativeComplexity: 1.5,
      });

    expect(
      result.complexityWeightedMegapixelsPerSecond,
    ).toBeCloseTo(
      1920 * 1080 / 1_000_000 * 60 * 1.5,
      8,
    );
    expect(result.note).toContain(
      'do not predict FPS',
    );
  });

  it('converts an explicit bytes-per-pixel traffic assumption into required bandwidth', () => {
    const result =
      calculateGpuWorkloadDemand({
        workload: 'gaming',
        renderWidthPx: 1920,
        renderHeightPx: 1080,
        targetFps: 60,
        estimatedMemoryTrafficBytesPerPixel:
          64,
      });

    expect(
      result.estimatedRequiredMemoryBandwidthGbps,
    ).toBeCloseTo(
      1920 * 1080 / 1_000_000 * 60 * 64 / 1000,
      8,
    );
  });

  it('requires rays per pixel before ray demand is resolved', () => {
    const partialRt =
      calculateGpuWorkloadDemand({
        workload: 'ray-tracing',
        renderWidthPx: 1920,
        renderHeightPx: 1080,
        targetFps: 30,
      });

    const fullRt =
      calculateGpuWorkloadDemand({
        workload: 'ray-tracing',
        renderWidthPx: 1920,
        renderHeightPx: 1080,
        targetFps: 30,
        raysPerPixel: 1.5,
      });

    expect(
      partialRt.megaRaysPerSecondDemand,
    ).toBeUndefined();
    expect(
      fullRt.megaRaysPerSecondDemand,
    ).toBeCloseTo(
      1920 * 1080 / 1_000_000 * 30 * 1.5,
      8,
    );
  });
});
