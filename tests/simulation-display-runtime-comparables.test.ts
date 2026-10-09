import { describe, expect, it } from 'vitest';
import { resolveCorpusRuntimeBand } from '../src/lib/simulation/modules/corpus-runtime';
import type { DeviceCorpus } from '../src/lib/simulation/modules/device-corpus';
import type { SimulationInput } from '../src/lib/simulation/types';

const corpus: DeviceCorpus = {
  version: 'display-runtime-test',
  sources: [
    {
      id: 'lab',
      publisher: 'Lab',
      url: 'https://example.com',
      protocol: 'runtime-test',
    },
  ],
  devices: [
    {
      variant: {
        id: 'qhd-120',
        identity: {
          manufacturer: 'A',
          family: 'A',
          modelName: 'QHD 120',
        },
        battery: { capacityMah: 5000 },
      },
      display: {
        diagonalInches: 6.7,
        resolutionWidthPx: 1440,
        resolutionHeightPx: 3200,
        refreshRateHz: 120,
      },
    },
    {
      variant: {
        id: 'fhd-60',
        identity: {
          manufacturer: 'B',
          family: 'B',
          modelName: 'FHD 60',
        },
        battery: { capacityMah: 5000 },
      },
      display: {
        diagonalInches: 6.7,
        resolutionWidthPx: 1080,
        resolutionHeightPx: 2400,
        refreshRateHz: 60,
      },
    },
  ],
  measurements: [
    {
      id: 'qhd-runtime',
      deviceVariantId: 'qhd-120',
      workload: 'web_browsing',
      metric: 'runtime_hours',
      value: 10,
      unit: 'hours',
      sourceId: 'lab',
      evidenceKind: 'measured',
    },
    {
      id: 'fhd-runtime',
      deviceVariantId: 'fhd-60',
      workload: 'web_browsing',
      metric: 'runtime_hours',
      value: 20,
      unit: 'hours',
      sourceId: 'lab',
      evidenceKind: 'measured',
    },
  ],
};

const target: SimulationInput = {
  formFactor: 'phone',
  displays: {
    primary: {
      diagonalInches: 6.7,
      resolutionWidthPx: 1440,
      resolutionHeightPx: 3200,
      refreshRateHz: 120,
    },
  },
  battery: {
    cells: [{ capacityMah: 5000 }],
  },
};

describe('display-aware runtime comparables', () => {
  it('weights runtime evidence toward matching resolution and refresh rate', () => {
    const result = resolveCorpusRuntimeBand(
      corpus,
      target,
      'web_browsing',
    );

    expect(result.status).toBe('resolved');
    expect(result.estimate?.neighborIds[0]).toBe('qhd-120');

    // qhd-120 drains 500 mAh/h; fhd-60 drains 250 mAh/h.
    // Matching display load should pull the weighted estimate
    // clearly toward the QHD/120 Hz reference.
    expect(
      result.estimate?.expectedMahPerHour,
    ).toBeGreaterThan(375);
  });
});
