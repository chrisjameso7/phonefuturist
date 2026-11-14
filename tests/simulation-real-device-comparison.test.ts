import { describe, expect, it } from 'vitest';
import { compareSimulationToReleasedDevice } from '../src/lib/simulation/modules/real-device-comparison';
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
      display: { diagonalInches: 6.9, refreshRateHz: 120 },
      dimensions: { thicknessMm: 8.2, weightG: 218 },
      cameras: [{
        role: 'wide',
        resolutionMp: 200,
        apertureFNumber: 1.7,
      }],
    },
  ],
};

const snapshot: SimulationSnapshot = {
  version: 'simulation-snapshot-0.1.0',
  id: 's27-concept',
  title: 'Galaxy S27 Ultra concept',
  createdAt: new Date().toISOString(),
  visibility: 'private',
  engineVersion: 'test',
  input: {
    formFactor: 'phone',
    name: 'Galaxy S27 Ultra',
    dimensions: { thicknessMm: 8.1, weightG: 220 },
    displays: { primary: { diagonalInches: 6.9 } },
    battery: { cells: [{ capacityMah: 5700 }] },
    cameras: [{
      type: 'wide',
      resolutionMp: 200,
      apertureFNumber: 1.6,
    }],
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

describe('simulation to released-device comparison', () => {
  it('pulls a released phone from the corpus and calculates deltas', () => {
    const result = compareSimulationToReleasedDevice(
      corpus,
      snapshot,
      'S26 Ultra',
    );

    expect(result.status).toBe('resolved');
    expect(result.releasedVariant?.variant.id).toBe('s26-ultra');

    const battery = result.metrics.find(
      (metric) => metric.key === 'battery.capacityMah',
    );

    expect(battery?.simulated).toBe(5700);
    expect(battery?.released).toBe(5000);
    expect(battery?.delta).toBe(700);
    expect(battery?.deltaPercent).toBeCloseTo(14);
  });
});
