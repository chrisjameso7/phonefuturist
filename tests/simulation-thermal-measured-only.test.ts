import { describe, expect, it } from 'vitest';
import { selectThermalCalibrationReferences } from '../src/lib/simulation/modules/thermal-calibration';
import type { DeviceCorpus } from '../src/lib/simulation/modules/device-corpus';

describe('thermal calibration evidence kind', () => {
  it('ignores inferred sustained-performance evidence', () => {
    const corpus: DeviceCorpus = {
      version: 'thermal-measured-only',
      sources: [{
        id: 'lab',
        publisher: 'Lab',
        url: 'https://example.com',
        protocol: 'gpu-stress',
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
            soc: {
              vendor: 'Qualcomm',
              name: 'Chip',
            },
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
            soc: {
              vendor: 'Qualcomm',
              name: 'Chip',
            },
          },
        },
      ],
      measurements: [
        {
          id: 'measured-gpu',
          deviceVariantId: 'measured',
          workload: 'benchmark',
          metric: 'gpu_stability_percent',
          value: 60,
          unit: 'percent',
          sourceId: 'lab',
          evidenceKind: 'measured',
        },
        {
          id: 'inferred-gpu',
          deviceVariantId: 'inferred',
          workload: 'benchmark',
          metric: 'gpu_stability_percent',
          value: 95,
          unit: 'percent',
          sourceId: 'lab',
          evidenceKind: 'inferred',
        },
      ],
    };

    const result =
      selectThermalCalibrationReferences(
        corpus,
        {
          domain: 'gpu_sustained',
          socVendor: 'Qualcomm',
          socName: 'Chip',
        },
      );

    expect(result.status).toBe('resolved');
    expect(result.references).toHaveLength(1);
    expect(result.references[0]).toMatchObject({
      deviceVariantId: 'measured',
      value: 60,
    });
  });
});
