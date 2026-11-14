import { describe, expect, it } from 'vitest';
import { findComparableCameras } from '../src/lib/simulation/modules/camera-comparables';
import type { DeviceCorpus } from '../src/lib/simulation/modules/device-corpus';

const corpus: DeviceCorpus = {
  version: 'role-filter',
  sources: [],
  devices: [
    {
      variant: {
        id: 'wide-device',
        identity: {
          manufacturer: 'A',
          family: 'A',
          modelName: 'Wide',
        },
      },
      cameras: [{
        role: 'wide',
        sensorFormatDenominator: 1.3,
        resolutionMp: 50,
        apertureFNumber: 1.8,
      }],
    },
    {
      variant: {
        id: 'tele-device',
        identity: {
          manufacturer: 'B',
          family: 'B',
          modelName: 'Tele',
        },
      },
      cameras: [{
        role: 'telephoto',
        sensorFormatDenominator: 1.3,
        resolutionMp: 50,
        apertureFNumber: 1.8,
      }],
    },
  ],
  measurements: [],
};

describe('camera comparable role compatibility', () => {
  it('never returns telephoto modules for a wide-camera query', () => {
    const matches = findComparableCameras(corpus, {
      type: 'wide',
      sensorFormatDenominator: 1.3,
      resolutionMp: 50,
      apertureFNumber: 1.8,
    });

    expect(matches).toHaveLength(1);
    expect(matches[0].role).toBe('wide');
    expect(matches[0].deviceVariantId).toBe('wide-device');
  });
});
