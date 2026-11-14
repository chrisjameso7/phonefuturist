import type {
  CorpusMeasurement,
  CorpusSource,
  DeviceCorpus,
  DeviceCorpusRecord,
} from './device-corpus';

export const TOMSGUIDE_CURRENT_BATTERY_VERSION =
  'tomsguide-current-battery-0.1.0';

const source: CorpusSource = {
  id: 'tomsguide-web-battery-current-2025-2026',
  publisher: "Tom's Guide",
  url: 'https://www.tomsguide.com/us/smartphones-best-battery-life,review-2857.html',
  sourceRole: 'measurement-lab',
  protocol:
    'Updated Tom’s Guide continuous web-surfing battery test used on newer 2025-2026 phones; display set to 150 nits and cellular connectivity used until shutdown.',
  protocolVersion: '2025-current',
  accessedDate: '2026-10-12',
};

const rows = [
  ['oneplus-15', 'OnePlus', '15', 25 + 13 / 60],
  ['oneplus-15r', 'OnePlus', '15R', 21 + 54 / 60],
  ['motorola-moto-g-2026', 'Motorola', 'Moto G (2026)', 19 + 10 / 60],
  ['motorola-moto-g-play-2026', 'Motorola', 'Moto G Play (2026)', 18 + 50 / 60],
  ['motorola-moto-g-power-2026', 'Motorola', 'Moto G Power (2026)', 18 + 22 / 60],
  ['apple-iphone-17-pro-max', 'Apple', 'iPhone 17 Pro Max', 17 + 54 / 60],
  ['samsung-galaxy-s25-ultra-retest', 'Samsung', 'Galaxy S25 Ultra', 14 + 27 / 60],
] as const;

export function buildTomsGuideCurrentBatteryCorpus(): DeviceCorpus {
  const devices: DeviceCorpusRecord[] =
    rows.map(([slug, manufacturer, model]) => ({
      variant: {
        id: `tomsguide-${slug}`,
        identity: {
          manufacturer,
          family: model,
          modelName: model,
        },
        notes: [
          'Tom’s Guide updated battery protocol row.',
          'Do not pool with Tom’s Guide legacy web-battery results unless protocol compatibility is explicitly established.',
        ],
      },
      sourceIds: [source.id],
    }));

  const measurements: CorpusMeasurement[] =
    rows.map(([slug, _manufacturer, _model, hours]) => ({
      id: `tomsguide-${slug}-web-runtime-hours`,
      deviceVariantId: `tomsguide-${slug}`,
      workload: 'web_browsing',
      metric: 'webRuntimeHours',
      value: hours,
      unit: 'hours',
      sourceId: source.id,
      evidenceKind: 'measured',
      displayBrightnessNits: 150,
      componentScope: 'whole-device',
      notes: [
        'Updated Tom’s Guide continuous web-surfing battery test over cellular connectivity.',
      ],
    }));

  return {
    version: TOMSGUIDE_CURRENT_BATTERY_VERSION,
    sources: [source],
    devices,
    measurements,
  };
}
