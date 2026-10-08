import { describe, expect, it } from 'vitest';
import {
  resolveChargingPowerResponse,
} from '../src/lib/simulation/modules/charging-power-response';
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
        cellArchitecture: 'single-cell',
      },
    },
  ],
  measurements: [
    {
      id: '55',
      deviceVariantId: 'phone',
      workload: 'charging',
      metric: 'wiredFullChargeMinutes',
      value: 80,
      unit: 'minutes',
      sourceId: 'lab',
      evidenceKind: 'measured',
      testChargerWatts: 55,
    },
    {
      id: '80',
      deviceVariantId: 'phone',
      workload: 'charging',
      metric: 'wiredFullChargeMinutes',
      value: 67,
      unit: 'minutes',
      sourceId: 'lab',
      evidenceKind: 'measured',
      testChargerWatts: 80,
    },
  ],
};

describe('charging power response range awareness', () => {
  it('treats targets inside the evidence range as interpolation', () => {
    const result = resolveChargingPowerResponse(corpus, {
      targetWatts: 60,
      manufacturer: 'Example',
    });

    expect(result.targetPosition).toBe('interpolation');
    expect(result.evidenceRangeWatts).toEqual({ min: 55, max: 80 });
  });

  it('reduces confidence outside the measured wattage range', () => {
    const inside = resolveChargingPowerResponse(corpus, {
      targetWatts: 60,
      manufacturer: 'Example',
    });
    const far = resolveChargingPowerResponse(corpus, {
      targetWatts: 150,
      manufacturer: 'Example',
    });

    expect(far.targetPosition).toBe('far-extrapolation');
    expect(far.confidence!).toBeLessThan(inside.confidence!);
  });
});
