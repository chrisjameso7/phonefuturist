import { describe, expect, it } from 'vitest';
import { resolveCorpusRuntimeBand } from '../src/lib/simulation/modules/corpus-runtime';
import type { DeviceCorpus } from '../src/lib/simulation/modules/device-corpus';
import type { SimulationInput } from '../src/lib/simulation/types';

const corpus: DeviceCorpus = {
  version: 'test',
  sources: [{ id: 'lab', publisher: 'Lab', url: 'https://example.com' }],
  devices: [
    {
      variant: {
        id: 'near',
        identity: { manufacturer: 'A', family: 'A', modelName: 'Near' },
        battery: { capacityMah: 5000 },
      },
      display: { diagonalInches: 6.8 },
      dimensions: { thicknessMm: 8.2, weightG: 220 },
    },
    {
      variant: {
        id: 'far',
        identity: { manufacturer: 'B', family: 'B', modelName: 'Far' },
        battery: { capacityMah: 7000 },
      },
      display: { diagonalInches: 6.3 },
      dimensions: { thicknessMm: 7.0, weightG: 175 },
    },
  ],
  measurements: [
    {
      id: 'near-web',
      deviceVariantId: 'near',
      workload: 'web_browsing',
      metric: 'runtime',
      value: 20,
      unit: 'hours',
      sourceId: 'lab',
      evidenceKind: 'measured',
    },
    {
      id: 'far-web',
      deviceVariantId: 'far',
      workload: 'web_browsing',
      metric: 'runtime',
      value: 18,
      unit: 'hours',
      sourceId: 'lab',
      evidenceKind: 'measured',
    },
  ],
};

const input: SimulationInput = {
  formFactor: 'phone',
  displays: { primary: { diagonalInches: 6.8 } },
  dimensions: { thicknessMm: 8.3, weightG: 218 },
  battery: { cells: [{ capacityMah: 5100 }] },
};

describe('corpus runtime bands', () => {
  it('weights runtime evidence toward closer physical comparables', () => {
    const result = resolveCorpusRuntimeBand(corpus, input, 'web_browsing');

    expect(result.status).toBe('resolved');
    expect(result.estimate?.referenceCount).toBe(2);
    expect(result.estimate?.expectedMahPerHour).toBeLessThan(320);
    expect(result.estimate?.neighborIds[0]).toBeDefined();
  });
  it('gives independent phones equal influence even if one has repeated runtime readings', () => {
    const repeated: DeviceCorpus = {
      version: 'duplicate-runtime-reads',
      sources: [{ id: 'controlled', publisher: 'Lab', url: 'https://example.com/controlled', protocol: 'controlled-200nits' }],
      devices: [
        {
          variant: {
            id: 'phone-a',
            identity: { manufacturer: 'Example', family: 'Example', modelName: 'A' },
            battery: { capacityMah: 5000 },
          },
          display: { diagonalInches: 6.8 },
        },
        {
          variant: {
            id: 'phone-b',
            identity: { manufacturer: 'Example', family: 'Example', modelName: 'B' },
            battery: { capacityMah: 5000 },
          },
          display: { diagonalInches: 6.8 },
        },
      ],
      measurements: [
        { id: 'a-1', deviceVariantId: 'phone-a', workload: 'gaming', metric: 'runtime', value: 5, unit: 'hours', sourceId: 'controlled', evidenceKind: 'measured' },
        { id: 'a-2', deviceVariantId: 'phone-a', workload: 'gaming', metric: 'runtime', value: 5, unit: 'hours', sourceId: 'controlled', evidenceKind: 'measured' },
        { id: 'b-1', deviceVariantId: 'phone-b', workload: 'gaming', metric: 'runtime', value: 10, unit: 'hours', sourceId: 'controlled', evidenceKind: 'measured' },
      ],
    };
    const target: SimulationInput = {
      formFactor: 'phone',
      displays: { primary: { diagonalInches: 6.8 } },
      battery: { cells: [{ capacityMah: 5000 }] },
    };
    const result = resolveCorpusRuntimeBand(repeated, target, 'gaming');
    expect(result.status).toBe('resolved');
    expect(result.estimate?.referenceCount).toBe(3);
    expect(result.estimate?.independentReferenceDeviceCount).toBe(2);
    // Device A: 1000 mAh/h, device B: 500 mAh/h.
    // The two observations of A carry one total device weight.
    expect(result.estimate?.expectedMahPerHour).toBeCloseTo(750, 10);
  });

});
