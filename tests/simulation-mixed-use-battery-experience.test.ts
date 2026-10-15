import { describe, expect, it } from 'vitest';
import { simulateBatteryExperience } from '../src/lib/simulation/modules/battery-experience-engine';
import type { DeviceCorpus } from '../src/lib/simulation/modules/device-corpus';

const corpus: DeviceCorpus = {
  version: 'test',
  sources: [
    {
      id: 'lab',
      publisher: 'Lab',
      url: 'https://example.com',
      protocol: 'runtime-test',
      protocolVersion: 'v1',
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
      display: { diagonalInches: 6.7 },
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
      value: 20,
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
  ],
};

describe('mixed-use battery experience', () => {
  it('combines workload drain by entered hours per day', () => {
    const result = simulateBatteryExperience(corpus, {
      simulation: {
        formFactor: 'phone',
        displays: { primary: { diagonalInches: 6.7 } },
        battery: { cells: [{ capacityMah: 5000 }] },
      },
      dailyUseHours: {
        web_browsing: 2,
        video_playback: 2,
        gaming: 1,
      },
    });

    // web 500 mAh/h * 2 = 1000
    // video 250 mAh/h * 2 = 500
    // gaming 1000 mAh/h * 1 = 1000
    // total = 2500 mAh/day, so 2 active-use equivalent days.
    expect(result.mixedUse?.expectedDrainMahPerDay).toBeCloseTo(2500);
    expect(result.mixedUse?.interpretation).toBe(
      'active-use-only',
    );
    expect(
      result.mixedUse?.expectedActiveUseHoursPerCharge,
    ).toBeCloseTo(10);
    expect(result.mixedUse?.expectedDaysPerCharge).toBeCloseTo(2);
    expect(result.mixedUse?.activeHoursPerDay).toBeCloseTo(5);
    expect(
      result.warnings.some((warning) =>
        warning.includes('Standby'),
      ),
    ).toBe(true);
  });

  it('does not invent an efficiency advantage from a chip name alone', () => {
    const simulation = {
      formFactor: 'phone' as const,
      displays: { primary: { diagonalInches: 6.7, refreshRateHz: 120 } },
      battery: { cells: [{ capacityMah: 5000 }] },
    };
    const dailyUseHours = {
      web_browsing: 2,
      video_playback: 2,
      gaming: 1,
    };
    const base = simulateBatteryExperience(corpus, {
      simulation,
      dailyUseHours,
    });
    const exynos = simulateBatteryExperience(corpus, {
      simulation,
      dailyUseHours,
      socName: 'Exynos 2700',
    });
    const snapdragon = simulateBatteryExperience(corpus, {
      simulation,
      dailyUseHours,
      socName: 'Snapdragon 8 Elite Extreme Gen 6',
    });
    expect(base.mixedUse?.expectedActiveUseHoursPerCharge).toBeDefined();
    expect(exynos.mixedUse?.expectedActiveUseHoursPerCharge)
      .toBeCloseTo(base.mixedUse!.expectedActiveUseHoursPerCharge, 10);
    expect(snapdragon.mixedUse?.expectedActiveUseHoursPerCharge)
      .toBeCloseTo(base.mixedUse!.expectedActiveUseHoursPerCharge, 10);
    expect(exynos.runtimes.map(row => row.expectedHours))
      .toEqual(base.runtimes.map(row => row.expectedHours));
  });

  it('does not fabricate mixed-use runtime when no supported workload hours are entered', () => {
    const result = simulateBatteryExperience(corpus, {
      simulation: {
        formFactor: 'phone',
        displays: { primary: { diagonalInches: 6.7 } },
        battery: { cells: [{ capacityMah: 5000 }] },
      },
      dailyUseHours: {},
    });

    expect(result.mixedUse).toBeUndefined();
  });
});
