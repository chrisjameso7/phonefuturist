import { describe, expect, it } from 'vitest';
import { findComparableDevices } from '../src/lib/simulation/modules/comparable-devices';
import type { DeviceCorpus } from '../src/lib/simulation/modules/device-corpus';

describe('SoC-family comparable matching', () => {
  it('treats Snapdragon for Galaxy as the same base SoC family', () => {
    const corpus: DeviceCorpus = {
      version: 'soc-family',
      sources: [],
      devices: [
        {
          variant: {
            id: 'standard',
            identity: {
              manufacturer: 'A',
              family: 'A',
              modelName: 'Standard',
            },
            soc: {
              vendor: 'Qualcomm',
              name: 'Snapdragon 8 Elite Gen 5',
            },
          },
        },
        {
          variant: {
            id: 'galaxy',
            identity: {
              manufacturer: 'Samsung',
              family: 'Galaxy',
              modelName: 'Galaxy',
            },
            soc: {
              vendor: 'Qualcomm',
              name: 'Snapdragon 8 Elite Gen 5 for Galaxy',
            },
          },
        },
      ],
      measurements: [],
    };

    const matches = findComparableDevices(
      corpus,
      {
        socVendor: 'Qualcomm',
        socName: 'Snapdragon 8 Elite Gen 5',
      },
    );

    expect(matches).toHaveLength(2);
    expect(
      matches.every((match) =>
        match.reasons.includes('same SoC family'),
      ),
    ).toBe(true);
  });
});
