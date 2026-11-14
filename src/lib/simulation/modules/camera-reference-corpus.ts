import type { DeviceCorpus } from './device-corpus';

export const CAMERA_REFERENCE_CORPUS_VERSION =
  'camera-reference-corpus-0.1.0';

export function buildCameraReferenceCorpus(): DeviceCorpus {
  return {
    version: CAMERA_REFERENCE_CORPUS_VERSION,
    sources: [
      {
        id: 'apple-iphone-17-pro-max-specs',
        publisher: 'Apple',
        url: 'https://support.apple.com/en-us/125091',
        protocol: 'official product specification',
        accessedDate: '2026-10-09',
      },
      {
        id: 'google-pixel-10-pro-xl-specs',
        publisher: 'Google',
        url: 'https://store.google.com/product/pixel_10_pro_specs?hl=en-US',
        protocol: 'official product specification',
        accessedDate: '2026-10-09',
      },
      {
        id: 'samsung-galaxy-s26-ultra-specs',
        publisher: 'Samsung',
        url: 'https://www.samsung.com/us/smartphones/galaxy-s26-ultra/',
        protocol: 'official product specification',
        accessedDate: '2026-10-09',
      },
      {
        id: 'oneplus-15-specs',
        publisher: 'OnePlus',
        url: 'https://www.oneplus.com/global/15/specs',
        protocol: 'official product specification',
        accessedDate: '2026-10-09',
      },
      {
        id: 'vivo-x300-pro-specs',
        publisher: 'vivo',
        url: 'https://www.vivo.com/en/products/x300-pro',
        protocol: 'official product specification',
        accessedDate: '2026-10-09',
      },
      {
        id: 'honor-magic8-pro-specs',
        publisher: 'HONOR',
        url: 'https://www.honor.com/global/phones/honor-magic8-pro/',
        protocol: 'official product specification',
        accessedDate: '2026-10-09',
      },
      {
        id: 'xiaomi-17-ultra-specs',
        publisher: 'Xiaomi',
        url: 'https://www.mi.com/global/product/xiaomi-17-ultra/',
        protocol: 'official product specification',
        accessedDate: '2026-10-09',
      },
    ],
    devices: [
      {
        variant: {
          id: 'apple-iphone-17-pro-max',
          identity: {
            manufacturer: 'Apple',
            family: 'iPhone 17 Pro',
            modelName: 'iPhone 17 Pro Max',
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
        sourceIds: ['apple-iphone-17-pro-max-specs'],
      },
      {
        variant: {
          id: 'google-pixel-10-pro-xl-camera',
          identity: {
            manufacturer: 'Google',
            family: 'Pixel 10 Pro',
            modelName: 'Pixel 10 Pro XL',
          },
        },
        releaseDate: '2025',
        cameras: [
          {
            role: 'wide',
            sensorFormatDenominator: 1.3,
            resolutionMp: 50,
            apertureFNumber: 1.68,
          },
          {
            role: 'ultrawide',
            sensorFormatDenominator: 2.51,
            resolutionMp: 48,
            apertureFNumber: 1.7,
          },
          {
            role: 'telephoto',
            sensorFormatDenominator: 2.51,
            resolutionMp: 48,
            apertureFNumber: 2.8,
          },
        ],
        sourceIds: ['google-pixel-10-pro-xl-specs'],
      },
      {
        variant: {
          id: 'samsung-galaxy-s26-ultra-camera',
          identity: {
            manufacturer: 'Samsung',
            family: 'Galaxy S26',
            modelName: 'Galaxy S26 Ultra',
          },
        },
        releaseDate: '2026',
        cameras: [
          {
            role: 'wide',
            resolutionMp: 200,
            apertureFNumber: 1.4,
          },
          {
            role: 'ultrawide',
            resolutionMp: 50,
            apertureFNumber: 1.9,
          },
          {
            role: 'telephoto',
            resolutionMp: 50,
            apertureFNumber: 2.9,
          },
          {
            role: 'telephoto',
            resolutionMp: 10,
            apertureFNumber: 2.4,
          },
        ],
        sourceIds: ['samsung-galaxy-s26-ultra-specs'],
      },
      {
        variant: {
          id: 'oneplus-15-camera',
          identity: {
            manufacturer: 'OnePlus',
            family: 'OnePlus 15',
            modelName: 'OnePlus 15',
          },
        },
        releaseDate: '2025',
        cameras: [
          {
            role: 'wide',
            sensorName: 'Sony IMX906',
            resolutionMp: 50,
            apertureFNumber: 1.8,
          },
          {
            role: 'telephoto',
            sensorName: 'Samsung S5KJN5',
            resolutionMp: 50,
            apertureFNumber: 2.8,
          },
          {
            role: 'ultrawide',
            sensorName: 'OV50D',
            resolutionMp: 50,
            apertureFNumber: 2.0,
          },
        ],
        sourceIds: ['oneplus-15-specs'],
      },
      {
        variant: {
          id: 'vivo-x300-pro-camera',
          identity: {
            manufacturer: 'vivo',
            family: 'X300',
            modelName: 'X300 Pro',
          },
        },
        releaseDate: '2025',
        cameras: [
          {
            role: 'wide',
            sensorName: 'LYT-828',
            sensorFormatDenominator: 1.28,
            resolutionMp: 50,
            apertureFNumber: 1.57,
          },
          {
            role: 'telephoto',
            sensorName: 'HPB',
            sensorFormatDenominator: 1.4,
            resolutionMp: 200,
            apertureFNumber: 2.67,
          },
          {
            role: 'ultrawide',
            sensorName: 'JN1',
            sensorFormatDenominator: 2.76,
            resolutionMp: 50,
            apertureFNumber: 2.0,
          },
        ],
        sourceIds: ['vivo-x300-pro-specs'],
      },
      {
        variant: {
          id: 'honor-magic8-pro-camera',
          identity: {
            manufacturer: 'HONOR',
            family: 'Magic8',
            modelName: 'Magic8 Pro',
          },
        },
        releaseDate: '2025',
        cameras: [
          {
            role: 'wide',
            sensorFormatDenominator: 1.3,
            resolutionMp: 50,
            apertureFNumber: 1.6,
          },
          {
            role: 'telephoto',
            sensorFormatDenominator: 1.4,
            resolutionMp: 200,
            apertureFNumber: 2.6,
          },
          {
            role: 'ultrawide',
            resolutionMp: 50,
            apertureFNumber: 2.0,
          },
        ],
        sourceIds: ['honor-magic8-pro-specs'],
      },
      {
        variant: {
          id: 'xiaomi-17-ultra-camera',
          identity: {
            manufacturer: 'Xiaomi',
            family: 'Xiaomi 17',
            modelName: 'Xiaomi 17 Ultra',
          },
        },
        releaseDate: '2026',
        cameras: [
          {
            role: 'wide',
            sensorName: 'Light Fusion 1050L',
            sensorFormatDenominator: 1,
            resolutionMp: 50,
            apertureFNumber: 1.67,
            equivalentFocalLengthMm: 23,
          },
          {
            role: 'telephoto',
            sensorName: 'Samsung HPE',
            sensorFormatDenominator: 1.4,
            resolutionMp: 200,
          },
          {
            role: 'ultrawide',
            sensorFormatDenominator: 2.75,
            resolutionMp: 50,
            apertureFNumber: 2.2,
            equivalentFocalLengthMm: 14,
          },
        ],
        sourceIds: ['xiaomi-17-ultra-specs'],
      },
    ],
    measurements: [],
  };
}
