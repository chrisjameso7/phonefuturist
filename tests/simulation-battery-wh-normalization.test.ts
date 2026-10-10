import { describe, expect, it } from 'vitest';
import { simulateBatteryExperience } from '../src/lib/simulation/modules/battery-experience-engine';
import type { DeviceCorpus } from '../src/lib/simulation/modules/device-corpus';

const corpus: DeviceCorpus = {
  version: 'energy-test',
  sources: [
    {
      id: 'lab',
      publisher: 'Lab',
      url: 'https://example.com/runtime',
      protocol: 'fixed runtime protocol',
      protocolVersion: '1',
    },
  ],
  devices: [
    {
      variant: {
        id: 'ref-a',
        identity: {
          manufacturer: 'Example',
          family: 'A',
          modelName: 'A',
        },
        battery: {
          capacityMah: 5000,
          typicalEnergyWh: 19,
          nominalVoltageV: 3.8,
        },
      },
      display: {
        diagonalInches: 6.7,
        resolutionWidthPx: 1440,
        resolutionHeightPx: 3200,
        refreshRateHz: 120,
      },
    },
    {
      variant: {
        id: 'ref-b',
        identity: {
          manufacturer: 'Example',
          family: 'B',
          modelName: 'B',
        },
        battery: {
          capacityMah: 5000,
          typicalEnergyWh: 21,
          nominalVoltageV: 4.2,
        },
      },
      display: {
        diagonalInches: 6.7,
        resolutionWidthPx: 1440,
        resolutionHeightPx: 3200,
        refreshRateHz: 120,
      },
    },
  ],
  measurements: [
    {
      id: 'a-web',
      deviceVariantId: 'ref-a',
      workload: 'web_browsing',
      metric: 'runtime',
      value: 10,
      unit: 'hours',
      sourceId: 'lab',
      evidenceKind: 'measured',
    },
    {
      id: 'b-web',
      deviceVariantId: 'ref-b',
      workload: 'web_browsing',
      metric: 'runtime',
      value: 10,
      unit: 'hours',
      sourceId: 'lab',
      evidenceKind: 'measured',
    },
  ],
};

function simulation(voltage?: number) {
  return {
    formFactor: 'phone' as const,
    displays: {
      primary: {
        diagonalInches: 6.7,
        resolutionWidthPx: 1440,
        resolutionHeightPx: 3200,
        refreshRateHz: 120,
      },
    },
    battery: {
      cells: [
        {
          capacityMah: 5000,
          ...(voltage !== undefined
            ? { nominalVoltageV: voltage }
            : {}),
        },
      ],
    },
  };
}

describe('battery Wh runtime normalization', () => {
  it('uses Wh/h when target and every selected reference have energy evidence', () => {
    const result = simulateBatteryExperience(
      corpus,
      {
        simulation: simulation(4.4),
      },
    );

    const web = result.runtimes.find(
      (runtime) =>
        runtime.workload === 'web_browsing',
    );

    expect(result.energyWh).toBeCloseTo(22, 10);
    expect(web?.status).toBe('resolved');
    expect(web?.energyBasis).toBe('wh');
    expect(
      web?.expectedDrainWhPerHour,
    ).toBeCloseTo(2, 10);
    expect(
      web?.expectedHours,
    ).toBeCloseTo(11, 10);
    expect(
      web?.expectedDrainMahPerHour,
    ).toBeUndefined();
  });

  it('falls back to mAh/h when target nominal voltage is unknown', () => {
    const result = simulateBatteryExperience(
      corpus,
      {
        simulation: simulation(),
      },
    );

    const web = result.runtimes.find(
      (runtime) =>
        runtime.workload === 'web_browsing',
    );

    expect(result.energyWh).toBeUndefined();
    expect(web?.status).toBe('resolved');
    expect(web?.energyBasis).toBe('mah');
    expect(
      web?.expectedDrainMahPerHour,
    ).toBeCloseTo(500, 10);
    expect(
      web?.expectedHours,
    ).toBeCloseTo(10, 10);
  });

  it('uses Wh consistently for a mixed active-use profile when all selected workloads support it', () => {
    const richer: DeviceCorpus = {
      ...corpus,
      measurements: [
        ...corpus.measurements,
        {
          id: 'a-video',
          deviceVariantId: 'ref-a',
          workload: 'video_playback',
          metric: 'runtime',
          value: 10,
          unit: 'hours',
          sourceId: 'lab',
          evidenceKind: 'measured',
        },
        {
          id: 'b-video',
          deviceVariantId: 'ref-b',
          workload: 'video_playback',
          metric: 'runtime',
          value: 10,
          unit: 'hours',
          sourceId: 'lab',
          evidenceKind: 'measured',
        },
      ],
    };

    const result = simulateBatteryExperience(
      richer,
      {
        simulation: simulation(4.4),
        dailyUseHours: {
          web_browsing: 2,
          video_playback: 2,
        },
      },
    );

    expect(
      result.mixedUse?.energyBasis,
    ).toBe('wh');
    expect(
      result.mixedUse?.expectedDrainWhPerDay,
    ).toBeCloseTo(8, 10);
    expect(
      result.mixedUse?.expectedDrainMahPerDay,
    ).toBeUndefined();
    expect(
      result.mixedUse?.expectedActiveUseHoursPerCharge,
    ).toBeCloseTo(11, 10);
  });
});
