import type {
  CorpusMeasurement,
  DeviceCorpus,
  DeviceCorpusRecord,
} from './device-corpus';

export const PHONEARENA_CURRENT_BATTERY_VERSION =
  'phonearena-current-battery-0.1.0';

type Row = {
  id: string;
  manufacturer: string;
  model: string;
  batteryMah: number;
  releaseDate?: string;
  browsing: [number, number];
  video: [number, number];
  gaming: [number, number];
  estimate: [number, number];
};

function hours(
  [h, m]: [number, number],
) {
  return h + m / 60;
}

const rows: readonly Row[] = [
  {
    id: 'phonearena-redmi-note17-pro-max-5g',
    manufacturer: 'Xiaomi',
    model: 'Redmi Note 17 Pro Max 5G',
    batteryMah: 9210,
    releaseDate: '2026-08-28',
    estimate: [13, 32],
    browsing: [33, 47],
    video: [17, 50],
    gaming: [19, 28],
  },
  {
    id: 'phonearena-honor-magic8-lite-7500',
    manufacturer: 'Honor',
    model: 'Magic8 Lite',
    batteryMah: 7500,
    releaseDate: '2025-12-08',
    estimate: [11, 25],
    browsing: [23, 41],
    video: [19, 23],
    gaming: [12, 49],
  },
  {
    id: 'phonearena-oneplus15-7300-current',
    manufacturer: 'OnePlus',
    model: '15',
    batteryMah: 7300,
    releaseDate: '2025-10-28',
    estimate: [10, 44],
    browsing: [30, 6],
    video: [12, 37],
    gaming: [14, 16],
  },
  {
    id: 'phonearena-redmagic11-pro-7500',
    manufacturer: 'nubia',
    model: 'RedMagic 11 Pro',
    batteryMah: 7500,
    releaseDate: '2025-10-17',
    estimate: [10, 43],
    browsing: [25, 55],
    video: [15, 5],
    gaming: [14, 14],
  },
  {
    id: 'phonearena-iphone18-pro-max-5567',
    manufacturer: 'Apple',
    model: 'iPhone 18 Pro Max',
    batteryMah: 5567,
    releaseDate: '2026-09-18',
    estimate: [10, 31],
    browsing: [29, 38],
    video: [12, 4],
    gaming: [14, 34],
  },
  {
    id: 'phonearena-huawei-mate80-pro-5750',
    manufacturer: 'Huawei',
    model: 'Mate 80 Pro',
    batteryMah: 5750,
    releaseDate: '2026-02-26',
    estimate: [10, 23],
    browsing: [23, 46],
    video: [17, 37],
    gaming: [8, 21],
  },
  {
    id: 'phonearena-poco-x8-pro-max-8500',
    manufacturer: 'POCO',
    model: 'X8 Pro Max',
    batteryMah: 8500,
    releaseDate: '2026-03-17',
    estimate: [10, 21],
    browsing: [26, 6],
    video: [15, 26],
    gaming: [9, 55],
  },
  {
    id: 'phonearena-motorola-edge70-pro-6500',
    manufacturer: 'Motorola',
    model: 'Edge 70 Pro',
    batteryMah: 6500,
    releaseDate: '2026-04-29',
    estimate: [10, 13],
    browsing: [22, 26],
    video: [15, 58],
    gaming: [12, 57],
  },
  {
    id: 'phonearena-nubia-z80-ultra-7200',
    manufacturer: 'nubia',
    model: 'Z80 Ultra',
    batteryMah: 7200,
    releaseDate: '2025-11-06',
    estimate: [10, 7],
    browsing: [23, 10],
    video: [13, 25],
    gaming: [17, 23],
  },
  {
    id: 'phonearena-redmagic11s-pro-7500',
    manufacturer: 'nubia',
    model: 'RedMagic 11S Pro',
    batteryMah: 7500,
    releaseDate: '2026-06-10',
    estimate: [10, 1],
    browsing: [22, 12],
    video: [16, 13],
    gaming: [11, 5],
  },
  {
    id: 'phonearena-oppo-find-x9-pro-7500-current',
    manufacturer: 'OPPO',
    model: 'Find X9 Pro',
    batteryMah: 7500,
    releaseDate: '2025-10-22',
    estimate: [9, 50],
    browsing: [25, 34],
    video: [13, 30],
    gaming: [11, 17],
  },
  {
    id: 'phonearena-xiaomi17-6330',
    manufacturer: 'Xiaomi',
    model: '17',
    batteryMah: 6330,
    releaseDate: '2025-10-27',
    estimate: [9, 48],
    browsing: [24, 48],
    video: [15, 41],
    gaming: [6, 40],
  },
  {
    id: 'phonearena-xiaomi17t-pro-7000',
    manufacturer: 'Xiaomi',
    model: '17T Pro',
    batteryMah: 7000,
    estimate: [9, 43],
    browsing: [27, 14],
    video: [14, 14],
    gaming: [5, 51],
  },
] as const;

export function buildPhoneArenaCurrentBatteryCorpus(): DeviceCorpus {
  const sourceId =
    'phonearena-battery-current-2026-10';

  const devices:
    DeviceCorpusRecord[] =
    rows.map((row) => ({
      variant: {
        id: row.id,
        identity: {
          manufacturer:
            row.manufacturer,
          family: row.model,
          modelName: row.model,
        },
        battery: {
          capacityMah:
            row.batteryMah,
        },
        notes: [
          'PhoneArena current battery protocol cohort.',
          'Battery tests at 200 nits, Wi-Fi, 100% battery health, latest firmware at test time.',
        ],
      },
      ...(row.releaseDate
        ? {
            releaseDate:
              row.releaseDate,
          }
        : {}),
      sourceIds: [sourceId],
    }));

  const measurements:
    CorpusMeasurement[] = [];

  for (const row of rows) {
    const shared = {
      deviceVariantId: row.id,
      unit: 'hours',
      sourceId,
      evidenceKind:
        'measured' as const,
      displayBrightnessNits: 200,
      componentScope:
        'whole-device' as const,
      notes: [
        'PhoneArena battery protocol: Wi-Fi at fixed 200-nit display brightness.',
      ],
    };

    measurements.push(
      {
        id:
          row.id +
          '-battery-estimate',
        workload: 'benchmark',
        metric:
          'phonearena_battery_life_estimate_hours',
        value:
          hours(row.estimate),
        ...shared,
      },
      {
        id:
          row.id +
          '-browsing',
        workload: 'web_browsing',
        metric: 'browsingHours',
        value:
          hours(row.browsing),
        ...shared,
      },
      {
        id:
          row.id +
          '-video',
        workload:
          'video_playback',
        metric: 'videoHours',
        value:
          hours(row.video),
        ...shared,
      },
      {
        id:
          row.id +
          '-gaming',
        workload: 'gaming',
        metric: 'gamingHours',
        value:
          hours(row.gaming),
        ...shared,
      },
    );
  }

  return {
    version:
      PHONEARENA_CURRENT_BATTERY_VERSION,
    sources: [
      {
        id: sourceId,
        publisher: 'PhoneArena',
        url:
          'https://www.phonearena.com/phones/benchmarks/battery?f%5By%5D=2026%2C2025',
        protocol:
          'PhoneArena current battery benchmark: browsing, video streaming and 3D gaming at 200 nits over Wi-Fi; new devices at 100% battery health',
        accessedDate:
          '2026-10-11',
      },
    ],
    devices,
    measurements,
  };
}
