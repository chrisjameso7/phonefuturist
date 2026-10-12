import { describe, expect, it } from 'vitest';
import { estimateChargingFromCorpus } from '../src/lib/simulation/modules/charging-corpus-estimator';
import type { DeviceCorpus } from '../src/lib/simulation/modules/device-corpus';

const corpus: DeviceCorpus = {
  version: 'test',
  sources: [{ id: 'lab', publisher: 'Lab', url: 'https://example.com' }],
  devices: [
    {
      variant: {
        id: 'a',
        identity: {
          manufacturer: 'Example',
          family: 'Example',
          modelName: 'A',
        },
        battery: { capacityMah: 5000 },
      },
      charging: { advertisedWiredWatts: 60 },
    },
    {
      variant: {
        id: 'b',
        identity: {
          manufacturer: 'Example',
          family: 'Example',
          modelName: 'B',
        },
        battery: { capacityMah: 5000 },
      },
      charging: { advertisedWiredWatts: 60 },
    },
  ],
  measurements: [
    {
      id: 'a50',
      deviceVariantId: 'a',
      workload: 'charging',
      metric: 'timeTo50Minutes',
      value: 28,
      unit: 'minutes',
      sourceId: 'lab',
      evidenceKind: 'measured',
    },
    {
      id: 'b80',
      deviceVariantId: 'b',
      workload: 'charging',
      metric: 'timeTo80Minutes',
      value: 24,
      unit: 'minutes',
      sourceId: 'lab',
      evidenceKind: 'measured',
    },
    {
      id: 'b100',
      deviceVariantId: 'b',
      workload: 'charging',
      metric: 'wiredFullChargeMinutes',
      value: 40,
      unit: 'minutes',
      sourceId: 'lab',
      evidenceKind: 'measured',
    },
  ],
};

describe('charging curve reconciliation', () => {
  it('never returns 80 percent before 50 percent', () => {
    const result = estimateChargingFromCorpus(corpus, {
      batteryMah: 5000,
      wiredChargingWatts: 60,
      manufacturer: 'Example',
    });

    const t50 = result.estimate?.timeTo50Minutes?.expected;
    const t80 = result.estimate?.timeTo80Minutes?.expected;
    const t100 = result.estimate?.timeTo100Minutes?.expected;

    expect(t50).toBeDefined();
    expect(t80).toBeDefined();
    expect(t100).toBeDefined();
    expect(t80!).toBeGreaterThanOrEqual(t50!);
    expect(t100!).toBeGreaterThanOrEqual(t80!);
  });
});
