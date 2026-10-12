import { describe, expect, it } from 'vitest';
import { estimateWirelessChargingFromCorpus } from '../src/lib/simulation/modules/wireless-charging-estimator';
import type { DeviceCorpus } from '../src/lib/simulation/modules/device-corpus';

const corpus: DeviceCorpus = {
  version: 'test',
  sources: [{ id: 'lab', publisher: 'Lab', url: 'https://example.com' }],
  devices: [
    {
      variant: {
        id: 'phone',
        identity: {
          manufacturer: 'Example',
          family: 'Example',
          modelName: 'Phone',
        },
        battery: { capacityMah: 5000 },
      },
      charging: {
        advertisedWiredWatts: 80,
        advertisedWirelessWatts: 50,
      },
    },
  ],
  measurements: [
    {
      id: 'wired',
      deviceVariantId: 'phone',
      workload: 'charging',
      metric: 'wiredFullChargeMinutes',
      value: 40,
      unit: 'minutes',
      sourceId: 'lab',
      evidenceKind: 'measured',
    },
    {
      id: 'wireless',
      deviceVariantId: 'phone',
      workload: 'charging',
      metric: 'wirelessFullChargeMinutes',
      value: 70,
      unit: 'minutes',
      sourceId: 'lab',
      evidenceKind: 'measured',
    },
  ],
};

describe('wireless charging estimator', () => {
  it('uses only wireless charging evidence', () => {
    const result = estimateWirelessChargingFromCorpus(corpus, {
      batteryMah: 5000,
      wirelessChargingWatts: 50,
      manufacturer: 'Example',
    });

    expect(result.status).toBe('resolved');
    expect(result.expectedFullChargeMinutes).toBeCloseTo(70);
    expect(result.expectedFullChargeMinutes).not.toBeCloseTo(40);
  });

  it('capacity-normalizes wireless full-charge time', () => {
    const result = estimateWirelessChargingFromCorpus(corpus, {
      batteryMah: 6000,
      wirelessChargingWatts: 50,
      manufacturer: 'Example',
    });

    expect(result.expectedFullChargeMinutes).toBeCloseTo(84);
  });
});
