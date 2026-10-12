import type {
  CorpusMeasurement,
  CorpusSource,
  DeviceCorpus,
  DeviceCorpusRecord,
} from './device-corpus';

export const NOTEBOOKCHECK_S26_ULTRA_VERSION =
  'notebookcheck-s26-ultra-0.1.0';

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
  ];

  return {
    version: NOTEBOOKCHECK_S26_ULTRA_VERSION,
    sources: [source],
    devices,
    measurements,
  };
}
