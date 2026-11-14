import { describe, expect, it } from 'vitest';
import { findComparableCameras } from '../src/lib/simulation/modules/camera-comparables';
import type { DeviceCorpus } from '../src/lib/simulation/modules/device-corpus';

const corpus: DeviceCorpus = {
  version: 'profile-test',
  sources: [],
  devices: [
    {
      variant: {
        id: 'sensor-match',
        identity: {
          manufacturer: 'Other',
          family: 'Sensor',
          modelName: 'Sensor Match',
        },
      },
      cameras: [{
        role: 'wide',
        sensorFormatDenominator: 1.3,
        resolutionMp: 50,
        apertureFNumber: 2.0,
        equivalentFocalLengthMm: 24,
      }],
    },
    {
      variant: {
        id: 'brand-match',
        identity: {
          manufacturer: 'TargetBrand',
          family: 'Brand',
          modelName: 'Brand Match',
        },
      },
      cameras: [{
        role: 'wide',
        sensorFormatDenominator: 2.0,
        resolutionMp: 12,
        apertureFNumber: 1.8,
        equivalentFocalLengthMm: 24,
      }],
    },
  ],
  measurements: [],
};

describe('camera comparable profiles', () => {
  it('lets photo detail favor optical hardware while capture timing rewards manufacturer tuning more', () => {
    const base = {
      type: 'wide' as const,
      sensorFormatDenominator: 1.3,
      resolutionMp: 50,
      apertureFNumber: 1.8,
      equivalentFocalLengthMm: 24,
      manufacturer: 'TargetBrand',
    };

    const detail = findComparableCameras(corpus, {
      ...base,
      profile: 'photo-detail',
    });

    const timing = findComparableCameras(corpus, {
      ...base,
      profile: 'capture-timing',
    });

    expect(detail[0].deviceVariantId).toBe('sensor-match');
    expect(
      timing.findIndex((row) => row.deviceVariantId === 'brand-match'),
    ).toBeLessThan(
      detail.findIndex((row) => row.deviceVariantId === 'brand-match'),
    );
  });
});
