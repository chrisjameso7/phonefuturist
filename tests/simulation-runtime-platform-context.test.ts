import { describe, expect, it } from 'vitest';
import { resolveCorpusRuntimeBand } from '../src/lib/simulation/modules/corpus-runtime';
import type { DeviceCorpus } from '../src/lib/simulation/modules/device-corpus';

describe('runtime platform context', () => {
  it('prefers a same-SoC peer over an otherwise visually identical wrong-SoC peer', () => {
    const corpus: DeviceCorpus = {
      version: 'runtime-platform-context',
      sources: [{
        id: 'lab',
        publisher: 'Lab',
        url: 'https://example.com',
        protocol: 'runtime-test',
      }],
      devices: [
        {
          variant: {
            id: 'same-soc',
            identity: {
              manufacturer: 'Example',
              family: 'A',
              modelName: 'Same SoC',
            },
            battery: { capacityMah: 5000 },
            soc: {
              vendor: 'MediaTek',
              name: 'Dimensity 9500',
            },
          },
          display: {
            diagonalInches: 6.8,
            resolutionWidthPx: 1440,
            resolutionHeightPx: 3200,
            refreshRateHz: 120,
          },
        },
        {
          variant: {
            id: 'wrong-soc',
            identity: {
              manufacturer: 'Other',
              family: 'B',
              modelName: 'Wrong SoC',
            },
            battery: { capacityMah: 5000 },
            soc: {
              vendor: 'Qualcomm',
              name: 'Snapdragon X',
            },
          },
          display: {
            diagonalInches: 6.8,
            resolutionWidthPx: 1440,
            resolutionHeightPx: 3200,
            refreshRateHz: 120,
          },
        },
      ],
      measurements: [
        {
          id: 'same-runtime',
          deviceVariantId: 'same-soc',
          workload: 'gaming',
          metric: 'gamingHours',
          value: 5,
          unit: 'hours',
          sourceId: 'lab',
          evidenceKind: 'measured',
        },
        {
          id: 'wrong-runtime',
          deviceVariantId: 'wrong-soc',
          workload: 'gaming',
          metric: 'gamingHours',
          value: 10,
          unit: 'hours',
          sourceId: 'lab',
          evidenceKind: 'measured',
        },
      ],
    };

    const result = resolveCorpusRuntimeBand(
      corpus,
      {
        formFactor: 'phone',
        displays: {
          primary: {
            diagonalInches: 6.8,
            resolutionWidthPx: 1440,
            resolutionHeightPx: 3200,
            refreshRateHz: 120,
          },
        },
        battery: {
          cells: [{ capacityMah: 5000 }],
        },
      },
      'gaming',
      {},
      {
        manufacturer: 'Example',
        socVendor: 'MediaTek',
        socName: 'Dimensity 9500',
      },
    );

    expect(result.status).toBe('resolved');
    expect(result.estimate?.neighborIds[0]).toBe(
      'same-soc',
    );
    expect(
      result.estimate?.expectedMahPerHour,
    ).toBeGreaterThan(500);
  });
});
