import { describe, expect, it } from 'vitest';
import { mergeDeviceCorpora } from '../src/lib/simulation/modules/corpus-merge';
import { findComparableDevices } from '../src/lib/simulation/modules/comparable-devices';
import type { DeviceCorpus } from '../src/lib/simulation/modules/device-corpus';

const a: DeviceCorpus = {
  version: 'a',
  sources: [{ id: 's1', publisher: 'Lab', url: 'https://example.com/1' }],
  devices: [{
    variant: {
      id: 'alpha',
      identity: { manufacturer: 'Samsung', family: 'Galaxy', modelName: 'Alpha' },
      battery: { capacityMah: 5000 },
      soc: { vendor: 'Qualcomm', name: 'Chip A' },
    },
    display: { diagonalInches: 6.8 },
  }],
  measurements: [],
};

const b: DeviceCorpus = {
  version: 'b',
  sources: [{ id: 's2', publisher: 'Lab 2', url: 'https://example.com/2' }],
  devices: [{
    variant: {
      id: 'beta',
      identity: { manufacturer: 'OnePlus', family: 'OnePlus', modelName: 'Beta' },
      battery: { capacityMah: 6000 },
      soc: { vendor: 'Qualcomm', name: 'Chip B' },
    },
    display: { diagonalInches: 6.82 },
  }],
  measurements: [],
};

describe('merged corpus and comparable-device selection', () => {
  it('merges corpora without flattening variants', () => {
    const merged = mergeDeviceCorpora([a, b]);
    expect(merged.corpus.devices).toHaveLength(2);
    expect(merged.warnings).toEqual([]);
  });

  it('ranks the closest device instead of averaging the whole market', () => {
    const merged = mergeDeviceCorpora([a, b]).corpus;
    const matches = findComparableDevices(merged, {
      batteryMah: 5900,
      socVendor: 'Qualcomm',
      displayDiagonalInches: 6.8,
    });

    expect(matches[0].device.variant.id).toBe('beta');
    expect(matches[0].score).toBeGreaterThan(matches[1].score);
  });
});
