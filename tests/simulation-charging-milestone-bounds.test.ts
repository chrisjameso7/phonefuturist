import { describe, expect, it } from 'vitest';
import { estimateChargingFromCorpus } from '../src/lib/simulation/modules/charging-corpus-estimator';
import type { DeviceCorpus } from '../src/lib/simulation/modules/device-corpus';

const corpus: DeviceCorpus = {
  version: 'test',
  sources: [
    {
      id: 'lab',
      publisher: 'Lab',
      url: 'https://example.com',
      protocol: 'charging',
      protocolVersion: 'v1',
    },
  ],
  devices: [
    {
      variant: {
        id: 'fast-phone',
        identity: {
          manufacturer: 'Example',
          family: 'Example',
          modelName: 'Fast Phone',
        },
        battery: { capacityMah: 5000 },
      },
      charging: {
        advertisedWiredWatts: 100,
        cellArchitecture: 'single-cell',
      },
    },
  ],
  measurements: [
    {
      id: 'p30',
      deviceVariantId: 'fast-phone',
      workload: 'charging',
      metric: 'charge30mPercent',
      value: 85,
      unit: 'percent',
      sourceId: 'lab',
      evidenceKind: 'measured',
      testChargerWatts: 100,
      chargingStandard: 'USB PD/PPS',
    },
    {
      id: 'full',
      deviceVariantId: 'fast-phone',
      workload: 'charging',
      metric: 'wiredFullChargeMinutes',
      value: 50,
      unit: 'minutes',
      sourceId: 'lab',
      evidenceKind: 'measured',
      testChargerWatts: 100,
      chargingStandard: 'USB PD/PPS',
    },
  ],
};

describe('charging milestone bounds', () => {
  it('caps 50% and 80% milestone ranges at 30 minutes when p30 already exceeds them', () => {
    const result = estimateChargingFromCorpus(corpus, {
      batteryMah: 5000,
      wiredChargingWatts: 100,
      manufacturer: 'Example',
      chargingStandard: 'USB PD/PPS',
    });

    expect(result.status).toBe('resolved');

    const t50 = result.estimate?.timeTo50Minutes;
    const t80 = result.estimate?.timeTo80Minutes;

    expect(t50).toBeDefined();
    expect(t80).toBeDefined();

    expect(t50!.max).toBeLessThanOrEqual(30);
    expect(t50!.expected).toBeLessThanOrEqual(30);
    expect(t80!.max).toBeLessThanOrEqual(30);
    expect(t80!.expected).toBeLessThanOrEqual(30);

    expect(t50!.min).toBeLessThanOrEqual(t50!.expected);
    expect(t50!.expected).toBeLessThanOrEqual(t50!.max);
    expect(t80!.min).toBeLessThanOrEqual(t80!.expected);
    expect(t80!.expected).toBeLessThanOrEqual(t80!.max);
  });
});
