import { describe, expect, it } from 'vitest';
import { resolveCorpusRuntimeBand } from '../src/lib/simulation/modules/corpus-runtime';
import type { DeviceCorpus } from '../src/lib/simulation/modules/device-corpus';

const source = {
  id: 'lab',
  publisher: 'Lab',
  url: 'https://example.com',
  protocol: 'runtime-test',
};

function device(
  id: string,
  vendor: string,
  socName: string,
) {
  return {
    variant: {
      id,
      identity: {
        manufacturer: 'Example',
        family: 'Example',
        modelName: id,
      },
      battery: { capacityMah: 5000 },
      soc: { vendor, name: socName },
    },
    display: {
      diagonalInches: 6.8,
      resolutionWidthPx: 1440,
      resolutionHeightPx: 3200,
      refreshRateHz: 120,
    },
  };
}

function measurement(
  id: string,
  deviceVariantId: string,
  hours: number,
) {
  return {
    id,
    deviceVariantId,
    workload: 'gaming' as const,
    metric: 'gamingHours',
    value: hours,
    unit: 'hours',
    sourceId: 'lab',
    evidenceKind: 'measured' as const,
  };
}

function input() {
  return {
    formFactor: 'phone' as const,
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
  };
}

describe('runtime SoC evidence hierarchy', () => {
  it('uses two same-family peers instead of broader protocol peers', () => {
    const corpus: DeviceCorpus = {
      version: 'runtime-soc-family',
      sources: [source],
      devices: [
        device('d9500-a', 'MediaTek', 'Dimensity 9500'),
        device('d9500-b', 'MediaTek', 'Dimensity 9500'),
        device('snap-a', 'Qualcomm', 'Snapdragon X'),
        device('snap-b', 'Qualcomm', 'Snapdragon X'),
      ],
      measurements: [
        measurement('m1', 'd9500-a', 5),
        measurement('m2', 'd9500-b', 5.5),
        measurement('m3', 'snap-a', 10),
        measurement('m4', 'snap-b', 11),
      ],
    };

    const result = resolveCorpusRuntimeBand(
      corpus,
      input(),
      'gaming',
      {},
      {
        socVendor: 'MediaTek',
        socName: 'Dimensity 9500',
      },
    );

    expect(result.status).toBe('resolved');
    expect(result.estimate?.evidenceScope).toBe(
      'same-soc-family',
    );
    expect(result.estimate?.referenceCount).toBe(2);
    expect(
      result.estimate?.neighborIds.sort(),
    ).toEqual(['d9500-a', 'd9500-b']);
    expect(
      result.estimate?.expectedMahPerHour,
    ).toBeGreaterThan(850);
  });

  it('falls back to same vendor when only one exact-family peer exists', () => {
    const corpus: DeviceCorpus = {
      version: 'runtime-soc-vendor',
      sources: [source],
      devices: [
        device('d9500-a', 'MediaTek', 'Dimensity 9500'),
        device('d9400-a', 'MediaTek', 'Dimensity 9400'),
        device('snap-a', 'Qualcomm', 'Snapdragon X'),
      ],
      measurements: [
        measurement('m1', 'd9500-a', 5),
        measurement('m2', 'd9400-a', 6),
        measurement('m3', 'snap-a', 12),
      ],
    };

    const result = resolveCorpusRuntimeBand(
      corpus,
      input(),
      'gaming',
      {},
      {
        socVendor: 'MediaTek',
        socName: 'Dimensity 9500',
      },
    );

    expect(result.status).toBe('resolved');
    expect(result.estimate?.evidenceScope).toBe(
      'same-soc-vendor',
    );
    expect(result.estimate?.referenceCount).toBe(2);
  });
});
