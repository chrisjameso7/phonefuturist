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

  it('makes battery scenarios respond to chosen power assumptions, not the chip name', () => {
    const simulation = {
      formFactor: 'phone' as const,
      displays: { primary: { diagonalInches: 6.7 } },
      battery: { cells: [{ capacityMah: 5000 }] },
    };
    const dailyUseHours = {
      web_browsing: 2, video_playback: 2, gaming: 1,
    };
    const options = { simulation, dailyUseHours, socName: 'Exynos 2700' };
    const neutral = simulateBatteryExperience(corpus, options);
    const efficiency = simulateBatteryExperience(corpus, {
      ...options, socPowerWhatIf: 'efficiency',
    });
    const performance = simulateBatteryExperience(corpus, {
      ...options, socPowerWhatIf: 'performance',
    });
    expect(neutral.mixedUse?.expectedActiveUseHoursPerCharge)
      .toBeCloseTo(10, 8);
    expect(efficiency.mixedUse!.expectedActiveUseHoursPerCharge)
      .toBeGreaterThan(neutral.mixedUse!.expectedActiveUseHoursPerCharge);
    expect(performance.mixedUse!.expectedActiveUseHoursPerCharge)
      .toBeLessThan(neutral.mixedUse!.expectedActiveUseHoursPerCharge);

    const hours = (result: typeof neutral, workload: string) =>
      result.runtimes.find(row => row.workload === workload)?.expectedHours ?? 0;
    expect(hours(efficiency, 'gaming')).toBeGreaterThan(hours(neutral, 'gaming'));
    expect(hours(performance, 'web_browsing')).toBeLessThan(hours(neutral, 'web_browsing'));
    const effect = (workload: string) =>
      hours(efficiency, workload) / hours(neutral, workload) - 1;
    // Gaming has a greater assumed processor-power share than video.
    expect(effect('gaming')).toBeGreaterThan(effect('video_playback'));
    const otherChip = simulateBatteryExperience(corpus, {
      ...options, socName: 'Snapdragon 8 Elite Extreme Gen 6',
      socPowerWhatIf: 'efficiency',
    });
    expect(otherChip.mixedUse!.expectedActiveUseHoursPerCharge)
      .toBeCloseTo(efficiency.mixedUse!.expectedActiveUseHoursPerCharge, 8);
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
