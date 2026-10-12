import { describe, expect, it } from 'vitest';
import { findComparableCameras } from '../src/lib/simulation/modules/camera-comparables';
import type { DeviceCorpus } from '../src/lib/simulation/modules/device-corpus';

const corpus: DeviceCorpus = {
  version: 'coverage-test',
  sources: [],
  devices: [
    {
      variant: {
        id: 'complete',
        identity: {
          manufacturer: 'A',
          family: 'A',
          modelName: 'Complete',
        },
      },
      cameras: [{
        role: 'wide',
        sensorFormatDenominator: 1.3,
        resolutionMp: 50,
        apertureFNumber: 1.8,
        equivalentFocalLengthMm: 24,
      }],
    },
    {
      variant: {
        id: 'sparse',
        identity: {
          manufacturer: 'B',
          family: 'B',
          modelName: 'Sparse',
        },
      },
      cameras: [{
        role: 'wide',
        resolutionMp: 50,
        apertureFNumber: 1.8,
      }],
    },
  ],
  measurements: [],
};

describe('camera comparable evidence coverage', () => {
  it('ranks complete optical records above equally similar sparse records', () => {
    const matches = findComparableCameras(corpus, {
      type: 'wide',
      sensorFormatDenominator: 1.3,
      resolutionMp: 50,
      apertureFNumber: 1.8,
      equivalentFocalLengthMm: 24,
    });

    expect(matches).toHaveLength(2);
    expect(matches[0].deviceVariantId).toBe('complete');
    expect(matches[0].coverageScore).toBe(1);
    expect(matches[1].deviceVariantId).toBe('sparse');
    expect(matches[1].coverageScore).toBeLessThan(1);
    expect(matches[0].score).toBeGreaterThan(matches[1].score);
  });
});
