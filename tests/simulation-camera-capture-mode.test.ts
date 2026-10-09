import { describe, expect, it } from 'vitest';
import { calibrateCameraOutcome } from '../src/lib/simulation/modules/camera-calibration';
import type { DeviceCorpus } from '../src/lib/simulation/modules/device-corpus';

const corpus: DeviceCorpus = {
  version: 'capture-mode-test',
  sources: [
    {
      id: 'lab',
      publisher: 'Lab',
      url: 'https://example.com',
      protocol: 'camera-test',
    },
  ],
  devices: [
    {
      variant: {
        id: 'device',
        identity: {
          manufacturer: 'Example',
          family: 'Example',
          modelName: 'Device',
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
      id: 'photo-timing',
      deviceVariantId: 'device',
      workload: 'camera',
      cameraRole: 'wide',
      cameraCaptureMode: 'photo-main',
      metric: 'sharpness_timing_score',
      value: 120,
      unit: 'score',
      sourceId: 'lab',
      evidenceKind: 'measured',
    },
    {
      id: 'video-timing',
      deviceVariantId: 'device',
      workload: 'camera',
      cameraRole: 'wide',
      cameraCaptureMode: 'video-main',
      metric: 'sharpness_timing_score',
      value: 80,
      unit: 'score',
      sourceId: 'lab',
      evidenceKind: 'measured',
    },
  ],
};

describe('camera capture-mode isolation', () => {
  it('keeps photo sharpness timing separate from video evidence', () => {
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
    expect(result.references[0].cameraCaptureMode).toBe('photo-main');
    expect(result.expected?.value).toBe(120);
  });
});
