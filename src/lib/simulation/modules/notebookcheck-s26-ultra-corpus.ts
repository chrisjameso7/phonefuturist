import type {
  CorpusMeasurement,
  CorpusSource,
  DeviceCorpus,
  DeviceCorpusRecord,
} from './device-corpus';

export const NOTEBOOKCHECK_S26_ULTRA_VERSION =
  'notebookcheck-s26-ultra-0.2.0';

const source: CorpusSource = {
  id: 'notebookcheck-s26-ultra-review-2026',
  publisher: 'Notebookcheck',
  url: 'https://www.notebookcheck.net/Blocks-prying-eyes-Samsung-Galaxy-S26-Ultra-review.1278349.0.html',
  sourceRole: 'measurement-lab',
  protocol:
    'Notebookcheck Galaxy S26 Ultra review measurements, including Wi-Fi web runtime, H.264 playback runtime, load runtime and whole-device load power.',
  protocolVersion: 'notebookcheck-review-2026',
  accessedDate: '2026-10-12',
};

const deviceId =
  'notebookcheck-samsung-galaxy-s26-ultra';

export function buildNotebookcheckS26UltraCorpus(): DeviceCorpus {
  const devices: DeviceCorpusRecord[] = [
    {
      variant: {
        id: deviceId,
        identity: {
          manufacturer: 'Samsung',
          family: 'Galaxy S26 Ultra',
          modelName: 'Galaxy S26 Ultra',
        },
        battery: {
          capacityMah: 5000,
        },
      },
      releaseDate: '2026',
      sourceIds: [source.id],
    },
    {
      variant: {
        id: 'notebookcheck-apple-iphone-17-pro-max',
        identity: {
          manufacturer: 'Apple',
          family: 'iPhone 17 Pro Max',
          modelName: 'iPhone 17 Pro Max',
        },
        battery: {
          capacityMah: 4823,
        },
      },
      releaseDate: '2025',
      sourceIds: [source.id],
    },
    {
      variant: {
        id: 'notebookcheck-xiaomi-17-ultra',
        identity: {
          manufacturer: 'Xiaomi',
          family: '17 Ultra',
          modelName: '17 Ultra',
        },
        battery: {
          capacityMah: 6800,
        },
      },
      releaseDate: '2026',
      sourceIds: [source.id],
    },
    {
      variant: {
        id: 'notebookcheck-honor-magic8-pro',
        identity: {
          manufacturer: 'Honor',
          family: 'Magic8 Pro',
          modelName: 'Magic8 Pro',
        },
        battery: {
          capacityMah: 6270,
        },
      },
      releaseDate: '2025',
      sourceIds: [source.id],
    },
    {
      variant: {
        id: 'notebookcheck-vivo-x300-pro',
        identity: {
          manufacturer: 'Vivo',
          family: 'X300 Pro',
          modelName: 'X300 Pro',
        },
        battery: {
          capacityMah: 5440,
        },
      },
      releaseDate: '2025',
      sourceIds: [source.id],
    },
    {
      variant: {
        id: 'notebookcheck-samsung-galaxy-s25-ultra',
        identity: {
          manufacturer: 'Samsung',
          family: 'Galaxy S25 Ultra',
          modelName: 'Galaxy S25 Ultra',
        },
        battery: {
          capacityMah: 5000,
        },
      },
      releaseDate: '2025',
      sourceIds: [source.id],
    },
  ];

  const measurements: CorpusMeasurement[] = [
    {
      id: `${deviceId}-wifi-web-runtime`,
      deviceVariantId: deviceId,
      workload: 'web_browsing',
      metric: 'wifiWebRuntimeHours',
      value: 17 + 52 / 60,
      unit: 'hours',
      sourceId: source.id,
      evidenceKind: 'measured',
      componentScope: 'whole-device',
      notes: [
        'Notebookcheck WiFi Websurfing, Chrome 146.',
      ],
    },
    {
      id: `${deviceId}-h264-runtime`,
      deviceVariantId: deviceId,
      workload: 'video_playback',
      metric: 'h264RuntimeHours',
      value: 30 + 55 / 60,
      unit: 'hours',
      sourceId: source.id,
      evidenceKind: 'measured',
      componentScope: 'whole-device',
      notes: [
        'Notebookcheck Big Buck Bunny H.264 1080p playback runtime.',
      ],
    },
    {
      id: `${deviceId}-load-runtime`,
      deviceVariantId: deviceId,
      workload: 'benchmark',
      metric: 'maximumLoadRuntimeHours',
      value: 3 + 41 / 60,
      unit: 'hours',
      sourceId: source.id,
      evidenceKind: 'measured',
      componentScope: 'whole-device',
      notes: [
        'Notebookcheck load runtime at maximum brightness.',
      ],
    },
    {
      id: `${deviceId}-load-average-power`,
      deviceVariantId: deviceId,
      workload: 'benchmark',
      metric: 'loadAveragePowerW',
      value: 14.91,
      unit: 'W',
      sourceId: source.id,
      evidenceKind: 'measured',
      componentScope: 'whole-device',
    },
    {
      id: `${deviceId}-load-maximum-power`,
      deviceVariantId: deviceId,
      workload: 'benchmark',
      metric: 'loadMaximumPowerW',
      value: 16.58,
      unit: 'W',
      sourceId: source.id,
      evidenceKind: 'measured',
      componentScope: 'whole-device',
    },
    {
      id: 'notebookcheck-iphone17pm-wifi-web-runtime',
      deviceVariantId: 'notebookcheck-apple-iphone-17-pro-max',
      workload: 'web_browsing',
      metric: 'wifiWebRuntimeHours',
      value: 28.6,
      unit: 'hours',
      sourceId: source.id,
      evidenceKind: 'measured',
      componentScope: 'whole-device',
      notes: [
        'Comparison-table runtime shown in the Galaxy S26 Ultra review.',
      ],
    },
    {
      id: 'notebookcheck-iphone17pm-h264-runtime',
      deviceVariantId: 'notebookcheck-apple-iphone-17-pro-max',
      workload: 'video_playback',
      metric: 'h264RuntimeHours',
      value: 35.2,
      unit: 'hours',
      sourceId: source.id,
      evidenceKind: 'measured',
      componentScope: 'whole-device',
    },
    {
      id: 'notebookcheck-xiaomi17u-wifi-web-runtime',
      deviceVariantId: 'notebookcheck-xiaomi-17-ultra',
      workload: 'web_browsing',
      metric: 'wifiWebRuntimeHours',
      value: 25.9,
      unit: 'hours',
      sourceId: source.id,
      evidenceKind: 'measured',
      componentScope: 'whole-device',
    },
    {
      id: 'notebookcheck-honor-magic8pro-wifi-web-runtime',
      deviceVariantId: 'notebookcheck-honor-magic8-pro',
      workload: 'web_browsing',
      metric: 'wifiWebRuntimeHours',
      value: 26.9,
      unit: 'hours',
      sourceId: source.id,
      evidenceKind: 'measured',
      componentScope: 'whole-device',
    },
    {
      id: 'notebookcheck-vivo-x300pro-wifi-web-runtime',
      deviceVariantId: 'notebookcheck-vivo-x300-pro',
      workload: 'web_browsing',
      metric: 'wifiWebRuntimeHours',
      value: 17.9,
      unit: 'hours',
      sourceId: source.id,
      evidenceKind: 'measured',
      componentScope: 'whole-device',
    },
    {
      id: 'notebookcheck-s25u-wifi-web-runtime',
      deviceVariantId: 'notebookcheck-samsung-galaxy-s25-ultra',
      workload: 'web_browsing',
      metric: 'wifiWebRuntimeHours',
      value: 22.2,
      unit: 'hours',
      sourceId: source.id,
      evidenceKind: 'measured',
      componentScope: 'whole-device',
    },
    {
      id: 'notebookcheck-s25u-h264-runtime',
      deviceVariantId: 'notebookcheck-samsung-galaxy-s25-ultra',
      workload: 'video_playback',
      metric: 'h264RuntimeHours',
      value: 32.3,
      unit: 'hours',
      sourceId: source.id,
      evidenceKind: 'measured',
      componentScope: 'whole-device',
    },
  ];

  return {
    version: NOTEBOOKCHECK_S26_ULTRA_VERSION,
    sources: [source],
    devices,
    measurements,
  };
}
