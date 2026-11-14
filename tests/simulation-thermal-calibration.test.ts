import { describe, expect, it } from 'vitest';
import { selectThermalCalibrationReferences } from '../src/lib/simulation/modules/thermal-calibration';
import type { DeviceCorpus } from '../src/lib/simulation/modules/device-corpus';

const corpus: DeviceCorpus = {
  version: 'test',
  sources: [{ id: 'lab', publisher: 'Lab', url: 'https://example.com' }],
  devices: [
    {
      variant: {
        id: 'active',
        identity: { manufacturer: 'Gaming', family: 'G', modelName: 'Active' },
        battery: { capacityMah: 6000 },
        soc: { vendor: 'Qualcomm', name: 'Chip' },
      },
      display: { diagonalInches: 6.8, refreshRateHz: 165 },
      dimensions: { thicknessMm: 9.4, weightG: 230 },
      cooling: { class: 'active-fan', fan: true },
    },
    {
      variant: {
        id: 'passive',
        identity: { manufacturer: 'Thin', family: 'T', modelName: 'Passive' },
        battery: { capacityMah: 6000 },
        soc: { vendor: 'Qualcomm', name: 'Chip' },
      },
      display: { diagonalInches: 6.8, refreshRateHz: 120 },
      dimensions: { thicknessMm: 7.3, weightG: 195 },
      cooling: { class: 'vapor-chamber' },
    },
  ],
  measurements: [
    {
      id: 'active-gpu',
      deviceVariantId: 'active',
      workload: 'thermal',
      metric: 'gpu_stability_percent',
      value: 86,
      unit: 'percent',
      sourceId: 'lab',
      evidenceKind: 'measured',
    },
    {
      id: 'passive-gpu',
      deviceVariantId: 'passive',
      workload: 'thermal',
      metric: 'gpu_stability_percent',
      value: 58,
      unit: 'percent',
      sourceId: 'lab',
      evidenceKind: 'measured',
    },
  ],
};

describe('thermal calibration selection', () => {
  it('prefers thermal evidence from closer chassis and cooling peers', () => {
    const result = selectThermalCalibrationReferences(corpus, {
      batteryMah: 6000,
      socVendor: 'Qualcomm',
      displayDiagonalInches: 6.8,
      refreshRateHz: 165,
      thicknessMm: 9.3,
      weightG: 228,
      coolingClass: 'active-fan',
      domain: 'gpu_sustained',
      limit: 2,
    });

    expect(result.status).toBe('resolved');
    expect(result.references[0].deviceVariantId).toBe('active');
  });
});
