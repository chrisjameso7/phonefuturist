import { describe, expect, it } from 'vitest';
import { simulateCameraExperience } from '../src/lib/simulation/live-camera-experience';
import type { DeviceCorpus } from '../src/lib/simulation/modules/device-corpus';

describe('live camera experience', () => {
  it('always exposes deterministic optical geometry from supplied specs', () => {
    const corpus: DeviceCorpus = {
      version: 'empty',
      sources: [],
      devices: [],
      measurements: [],
    };

    const result = simulateCameraExperience(corpus, {
      type: 'wide',
      sensorFormatDenominator: 1.3,
      resolutionMp: 50,
      equivalentFocalLengthMm: 24,
      apertureFNumber: 1.6,
    });

    expect(result.status).toBe('resolved');
    expect(result.physics.approximateSensorAreaMm2).toBeGreaterThan(0);
    expect(result.physics.geometricLightCaptureIndex).toBeGreaterThan(0);
    expect(result.physics.approximatePixelPitchMicrons).toBeGreaterThan(0);
    expect(result.outcomes.every(
      (outcome) => outcome.status === 'unresolved',
    )).toBe(true);
  });

  it('exposes shutter-time and binning sensitivity without inflating total sensor light', () => {
    const corpus: DeviceCorpus = {
      version: 'empty',
      sources: [],
      devices: [],
      measurements: [],
    };

    const result = simulateCameraExperience(corpus, {
      type: 'wide',
      sensorFormatDenominator: 1.3,
      resolutionMp: 200,
      apertureFNumber: 1.7,
      exposureTimeSeconds: 1 / 120,
    });

    const exposure = result.sensitivity.find(
      (scenario) => scenario.scenario === 'longer-exposure',
    );
    const binning = result.sensitivity.find(
      (scenario) => scenario.scenario === 'pixel-binning',
    );

    expect(exposure?.deltaExposureLightPercent).toBeCloseTo(300, 8);
    expect(binning?.deltaTotalLightPercent ?? 0).toBeCloseTo(0, 8);
    expect(
      binning?.deltaBinnedOutputPixelLightPercent,
    ).toBeCloseTo(300, 8);
    expect(
      binning?.physics.effectiveBinnedResolutionMp,
    ).toBeCloseTo(50, 8);
  });

  it('resolves observed camera outcomes only from matching measured evidence', () => {
    const corpus: DeviceCorpus = {
      version: 'test',
      sources: [
        {
          id: 'lab',
          publisher: 'Lab',
          url: 'https://example.com',
        },
      ],
      devices: [
        {
          variant: {
            id: 'near',
            identity: {
              manufacturer: 'Example',
              family: 'Example',
              modelName: 'Near',
            },
          },
          cameras: [
            {
              role: 'wide',
              sensorFormatDenominator: 1.3,
              resolutionMp: 50,
              apertureFNumber: 1.6,
              equivalentFocalLengthMm: 24,
            },
          ],
        },
      ],
      measurements: [
        {
          id: 'shutter',
          deviceVariantId: 'near',
          workload: 'camera',
          metric: 'shutter_lag_ms',
          value: 85,
          unit: 'ms',
          sourceId: 'lab',
          evidenceKind: 'measured',
        },
      ],
    };

    const result = simulateCameraExperience(corpus, {
      type: 'wide',
      sensorFormatDenominator: 1.3,
      resolutionMp: 50,
      equivalentFocalLengthMm: 24,
      apertureFNumber: 1.6,
      manufacturer: 'Example',
    });

    const shutter = result.outcomes.find(
      (outcome) => outcome.domain === 'shutter_lag',
    );
    const lowLight = result.outcomes.find(
      (outcome) => outcome.domain === 'low_light_exposure',
    );

    expect(shutter?.status).toBe('resolved');
    expect(shutter?.value).toBe(85);
    expect(shutter?.referenceCount).toBe(1);
    expect(lowLight?.status).toBe('unresolved');
  });
});
