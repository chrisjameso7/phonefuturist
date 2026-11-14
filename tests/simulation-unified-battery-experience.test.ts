import { describe, expect, it } from 'vitest';
import { simulateBatteryExperience } from '../src/lib/simulation/modules/battery-experience-engine';
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
      display: { diagonalInches: 6.7 },
      charging: {
        advertisedWiredWatts: 60,
        advertisedWirelessWatts: 25,
        cellArchitecture: 'single-cell',
      },
    },
  ],
  measurements: [
    {
      id: 'web',
      deviceVariantId: 'phone',
      workload: 'web_browsing',
      metric: 'runtime',
      value: 10,
      unit: 'hours',
      sourceId: 'lab',
      evidenceKind: 'measured',
    },
    {
      id: 'video',
      deviceVariantId: 'phone',
      workload: 'video_playback',
      metric: 'runtime',
      value: 15,
      unit: 'hours',
      sourceId: 'lab',
      evidenceKind: 'measured',
    },
    {
      id: 'gaming',
      deviceVariantId: 'phone',
      workload: 'gaming',
      metric: 'runtime',
      value: 5,
      unit: 'hours',
      sourceId: 'lab',
      evidenceKind: 'measured',
    },
    {
      id: 'wired-full',
      deviceVariantId: 'phone',
      workload: 'charging',
      metric: 'wiredFullChargeMinutes',
      value: 50,
      unit: 'minutes',
      sourceId: 'lab',
      evidenceKind: 'measured',
      testChargerWatts: 60,
      chargingStandard: 'USB PD/PPS',
    },
    {
      id: 'wired-30',
      deviceVariantId: 'phone',
      workload: 'charging',
      metric: 'charge30mPercent',
      value: 80,
      unit: 'percent',
      sourceId: 'lab',
      evidenceKind: 'measured',
      testChargerWatts: 60,
      chargingStandard: 'USB PD/PPS',
    },
    {
      id: 'wireless-full',
      deviceVariantId: 'phone',
      workload: 'charging',
      metric: 'wirelessFullChargeMinutes',
      value: 120,
      unit: 'minutes',
      sourceId: 'lab',
      evidenceKind: 'measured',
      testChargerWatts: 25,
      chargingStandard: 'Qi2',
    },
  ],
};

describe('unified battery experience', () => {
  it('returns runtime, wired charging and wireless charging separately', () => {
    const result = simulateBatteryExperience(corpus, {
      simulation: {
        formFactor: 'phone',
        displays: { primary: { diagonalInches: 6.7 } },
        battery: { cells: [{ capacityMah: 5000 }] },
      },
      manufacturer: 'Example',
      wiredWatts: 60,
      wirelessWatts: 25,
      wiredChargingStandard: 'USB PD/PPS',
      wirelessChargingStandard: 'Qi2',
      cellArchitecture: 'single-cell',
    });

    expect(result.charging?.status).toBe('resolved');
    expect(result.wirelessCharging?.status).toBe('resolved');
    expect(
      result.wirelessCharging?.expectedFullChargeMinutes,
    ).toBeCloseTo(120);
    expect(result.runtimes.every((runtime) => runtime.status === 'resolved')).toBe(true);
  });
});
