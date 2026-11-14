import { describe, expect, it } from 'vitest';
import { calibrateCameraOutcome } from '../src/lib/simulation/modules/camera-calibration';
import type { DeviceCorpus } from '../src/lib/simulation/modules/device-corpus';

const corpus: DeviceCorpus = {
  version: 'camera-role-test',
  sources: [
    {
      id: 'lab',
      publisher: 'Lab',
      url: 'https://example.com',
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
      cameras: [
        {
          role: 'wide',
          sensorFormatDenominator: 1.3,
          resolutionMp: 50,
          apertureFNumber: 1.6,
          equivalentFocalLengthMm: 24,
        },
        {
          role: 'telephoto',
          sensorFormatDenominator: 2.5,
          resolutionMp: 50,
          apertureFNumber: 2.8,
          equivalentFocalLengthMm: 120,
        },
      ],
    },
  ],
  measurements: [
    {
      id: 'wide-shutter',
      deviceVariantId: 'device',
      workload: 'camera',
      cameraRole: 'wide',
      metric: 'shutter_lag_ms',
      value: 80,
      unit: 'ms',
      sourceId: 'lab',
      evidenceKind: 'measured',
    },
    {
      id: 'tele-shutter',
      deviceVariantId: 'device',
      workload: 'camera',
      cameraRole: 'telephoto',
      metric: 'shutter_lag_ms',
      value: 260,
      unit: 'ms',
      sourceId: 'lab',
      evidenceKind: 'measured',
    },
  ],
};

describe('camera module-aware evidence', () => {
  it('does not leak telephoto measurements into wide-camera calibration', () => {
    const result = calibrateCameraOutcome(
      corpus,
      {
        type: 'wide',
        sensorFormatDenominator: 1.3,
        resolutionMp: 50,
        apertureFNumber: 1.6,
        equivalentFocalLengthMm: 24,
      },
      'shutter_lag',
    );

    expect(result.status).toBe('resolved');
    expect(result.references).toHaveLength(1);
    expect(result.references[0].cameraRole).toBe('wide');
    expect(result.expected?.value).toBe(80);
  });

  it('resolves the telephoto measurement only for a telephoto query', () => {
    const result = calibrateCameraOutcome(
      corpus,
      {
        type: 'telephoto',
        sensorFormatDenominator: 2.5,
        resolutionMp: 50,
        apertureFNumber: 2.8,
        equivalentFocalLengthMm: 120,
      },
      'shutter_lag',
    );

    expect(result.status).toBe('resolved');
    expect(result.references).toHaveLength(1);
    expect(result.references[0].cameraRole).toBe('telephoto');
    expect(result.expected?.value).toBe(260);
  });
});
