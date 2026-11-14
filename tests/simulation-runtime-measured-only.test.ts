import { describe, expect, it } from 'vitest';
import { resolveCorpusRuntimeBand } from '../src/lib/simulation/modules/corpus-runtime';
import type { DeviceCorpus } from '../src/lib/simulation/modules/device-corpus';

describe('runtime calibration evidence kind', () => {
  it('ignores reported and inferred runtime rows', () => {
    const corpus: DeviceCorpus = {
      version: 'runtime-measured-only',
      sources: [{
        id: 'lab',
        publisher: 'Lab',
        url: 'https://example.com',
        protocol: 'runtime-test',
      }],
      devices: [
        {
          variant: {
            id: 'measured',
            identity: {
              manufacturer: 'Example',
              family: 'Example',
              modelName: 'Measured',
            },
            battery: { capacityMah: 5000 },
          },
          display: {
            diagonalInches: 6.7,
            resolutionWidthPx: 1080,
            resolutionHeightPx: 2400,
            refreshRateHz: 120,
          },
        },
        {
          variant: {
            id: 'inferred',
            identity: {
              manufacturer: 'Example',
              family: 'Example',
              modelName: 'Inferred',
            },
            battery: { capacityMah: 5000 },
          },
          display: {
            diagonalInches: 6.7,
            resolutionWidthPx: 1080,
            resolutionHeightPx: 2400,
            refreshRateHz: 120,
          },
        },
      ],
      measurements: [
        {
          id: 'measured-runtime',
          deviceVariantId: 'measured',
          workload: 'web_browsing',
          metric: 'browsingHours',
          value: 10,
          unit: 'hours',
          sourceId: 'lab',
          evidenceKind: 'measured',
        },
        {
          id: 'inferred-runtime',
          deviceVariantId: 'inferred',
          workload: 'web_browsing',
          metric: 'browsingHours',
          value: 20,
          unit: 'hours',
          sourceId: 'lab',
          evidenceKind: 'inferred',
        },
      ],
    };

    const result = resolveCorpusRuntimeBand(
      corpus,
      {
        formFactor: 'phone',
        displays: {
          primary: {
            diagonalInches: 6.7,
            resolutionWidthPx: 1080,
            resolutionHeightPx: 2400,
            refreshRateHz: 120,
          },
        },
        battery: {
          cells: [{ capacityMah: 5000 }],
        },
      },
      'web_browsing',
    );

    expect(result.status).toBe('resolved');
    expect(
      result.estimate?.expectedMahPerHour,
    ).toBeCloseTo(500, 8);
    expect(result.estimate?.neighborIds).toEqual([
      'measured',
    ]);
  });
});
