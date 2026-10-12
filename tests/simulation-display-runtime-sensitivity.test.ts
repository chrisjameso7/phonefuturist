import { describe, expect, it } from 'vitest';
import { resolveDisplayRuntimeSensitivity } from '../src/lib/simulation/modules/display-runtime-sensitivity';
import type { DeviceCorpus } from '../src/lib/simulation/modules/device-corpus';
import type { SimulationInput } from '../src/lib/simulation/types';

function device(
  id: string,
  refreshRateHz: number,
  resolutionWidthPx: number,
  resolutionHeightPx: number,
  runtimeHours: number,
) {
  return {
    record: {
      variant: {
        id,
        identity: {
          manufacturer: id,
          family: id,
          modelName: id,
        },
        battery: { capacityMah: 5000 },
      },
      display: {
        diagonalInches: 6.7,
        resolutionWidthPx,
        resolutionHeightPx,
        refreshRateHz,
      },
    },
    measurement: {
      id: `${id}-runtime`,
      deviceVariantId: id,
      workload: 'web_browsing' as const,
      metric: 'runtime_hours',
      value: runtimeHours,
      unit: 'hours',
      sourceId: 'lab',
      evidenceKind: 'measured' as const,
    },
  };
}

const rows = [
  device('a', 120, 1440, 3200, 10),
  device('b', 120, 1440, 3200, 11),
  device('c', 60, 1080, 2400, 14),
  device('d', 60, 1080, 2400, 15),
];

const corpus: DeviceCorpus = {
  version: 'display-sensitivity',
  sources: [{
    id: 'lab',
    publisher: 'Lab',
    url: 'https://example.com',
    protocol: 'runtime-test',
  }],
  devices: rows.map((row) => row.record),
  measurements: rows.map((row) => row.measurement),
};

const target: SimulationInput = {
  formFactor: 'phone',
  displays: {
    primary: {
      diagonalInches: 6.7,
      resolutionWidthPx: 1440,
      resolutionHeightPx: 3200,
      refreshRateHz: 120,
    },
  },
  battery: {
    cells: [{ capacityMah: 5000 }],
  },
};

describe('display runtime sensitivity', () => {
  it('derives scenario runtime deltas from measured comparables', () => {
    const result = resolveDisplayRuntimeSensitivity(
      corpus,
      target,
    );

    expect(
      ['partial', 'resolved'],
    ).toContain(result.status);

    const sixty = result.scenarios.find(
      (row) =>
        row.workload === 'web_browsing' &&
        row.scenario === '60hz',
    );

    expect(sixty).toBeDefined();
    expect(sixty!.referenceCount).toBeGreaterThanOrEqual(3);
    expect(sixty!.deltaRuntimePercent).toBeGreaterThan(0);
    expect(sixty!.deltaDrainPercent).toBeLessThan(0);
  });

  it('uses Wh/h for display runtime sensitivity when target and reference energy are known', () => {
    const energyCorpus: DeviceCorpus = {
      ...corpus,
      devices: corpus.devices.map((row) => ({
        ...row,
        variant: {
          ...row.variant,
          battery: {
            ...(row.variant.battery ?? {}),
            typicalEnergyWh: 20,
            nominalVoltageV: 4,
          },
        },
      })),
    };

    const energyTarget: SimulationInput = {
      ...target,
      battery: {
        cells: [
          {
            capacityMah: 5000,
            nominalVoltageV: 4.4,
          },
        ],
      },
    };

    const result =
      resolveDisplayRuntimeSensitivity(
        energyCorpus,
        energyTarget,
      );

    const sixty = result.scenarios.find(
      (row) =>
        row.workload === 'web_browsing' &&
        row.scenario === '60hz',
    );

    expect(sixty).toBeDefined();
    expect(sixty?.energyBasis).toBe('wh');
    expect(
      sixty?.baselineWhPerHour,
    ).toBeGreaterThan(0);
    expect(
      sixty?.scenarioWhPerHour,
    ).toBeGreaterThan(0);
    expect(
      sixty?.baselineMahPerHour,
    ).toBeUndefined();
  });

  it('fails closed when measured reference coverage is too weak', () => {
    const weak: DeviceCorpus = {
      ...corpus,
      devices: corpus.devices.slice(0, 2),
      measurements: corpus.measurements.slice(0, 2),
    };

    const result = resolveDisplayRuntimeSensitivity(
      weak,
      target,
    );

    expect(result.status).toBe('unresolved');
    expect(result.scenarios).toHaveLength(0);
  });
});
