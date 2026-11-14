import { describe, expect, it } from 'vitest';
import { findComparableCameras } from '../src/lib/simulation/modules/camera-comparables';
import type { DeviceCorpus } from '../src/lib/simulation/modules/device-corpus';

describe('camera optical overlap requirement', () => {
  it('excludes same-role cameras with no comparable optical fields', () => {
    const corpus: DeviceCorpus = {
      version: 'no-optical-overlap',
      sources: [],
      devices: [
        {
          variant: {
            id: 'role-only',
            identity: {
              manufacturer: 'Example',
              family: 'Example',
              modelName: 'Role Only',
            },
          },
          cameras: [{ role: 'wide' }],
        },
      ],
      measurements: [],
    };

    const matches = findComparableCameras(corpus, {
      type: 'wide',
      sensorFormatDenominator: 1.3,
      resolutionMp: 50,
      apertureFNumber: 1.8,
      equivalentFocalLengthMm: 24,
    });

    expect(matches).toHaveLength(0);
  });
});
