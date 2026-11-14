import { describe, expect, it } from 'vitest';
import {
  clearExpandedDeviceLookupCache,
  findExpandedDevicesByName,
} from '../src/lib/simulation/modules/expanded-device-lookup';

describe('expanded device lookup API', () => {
  it('finds recent phones from the merged catalog', () => {
    clearExpandedDeviceLookupCache();

    const matches =
      findExpandedDevicesByName(
        'Galaxy S26 Ultra',
      );

    expect(matches.length).toBeGreaterThan(0);

    expect(
      matches.some(
        (match) =>
          match.device.variant.identity
            .modelName
            .toLowerCase()
            .includes(
              'galaxy s26 ultra',
            ),
      ),
    ).toBe(true);
  });

  it('caches catalog construction without changing lookup results', () => {
    clearExpandedDeviceLookupCache();

    const first =
      findExpandedDevicesByName(
        'OnePlus 15',
        3,
      );

    const second =
      findExpandedDevicesByName(
        'OnePlus 15',
        3,
      );

    expect(
      second.map(
        (row) =>
          row.device.variant.id,
      ),
    ).toEqual(
      first.map(
        (row) =>
          row.device.variant.id,
      ),
    );
  });
});
