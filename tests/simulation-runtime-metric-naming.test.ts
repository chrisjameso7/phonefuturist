import { describe, expect, it } from 'vitest';
import { resolveCorpusRuntimeBand } from '../src/lib/simulation/modules/corpus-runtime';
import type { DeviceCorpus } from '../src/lib/simulation/modules/device-corpus';
import type { SimulationInput } from '../src/lib/simulation/types';

describe('runtime evidence metric naming', () => {
  it('accepts workload-scoped hour measurements without requiring "runtime" in the metric name', () => {
    const corpus: DeviceCorpus = {
      version: 'runtime-metric-name',
      sources: [{
        id: 'lab',
        publisher: 'Lab',
        url: 'https://example.com',
        protocol: 'battery-test',
      }],
      devices: [{
        variant: {
          id: 'device',
          identity: {
            manufacturer: 'Example',
            family: 'Example',
            modelName: 'Device',
          },
          battery: { capacityMah: 5000 },
        },
        display: {
          diagonalInches: 6.7,
          resolutionWidthPx: 1440,
          resolutionHeightPx: 3200,
          refreshRateHz: 120,
        },
      }],
      measurements: [{
        id: 'browsing-hours',
        deviceVariantId: 'device',
        workload: 'web_browsing',
        metric: 'browsingHours',
        value: 10,
        unit: 'hours',
        sourceId: 'lab',
        evidenceKind: 'measured',
      }],
    };

    const input: SimulationInput = {
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

    const result = resolveCorpusRuntimeBand(
      corpus,
      input,
      'web_browsing',
    );

    expect(result.status).toBe('resolved');
    expect(
      result.estimate?.expectedMahPerHour,
    ).toBeCloseTo(500, 6);
  });
});
