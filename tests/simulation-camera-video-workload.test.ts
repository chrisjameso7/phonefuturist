import { describe, expect, it } from 'vitest';
import {
  calculateCameraVideoWorkload,
} from '../src/lib/simulation/modules/camera-video-workload';

describe('camera video workload', () => {
  it('computes pixel throughput, raw data rate and file size from explicit video settings', () => {
    const result =
      calculateCameraVideoWorkload({
        widthPx: 3840,
        heightPx: 2160,
        frameRateFps: 60,
        bitDepth: 10,
        chromaSubsampling: '4:2:0',
        encodedBitrateMbps: 200,
        recordingDurationMinutes: 10,
      });

    expect(result.status).toBe('resolved');
    expect(
      result.megapixelsPerSecond,
    ).toBeCloseTo(
      3840 *
        2160 /
        1_000_000 *
        60,
      8,
    );
    expect(
      result.uncompressedBitsPerPixel,
    ).toBe(15);
    expect(
      result.uncompressedDataRateGbps,
    ).toBeCloseTo(
      3840 *
        2160 *
        60 *
        15 /
        1_000_000_000,
      8,
    );
    expect(
      result.estimatedFileSizeGb,
    ).toBeCloseTo(15, 8);
  });

  it('calculates recording energy only from explicit pipeline power', () => {
    const result =
      calculateCameraVideoWorkload({
        widthPx: 1920,
        heightPx: 1080,
        frameRateFps: 120,
        cameraPipelinePowerW: 6,
        recordingDurationMinutes: 30,
      });

    expect(
      result.estimatedPipelineEnergyWh,
    ).toBeCloseTo(3, 8);
  });

  it('does not infer codec or pipeline power from resolution and FPS', () => {
    const result =
      calculateCameraVideoWorkload({
        widthPx: 7680,
        heightPx: 4320,
        frameRateFps: 30,
      });

    expect(
      result.encodedBitrateMbps,
    ).toBeUndefined();
    expect(
      result.cameraPipelinePowerW,
    ).toBeUndefined();
    expect(
      result.estimatedPipelineEnergyWh,
    ).toBeUndefined();
    expect(result.note).toContain(
      'pipeline power are not inferred',
    );
  });
});
