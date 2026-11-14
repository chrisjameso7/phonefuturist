import { describe, expect, it } from 'vitest';
import { calibrateCameraOutcome } from '../src/lib/simulation/modules/camera-calibration';
import type { DeviceCorpus } from '../src/lib/simulation/modules/device-corpus';

const baseDevice = {
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
    apertureFNumber: 1.8,
  }],
};

describe('camera measured evidence requirement', () => {
  it('does not resolve from reported or inferred camera outcomes', () => {
    const corpus: DeviceCorpus = {
      version: 'camera-evidence-kind',
      sources: [{
        id: 'source',
        publisher: 'Source',
        url: 'https://example.com',
        protocol: 'camera-test',
      }],
      devices: [baseDevice],
      measurements: [
        {
          id: 'reported',
          deviceVariantId: 'device',
          workload: 'camera',
          metric: 'photo_texture_score',
          value: 120,
          unit: 'score',
          sourceId: 'source',
          evidenceKind: 'reported',
          cameraRole: 'wide',
          cameraCaptureMode: 'photo-main',
        },
        {
          id: 'inferred',
          deviceVariantId: 'device',
          workload: 'camera',
          metric: 'photo_texture_score',
          value: 125,
          unit: 'score',
          sourceId: 'source',
          evidenceKind: 'inferred',
          cameraRole: 'wide',
          cameraCaptureMode: 'photo-main',
        },
      ],
    };

    const result = calibrateCameraOutcome(
      corpus,
      {
        type: 'wide',
        sensorFormatDenominator: 1.3,
        resolutionMp: 50,
        apertureFNumber: 1.8,
      },
      'photo_texture',
    );

    expect(result.status).toBe('unresolved');
    expect(result.references).toHaveLength(0);
  });
});
