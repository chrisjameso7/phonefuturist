import { describe, expect, it } from 'vitest';
import {
  findDeviceByName,
} from '../src/lib/simulation/modules/device-lookup';
import type {
  DeviceCorpus,
} from '../src/lib/simulation/modules/device-corpus';

describe('device lookup trust ordering', () => {
  it('prefers a higher-trust catalog identity when names score equally', () => {
    const corpus: DeviceCorpus = {
      version: 'test',
      sources: [],
      measurements: [],
      devices: [
        {
          catalogTrust:
            'source-backed-unverified',
          variant: {
            id: 'low-trust',
            identity: {
              manufacturer: 'Example',
              family: 'Phone X',
              modelName: 'Phone X',
            },
          },
        },
        {
          catalogTrust:
            'verified-or-unspecified',
          variant: {
            id: 'higher-trust',
            identity: {
              manufacturer: 'Example',
              family: 'Phone X',
              modelName: 'Phone X',
            },
          },
        },
      ],
    };

    const matches =
      findDeviceByName(
        corpus,
        'Example Phone X',
      );

    expect(
      matches[0]?.device.variant.id,
    ).toBe('higher-trust');
    expect(
      matches.find(
        (match) =>
          match.device.variant.id ===
          'low-trust',
      )?.reasons,
    ).toContain(
      'lower-trust catalog metadata',
    );
  });
});
