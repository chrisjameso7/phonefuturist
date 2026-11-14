import { describe, expect, it } from 'vitest';
import { selectThermalCalibrationReferences } from '../src/lib/simulation/modules/thermal-calibration';
import type { DeviceCorpus } from '../src/lib/simulation/modules/device-corpus';

describe('thermal measured-evidence eligibility', () => {
  it('does not let unmeasured spec-similar devices crowd measured GPU references out of the comparable limit', () => {
    const measuredDevices = Array.from(
      { length: 4 },
      (_, index) => ({
        variant: {
          id: `measured-${index}`,
          identity: {
            manufacturer: 'Measured',
            family: 'Measured',
            modelName: `Measured ${index}`,
          },
          battery: { capacityMah: 5000 },
          soc: {
            vendor: 'Qualcomm' as const,
            name: 'Chip',
          },
        },
        display: {
          diagonalInches: 6.7,
          refreshRateHz: 120,
        },
      }),
    );

    const distractors = Array.from(
      { length: 20 },
      (_, index) => ({
        variant: {
          id: `distractor-${index}`,
          identity: {
            manufacturer: 'Target',
            family: 'Target',
            modelName: `Target ${index}`,
          },
          battery: { capacityMah: 5000 },
          soc: {
            vendor: 'Qualcomm' as const,
            name: 'Chip',
          },
        },
        display: {
          diagonalInches: 6.7,
          refreshRateHz: 120,
        },
      }),
    );

    const corpus: DeviceCorpus = {
      version: 'thermal-eligibility',
      sources: [{
        id: 'lab',
        publisher: 'Lab',
        url: 'https://example.com',
        protocol: 'gpu-stress',
      }],
      devices: [
        ...distractors,
        ...measuredDevices,
      ],
      measurements: measuredDevices.map(
        (device, index) => ({
          id: `gpu-${index}`,
          deviceVariantId: device.variant.id,
          workload: 'benchmark' as const,
          metric: 'gpu_stability_percent',
          value: 50 + index,
          unit: 'percent',
          sourceId: 'lab',
          evidenceKind: 'measured' as const,
        }),
      ),
    };

    const result =
      selectThermalCalibrationReferences(
        corpus,
        {
          domain: 'gpu_sustained',
          batteryMah: 5000,
          manufacturer: 'Target',
          socVendor: 'Qualcomm',
          displayDiagonalInches: 6.7,
          refreshRateHz: 120,
          limit: 3,
        },
      );

    expect(result.status).toBe('resolved');
    expect(result.references).toHaveLength(3);
    expect(
      result.references.every((reference) =>
        reference.deviceVariantId.startsWith(
          'measured-',
        ),
      ),
    ).toBe(true);
  });
});
