import { describe, expect, it } from 'vitest';
import { estimateChargingFromCorpus } from '../src/lib/simulation/modules/charging-corpus-estimator';
import type { DeviceCorpus } from '../src/lib/simulation/modules/device-corpus';

const corpus: DeviceCorpus = {
  version: 'test',
  sources: [{ id: 'lab', publisher: 'Lab', url: 'https://example.com' }],
  devices: [
    {
      variant: {
        id: 'reference',
        identity: {
          manufacturer: 'Samsung',
          family: 'Galaxy S',
          modelName: 'Reference Ultra',
        },
        battery: { capacityMah: 5000 },
      },
      charging: {
        advertisedWiredWatts: 60,
        cellArchitecture: 'single-cell',
      },
    },
  ],
  measurements: [
    {
      id: '45w-full',
      deviceVariantId: 'reference',
      workload: 'charging',
      metric: 'wiredFullChargeMinutes',
      value: 70,
      unit: 'minutes',
      sourceId: 'lab',
      evidenceKind: 'measured',
      testChargerWatts: 45,
      chargingStandard: 'USB PD/PPS',
    },
    {
      id: '60w-full',
      deviceVariantId: 'reference',
      workload: 'charging',
      metric: 'wiredFullChargeMinutes',
      value: 60,
      unit: 'minutes',
      sourceId: 'lab',
      evidenceKind: 'measured',
      testChargerWatts: 60,
      chargingStandard: 'USB PD/PPS',
    },
  ],
};

describe('charging capacity and wattage interaction', () => {
  it('keeps a larger 5700 mAh 60 W pack slower than a 5000 mAh 60 W pack', () => {
    const base = estimateChargingFromCorpus(corpus, {
      batteryMah: 5000,
      wiredChargingWatts: 60,
      manufacturer: 'Samsung',
      cellArchitecture: 'single-cell',
    });

    const larger = estimateChargingFromCorpus(corpus, {
      batteryMah: 5700,
      wiredChargingWatts: 60,
      manufacturer: 'Samsung',
      cellArchitecture: 'single-cell',
    });

    const baseTime = base.estimate?.timeTo100Minutes?.expected;
    const largerTime = larger.estimate?.timeTo100Minutes?.expected;

    expect(baseTime).toBeDefined();
    expect(largerTime).toBeDefined();
    expect(largerTime!).toBeGreaterThan(baseTime!);
    expect(largerTime! / baseTime!).toBeCloseTo(5700 / 5000, 5);
  });

  it('uses learned diminishing returns rather than linear wattage scaling', () => {
    const result = estimateChargingFromCorpus(corpus, {
      batteryMah: 5000,
      wiredChargingWatts: 60,
      manufacturer: 'Samsung',
      cellArchitecture: 'single-cell',
    });

    expect(result.estimate?.powerResponse?.applied).toBe(true);
    expect(result.estimate?.powerResponse?.elasticity).toBeGreaterThan(0);
    expect(result.estimate?.powerResponse?.elasticity).toBeLessThan(1);
  });
});
