import type { DeviceCorpus } from './device-corpus';

export const CAMERA_OUTCOME_CORPUS_VERSION =
  'camera-outcome-corpus-0.1.0';

export function buildCameraOutcomeCorpus(): DeviceCorpus {
  return {
    version: CAMERA_OUTCOME_CORPUS_VERSION,
    sources: [
      {
        id: 'dxo-pixel-10-pro-xl-camera',
        publisher: 'DXOMARK',
        url: 'https://www.dxomark.com/google-pixel-10-pro-xl-camera-test/',
        protocol: 'DXOMARK Camera photo Sharpness & Timing',
        accessedDate: '2026-10-09',
      },
      {
        id: 'dxo-galaxy-s26-ultra-camera',
        publisher: 'DXOMARK',
        url: 'https://www.dxomark.com/samsung-galaxy-s26-ultra-camera-test/',
        protocol: 'DXOMARK Camera photo Sharpness & Timing',
        accessedDate: '2026-10-09',
      },
      {
        id: 'dxo-honor-magic8-pro-camera',
        publisher: 'DXOMARK',
        url: 'https://www.dxomark.com/honor-magic8-pro-camera-test/',
        protocol: 'DXOMARK Camera photo Sharpness & Timing',
        accessedDate: '2026-10-09',
      },
      {
        id: 'dxo-vivo-x300-pro-camera',
        publisher: 'DXOMARK',
        url: 'https://www.dxomark.com/vivo-x300-pro-camera-test/',
        protocol: 'DXOMARK Camera photo Sharpness & Timing',
        accessedDate: '2026-10-09',
      },
      {
        id: 'dxo-iphone-17-pro-camera',
        publisher: 'DXOMARK',
        url: 'https://www.dxomark.com/apple-iphone-17-pro-camera-test/',
        protocol: 'DXOMARK Camera photo Sharpness & Timing',
        accessedDate: '2026-10-09',
      },
    ],
    devices: [
      {
        variant: {
          id: 'apple-iphone-17-pro-camera',
          identity: {
            manufacturer: 'Apple',
            family: 'iPhone 17 Pro',
            modelName: 'iPhone 17 Pro',
          },
        },
        releaseDate: '2025',
        cameras: [
          {
            role: 'wide',
            resolutionMp: 48,
            apertureFNumber: 1.78,
            equivalentFocalLengthMm: 24,
          },
          {
            role: 'ultrawide',
            resolutionMp: 48,
            apertureFNumber: 2.2,
            equivalentFocalLengthMm: 13,
          },
          {
            role: 'telephoto',
            resolutionMp: 48,
            apertureFNumber: 2.8,
            equivalentFocalLengthMm: 100,
          },
        ],
        sourceIds: ['dxo-iphone-17-pro-camera'],
      },
    ],
    measurements: [
      {
        id: 'pixel-10-pro-xl-dxo-photo-sharpness-timing',
        deviceVariantId: 'google-pixel-10-pro-xl-camera',
        workload: 'camera',
        cameraRole: 'wide',
        cameraCaptureMode: 'photo-main',
        metric: 'sharpness_timing_score',
        value: 115,
        unit: 'score',
        sourceId: 'dxo-pixel-10-pro-xl-camera',
        evidenceKind: 'measured',
      },
      {
        id: 'galaxy-s26-ultra-dxo-photo-sharpness-timing',
        deviceVariantId: 'samsung-galaxy-s26-ultra-camera',
        workload: 'camera',
        cameraRole: 'wide',
        cameraCaptureMode: 'photo-main',
        metric: 'sharpness_timing_score',
        value: 110,
        unit: 'score',
        sourceId: 'dxo-galaxy-s26-ultra-camera',
        evidenceKind: 'measured',
      },
      {
        id: 'honor-magic8-pro-dxo-photo-sharpness-timing',
        deviceVariantId: 'honor-magic8-pro-camera',
        workload: 'camera',
        cameraRole: 'wide',
        cameraCaptureMode: 'photo-main',
        metric: 'sharpness_timing_score',
        value: 115,
        unit: 'score',
        sourceId: 'dxo-honor-magic8-pro-camera',
        evidenceKind: 'measured',
      },
      {
        id: 'vivo-x300-pro-dxo-photo-sharpness-timing',
        deviceVariantId: 'vivo-x300-pro-camera',
        workload: 'camera',
        cameraRole: 'wide',
        cameraCaptureMode: 'photo-main',
        metric: 'sharpness_timing_score',
        value: 109,
        unit: 'score',
        sourceId: 'dxo-vivo-x300-pro-camera',
        evidenceKind: 'measured',
      },
      {
        id: 'iphone-17-pro-dxo-photo-sharpness-timing',
        deviceVariantId: 'apple-iphone-17-pro-camera',
        workload: 'camera',
        cameraRole: 'wide',
        cameraCaptureMode: 'photo-main',
        metric: 'sharpness_timing_score',
        value: 120,
        unit: 'score',
        sourceId: 'dxo-iphone-17-pro-camera',
        evidenceKind: 'measured',
      },
    ],
  };
}
