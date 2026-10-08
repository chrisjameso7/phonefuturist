import { describe, expect, it } from 'vitest';
import { findComparableCameras } from '../src/lib/simulation/modules/camera-comparables';
import type { DeviceCorpus } from '../src/lib/simulation/modules/device-corpus';

const corpus: DeviceCorpus = {
  version: 'test',
  sources: [],
  measurements: [],
  devices: [
    {
      variant: {
        id: 'large-fast',
        identity: { manufacturer: 'A', family: 'A', modelName: 'Large Fast' },
      },
      cameras: [{
        role: 'wide',
        sensorFormatDenominator: 1.3,
        resolutionMp: 50,
        apertureFNumber: 1.6,
        equivalentFocalLengthMm: 24,
      }],
    },
    {
      variant: {
        id: 'small-slow',
        identity: { manufacturer: 'B', family: 'B', modelName: 'Small Slow' },
      },
      cameras: [{
        role: 'wide',
        sensorFormatDenominator: 2.0,
        resolutionMp: 50,
        apertureFNumber: 2.2,
        equivalentFocalLengthMm: 24,
      }],
    },
  ],
};

describe('camera comparable selection', () => {
  it('prefers a camera with similar sensor area and aperture', () => {
    const result = findComparableCameras(corpus, {
      type: 'wide',
      sensorFormatDenominator: 1.28,
      resolutionMp: 50,
      apertureFNumber: 1.6,
      equivalentFocalLengthMm: 24,
      limit: 2,
    });

    expect(result[0].deviceVariantId).toBe('large-fast');
    expect(result[0].reasons).toContain('similar sensor area');
    expect(result[0].reasons).toContain('similar aperture');
  });
});
