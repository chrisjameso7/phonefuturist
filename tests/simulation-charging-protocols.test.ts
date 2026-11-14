import { describe, expect, it } from 'vitest';
import { selectChargingComparables } from '../src/lib/simulation/modules/charging-comparables';
import { estimateChargingFromCorpus } from '../src/lib/simulation/modules/charging-corpus-estimator';
import type { DeviceCorpus } from '../src/lib/simulation/modules/device-corpus';

const corpus: DeviceCorpus = {
  version: 'test',
  sources: [
    {
      id: 'lab-a',
      publisher: 'Lab A',
      url: 'https://example.com/a',
      protocol: 'wired-charge-test',
      protocolVersion: 'v1',
    },
    {
      id: 'lab-b',
      publisher: 'Lab B',
      url: 'https://example.com/b',
      protocol: 'wired-charge-test',
      protocolVersion: 'v2',
    },
  ],
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
        advertisedWiredWatts: 60,
        cellArchitecture: 'single-cell',
      },
    },
  ],
  measurements: [
    {
      id: 'v1-50',
      deviceVariantId: 'phone',
      workload: 'charging',
      metric: 'timeTo50Minutes',
      value: 18,
      unit: 'minutes',
      sourceId: 'lab-a',
      evidenceKind: 'measured',
    },
    {
      id: 'v1-80',
      deviceVariantId: 'phone',
      workload: 'charging',
      metric: 'timeTo80Minutes',
      value: 31,
      unit: 'minutes',
      sourceId: 'lab-a',
      evidenceKind: 'measured',
    },
    {
      id: 'v1-full',
      deviceVariantId: 'phone',
      workload: 'charging',
      metric: 'wiredFullChargeMinutes',
      value: 49,
      unit: 'minutes',
      sourceId: 'lab-a',
      evidenceKind: 'measured',
    },
    {
      id: 'v2-50',
      deviceVariantId: 'phone',
      workload: 'charging',
      metric: 'timeTo50Minutes',
      value: 13,
      unit: 'minutes',
      sourceId: 'lab-b',
      evidenceKind: 'measured',
    },
    {
      id: 'v2-full',
      deviceVariantId: 'phone',
      workload: 'charging',
      metric: 'wiredFullChargeMinutes',
      value: 38,
      unit: 'minutes',
      sourceId: 'lab-b',
      evidenceKind: 'measured',
    },
  ],
};

describe('charging protocol isolation and milestones', () => {
  it('keeps requested protocol versions isolated', () => {
    const result = selectChargingComparables(corpus, {
      batteryMah: 5000,
      wiredChargingWatts: 60,
      cellArchitecture: 'single-cell',
      protocol: 'wired-charge-test',
      protocolVersion: 'v1',
    });

    expect(result.status).toBe('resolved');
    expect(result.references[0].timeTo50Minutes).toBe(18);
    expect(result.references[0].timeTo80Minutes).toBe(31);
    expect(result.references[0].fullChargeMinutes).toBe(49);
  });

  it('prefers directly measured 50 and 80 percent milestones', () => {
    const result = estimateChargingFromCorpus(corpus, {
      batteryMah: 5000,
      wiredChargingWatts: 60,
      cellArchitecture: 'single-cell',
      protocol: 'wired-charge-test',
      protocolVersion: 'v1',
    });

    expect(result.status).toBe('resolved');
    expect(result.estimate?.timeTo50Minutes?.expected).toBe(18);
    expect(result.estimate?.timeTo80Minutes?.expected).toBe(31);
    expect(result.estimate?.timeTo100Minutes?.expected).toBe(49);
  });
});
