import { describe, expect, it } from 'vitest';
import { estimateChargingFromCorpus } from '../src/lib/simulation/modules/charging-corpus-estimator';
import type { DeviceCorpus } from '../src/lib/simulation/modules/device-corpus';

const corpus: DeviceCorpus = {
  version: 'test',
  sources: [{ id: 'lab', publisher: 'Lab', url: 'https://example.com' }],
  devices: [
    {
      variant: {
        id: 's26-like',
        identity: {
          manufacturer: 'Samsung',
          family: 'Galaxy S',
          modelName: 'Galaxy S26 Ultra',
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
      id: 'full',
      deviceVariantId: 's26-like',
      workload: 'charging',
      metric: 'wiredFullChargeMinutes',
      value: 50,
      unit: 'minutes',
      sourceId: 'lab',
      evidenceKind: 'measured',
    },
    {
      id: 'p30',
      deviceVariantId: 's26-like',
      workload: 'charging',
      metric: 'charge30mPercent',
      value: 80,
      unit: 'percent',
      sourceId: 'lab',
      evidenceKind: 'measured',
    },
  ],
};

describe('charging capacity normalization', () => {
  it('does not give a 5700 mAh phone the same 60 W charging curve as a 5000 mAh phone', () => {
    const sameCapacity = estimateChargingFromCorpus(corpus, {
      batteryMah: 5000,
      wiredChargingWatts: 60,
      cellArchitecture: 'single-cell',
    });

    const largerCapacity = estimateChargingFromCorpus(corpus, {
      batteryMah: 5700,
      wiredChargingWatts: 60,
      cellArchitecture: 'single-cell',
    });

    expect(sameCapacity.estimate?.timeTo100Minutes?.expected).toBeCloseTo(50);
    expect(largerCapacity.estimate?.timeTo100Minutes?.expected).toBeCloseTo(57);
    expect(largerCapacity.estimate?.charge30mPercent?.expected).toBeLessThan(
      sameCapacity.estimate?.charge30mPercent?.expected ?? 0,
    );
  });
});
