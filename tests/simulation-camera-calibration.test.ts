import { describe, expect, it } from 'vitest';
import { calibrateCameraOutcome } from '../src/lib/simulation/modules/camera-calibration';
import type { DeviceCorpus } from '../src/lib/simulation/modules/device-corpus';

const corpus: DeviceCorpus = {
  version: 'test',
  sources: [{ id: 'lab', publisher: 'Lab', url: 'https://example.com' }],
  devices: [
    {
      variant: {
        id: 'near',
        identity: { manufacturer: 'A', family: 'A', modelName: 'Near' },
      },
      cameras: [{
        role: 'wide',
        sensorFormatDenominator: 1.3,
        resolutionMp: 50,
        apertureFNumber: 1.6,
        equivalentFocalLengthMm: 24,
      }],
    },
    {
      variant: {
        id: 'far',
        identity: { manufacturer: 'B', family: 'B', modelName: 'Far' },
      },
      cameras: [{
        role: 'wide',
        sensorFormatDenominator: 2.0,
        resolutionMp: 50,
        apertureFNumber: 2.2,
        equivalentFocalLengthMm: 24,
      }],
    },
  ],
  measurements: [
    {
      id: 'near-shutter',
      deviceVariantId: 'near',
      workload: 'camera',
      metric: 'shutter_lag_ms',
      value: 82,
      unit: 'ms',
      sourceId: 'lab',
      evidenceKind: 'measured',
    },
    {
      id: 'far-shutter',
      deviceVariantId: 'far',
      workload: 'camera',
      metric: 'shutter_lag_ms',
      value: 145,
      unit: 'ms',
      sourceId: 'lab',
      evidenceKind: 'measured',
    },
  ],
};

describe('camera outcome calibration', () => {
  it('weights measured shutter lag toward optically closer cameras', () => {
    const result = calibrateCameraOutcome(
      corpus,
      {
        type: 'wide',
        sensorFormatDenominator: 1.28,
        resolutionMp: 50,
        apertureFNumber: 1.6,
        equivalentFocalLengthMm: 24,
        limit: 2,
      },
      'shutter_lag',
    );

    expect(result.status).toBe('resolved');
    expect(result.expected?.value).toBeGreaterThan(82);
    expect(result.expected?.value).toBeLessThan(145);
    expect(result.references[0].deviceVariantId).toBe('near');
    expect(result.expected?.averageSimilarity).toBeGreaterThan(0);
    expect(result.expected?.averageCoverage).toBeGreaterThan(0);
    expect(result.expected?.averageCoverage).toBeLessThanOrEqual(1);
  });

  it('fails closed for unsupported camera outcomes', () => {
    const result = calibrateCameraOutcome(
      { ...corpus, measurements: [] },
      {
        type: 'wide',
        sensorFormatDenominator: 1.3,
      },
      'video_thermal_limit',
    );

    expect(result.status).toBe('unresolved');
  });
});
