import { describe, expect, it } from 'vitest';
import { selectThermalCalibrationReferences } from '../src/lib/simulation/modules/thermal-calibration';
import type { DeviceCorpus } from '../src/lib/simulation/modules/device-corpus';

const corpus: DeviceCorpus = {
  version: 'thermal-protocol',
  sources: [
    {
      id: 'a',
      publisher: 'Lab A',
      url: 'https://example.com/a',
      protocol: 'gpu-stress-a',
    },
    {
      id: 'b',
      publisher: 'Lab B',
      url: 'https://example.com/b',
      protocol: 'gpu-stress-b',
    },
  ],
  devices: [
    {
      variant: {
        id: 'one',
        identity: {
          manufacturer: 'A',
          family: 'A',
          modelName: 'One',
        },
        battery: { capacityMah: 5000 },
        soc: { vendor: 'Qualcomm', name: 'Chip' },
      },
      display: { diagonalInches: 6.7, refreshRateHz: 120 },
    },
    {
      variant: {
        id: 'two',
        identity: {
          manufacturer: 'B',
          family: 'B',
          modelName: 'Two',
        },
        battery: { capacityMah: 5000 },
        soc: { vendor: 'Qualcomm', name: 'Chip' },
      },
      display: { diagonalInches: 6.7, refreshRateHz: 120 },
    },
  ],
  measurements: [
    {
      id: 'one-gpu',
      deviceVariantId: 'one',
      workload: 'benchmark',
      metric: 'gpu_stability_percent',
      value: 80,
      unit: 'percent',
      sourceId: 'a',
      evidenceKind: 'measured',
    },
    {
      id: 'two-gpu',
      deviceVariantId: 'two',
      workload: 'benchmark',
      metric: 'gpu_stability_percent',
      value: 40,
      unit: 'percent',
      sourceId: 'b',
      evidenceKind: 'measured',
    },
  ],
};

describe('thermal calibration protocol isolation', () => {
  it('never blends sustained performance across protocol families', () => {
    const result = selectThermalCalibrationReferences(
      corpus,
      {
        domain: 'gpu_sustained',
        batteryMah: 5000,
        socVendor: 'Qualcomm',
        displayDiagonalInches: 6.7,
        refreshRateHz: 120,
      },
    );

    expect(result.status).toBe('resolved');
    expect(result.references).toHaveLength(1);
    expect([80, 40]).toContain(result.references[0].value);
  });
});
