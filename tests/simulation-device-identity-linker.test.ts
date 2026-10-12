import { describe, expect, it } from 'vitest';
import {
  linkDeviceIdentities,
  resolveCanonicalDeviceId,
} from '../src/lib/simulation/modules/device-identity-linker';
import type {
  DeviceCorpus,
} from '../src/lib/simulation/modules/device-corpus';

const corpus: DeviceCorpus = {
  version: 'test',
  sources: [],
  measurements: [],
  devices: [
    {
      variant: {
        id: 'techapi-samsung-galaxy-s25-ultra',
        identity: {
          manufacturer: 'Samsung',
          family: 'Galaxy S25 Ultra',
          modelName: 'Galaxy S25 Ultra',
        },
      },
    },
    {
      variant: {
        id: 'phonearena-galaxy-s25-ultra-5000',
        identity: {
          manufacturer: 'Samsung',
          family: 'Galaxy S25 Ultra',
          modelName: 'Galaxy S25 Ultra',
        },
      },
    },
    {
      variant: {
        id: 'pa-charge-s25-ultra',
        identity: {
          manufacturer: 'Samsung',
          family: 'Galaxy S25 Ultra',
          modelName: 'Galaxy S25 Ultra 5G',
        },
      },
    },
    {
      variant: {
        id: 'geekerwan-soc-snapdragon-8-elite',
        identity: {
          manufacturer: 'Geekerwan SoC Reference',
          family: 'Snapdragon 8 Elite',
          modelName: 'Snapdragon 8 Elite',
        },
      },
    },
  ],
};

describe('cross-source device identity linker', () => {
  it('links source-specific device records onto the catalog identity', () => {
    const links =
      linkDeviceIdentities(
        corpus,
      );

    expect(links).toHaveLength(1);

    expect(
      links[0].canonicalDeviceId,
    ).toBe(
      'techapi-samsung-galaxy-s25-ultra',
    );

    expect(
      links[0].linkedDeviceIds,
    ).toEqual(
      expect.arrayContaining([
        'techapi-samsung-galaxy-s25-ultra',
        'phonearena-galaxy-s25-ultra-5000',
        'pa-charge-s25-ultra',
      ]),
    );
  });

  it('resolves a lab-specific id back to the canonical catalog device', () => {
    expect(
      resolveCanonicalDeviceId(
        corpus,
        'pa-charge-s25-ultra',
      ),
    ).toBe(
      'techapi-samsung-galaxy-s25-ultra',
    );
  });

  it('does not treat SoC-only reference records as retail phone identities', () => {
    expect(
      resolveCanonicalDeviceId(
        corpus,
        'geekerwan-soc-snapdragon-8-elite',
      ),
    ).toBe(
      'geekerwan-soc-snapdragon-8-elite',
    );
  });
});
