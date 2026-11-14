import { describe, expect, it } from 'vitest';
import {
  compareSimulationAgainstDevices,
} from '../src/lib/simulation/modules/multi-device-comparison';
import { buildComparisonMatrix } from '../src/lib/simulation/modules/comparison-matrix';
import type { DeviceCorpus } from '../src/lib/simulation/modules/device-corpus';
import type { SimulationSnapshot } from '../src/lib/simulation/simulation-snapshot';

const corpus: DeviceCorpus = {
  version: 'test',
  sources: [],
  measurements: [],
  devices: [
    {
      variant: {
        id: 's26-ultra',
        identity: {
          manufacturer: 'Samsung',
          family: 'Galaxy S',
          modelName: 'Galaxy S26 Ultra',
        },
        battery: { capacityMah: 5000 },
      },
      display: { diagonalInches: 6.9 },
    },
    {
      variant: {
        id: 'iphone-17-pro-max',
        identity: {
          manufacturer: 'Apple',
          family: 'iPhone',
          modelName: 'iPhone 17 Pro Max',
        },
        battery: { capacityMah: 5088 },
      },
      display: { diagonalInches: 6.9 },
    },
  ],
};

const snapshot: SimulationSnapshot = {
  version: 'simulation-snapshot-0.1.0',
  id: 's27',
  title: 'Galaxy S27 Ultra',
  createdAt: new Date().toISOString(),
  visibility: 'private',
  engineVersion: 'test',
  input: {
    formFactor: 'phone',
    name: 'Galaxy S27 Ultra',
    displays: { primary: { diagonalInches: 6.9 } },
    battery: { cells: [{ capacityMah: 5700 }] },
  },
  result: {
    engineVersion: 'test',
    formFactor: 'phone',
    displays: { primary: {} },
    battery: {
      cellCount: 1,
      totalCapacityMah: 5700,
      cells: [{ capacityMah: 5700 }],
    },
    warnings: [],
  },
};

describe('multi-device comparison', () => {
  it('compares one simulation against multiple released phones', () => {
    const result = compareSimulationAgainstDevices(corpus, snapshot, [
      { query: 'S26 Ultra' },
      { query: 'iPhone 17 Pro Max' },
    ]);

    expect(result.comparisons).toHaveLength(2);

    const matrix = buildComparisonMatrix(result.comparisons);
    const battery = matrix.rows.find(
      (row) => row.label === 'Battery capacity',
    );

    expect(battery?.simulated).toBe(5700);
    expect(battery?.released['s26-ultra']).toBe(5000);
    expect(battery?.released['iphone-17-pro-max']).toBe(5088);
  });
});
