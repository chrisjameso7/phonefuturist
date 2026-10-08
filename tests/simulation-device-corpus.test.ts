import { describe, expect, it } from 'vitest';
import {
  validateDeviceCorpus,
  type DeviceCorpus,
} from '../src/lib/simulation/modules/device-corpus';

describe('device corpus schema', () => {
  it('accepts variant-aware measurements with explicit sources', () => {
    const corpus: DeviceCorpus = {
      version: 'test',
      sources: [
        {
          id: 'source-1',
          publisher: 'Example Lab',
          url: 'https://example.com/test',
          protocol: 'Web runtime',
        },
      ],
      devices: [
        {
          variant: {
            id: 'device-a-snapdragon',
            identity: {
              manufacturer: 'Example',
              family: 'Example',
              modelName: 'Example Phone',
              region: 'Region A',
            },
            battery: { capacityMah: 5000 },
            soc: { vendor: 'Qualcomm', name: 'Example Snapdragon' },
          },
          sourceIds: ['source-1'],
        },
      ],
      measurements: [
        {
          id: 'measurement-1',
          deviceVariantId: 'device-a-snapdragon',
          workload: 'web_browsing',
          metric: 'runtime',
          value: 18,
          unit: 'hours',
          sourceId: 'source-1',
          evidenceKind: 'measured',
        },
      ],
    };

    expect(validateDeviceCorpus(corpus)).toEqual([]);
  });

  it('rejects measurements that cannot be joined to a known variant', () => {
    const corpus: DeviceCorpus = {
      version: 'test',
      sources: [
        {
          id: 'source-1',
          publisher: 'Example Lab',
          url: 'https://example.com/test',
        },
      ],
      devices: [],
      measurements: [
        {
          id: 'measurement-1',
          deviceVariantId: 'missing',
          workload: 'gaming',
          metric: 'runtime',
          value: 8,
          unit: 'hours',
          sourceId: 'source-1',
          evidenceKind: 'measured',
        },
      ],
    };

    expect(validateDeviceCorpus(corpus).some(
      (issue) => issue.code === 'MISSING_VARIANT',
    )).toBe(true);
  });
});
