import { describe, expect, it } from 'vitest';
import { calibrateCameraOutcome } from '../src/lib/simulation/modules/camera-calibration';
import type { DeviceCorpus } from '../src/lib/simulation/modules/device-corpus';

const corpus: DeviceCorpus = {
  version: 'protocol-test',
  sources: [
    {
      id: 'lab-a',
      publisher: 'Lab A',
      url: 'https://example.com/a',
      protocol: 'timing-v1',
    },
    {
      id: 'lab-b',
      publisher: 'Lab B',
      url: 'https://example.com/b',
      protocol: 'timing-v2',
    },
  ],
  devices: [
    {
      variant: {
        id: 'a',
        identity: {
          manufacturer: 'A',
          family: 'A',
          modelName: 'A',
        },
      },
      cameras: [{
        role: 'wide',
        sensorFormatDenominator: 1.3,
        resolutionMp: 50,
        apertureFNumber: 1.6,
      }],
    },
    {
      variant: {
        id: 'b',
        identity: {
          manufacturer: 'B',
          family: 'B',
          modelName: 'B',
        },
      },
      cameras: [{
        role: 'wide',
        sensorFormatDenominator: 1.3,
        resolutionMp: 50,
        apertureFNumber: 1.6,
      }],
    },
  ],
  measurements: [
    {
      id: 'a-score',
      deviceVariantId: 'a',
      workload: 'camera',
      cameraRole: 'wide',
      metric: 'sharpness_timing_score',
      value: 120,
      unit: 'score',
      sourceId: 'lab-a',
      evidenceKind: 'measured',
    },
    {
      id: 'b-score',
      deviceVariantId: 'b',
      workload: 'camera',
      cameraRole: 'wide',
      metric: 'sharpness_timing_score',
      value: 40,
      unit: 'score',
      sourceId: 'lab-b',
      evidenceKind: 'measured',
    },
  ],
};

describe('camera protocol isolation', () => {
  it('never averages outcome measurements across protocol families', () => {
    const result = calibrateCameraOutcome(
      corpus,
      {
        type: 'wide',
        sensorFormatDenominator: 1.3,
        resolutionMp: 50,
        apertureFNumber: 1.6,
      },
      'sharpness_timing',
    );

    expect(result.status).toBe('resolved');
    expect(result.references).toHaveLength(1);
    expect([120, 40]).toContain(result.expected?.value);
  });
});
