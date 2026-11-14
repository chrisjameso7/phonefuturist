import { describe, expect, it } from 'vitest';
import { compareSimulationExperienceToReleasedDevice } from '../src/lib/simulation/modules/experience-comparison';
import type { DeviceCorpus } from '../src/lib/simulation/modules/device-corpus';
import type { SimulationSnapshot } from '../src/lib/simulation/simulation-snapshot';

const corpus: DeviceCorpus = {
  version: 'test',
  sources: [{ id: 'lab', publisher: 'Lab', url: 'https://example.com' }],
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
      dimensions: { thicknessMm: 8.2, weightG: 218 },
      cameras: [{
        role: 'wide',
        sensorFormatDenominator: 1.3,
        resolutionMp: 200,
        apertureFNumber: 1.7,
        equivalentFocalLengthMm: 24,
      }],
    },
  ],
  measurements: [
    {
      id: 'web',
      deviceVariantId: 's26-ultra',
      workload: 'web_browsing',
      metric: 'runtime',
      value: 12,
      unit: 'hours',
      sourceId: 'lab',
      evidenceKind: 'measured',
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
    dimensions: { thicknessMm: 8.1, weightG: 220 },
    battery: { cells: [{ capacityMah: 5700 }] },
    cameras: [{
      type: 'wide',
      sensorFormatDenominator: 1.28,
      resolutionMp: 200,
      apertureFNumber: 1.6,
      equivalentFocalLengthMm: 24,
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

describe('experience comparison', () => {
  it('turns raw hardware differences into comparable experience metrics', () => {
    const result = compareSimulationExperienceToReleasedDevice(
      corpus,
      snapshot,
      'S26 Ultra',
    );

    expect(result.status).toBe('resolved');
    expect(
      result.deltas.some(
        (delta) =>
          delta.domain === 'battery' &&
          delta.label === 'Battery capacity' &&
          delta.delta === 700,
      ),
    ).toBe(true);
    expect(
      result.deltas.some((delta) => delta.domain === 'camera'),
    ).toBe(true);
  });
});
