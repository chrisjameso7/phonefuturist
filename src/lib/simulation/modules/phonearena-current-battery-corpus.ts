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
  {
    id: 'phonearena-xiaomi15t-pro-5500',
    manufacturer: 'Xiaomi',
    model: '15T Pro',
    batteryMah: 5500,
    releaseDate: '2025-09-24',
    estimate: [9, 37],
    browsing: [24, 49],
    video: [12, 52],
    gaming: [12, 9],
  },
  {
    id: 'phonearena-vivo-x200-ultra-6000',
    manufacturer: 'vivo',
    model: 'X200 Ultra',
    batteryMah: 6000,
    releaseDate: '2025-04-29',
    estimate: [9, 37],
    browsing: [22, 0],
    video: [13, 41],
    gaming: [14, 19],
  },
  {
    id: 'phonearena-redmagic10s-pro-7050',
    manufacturer: 'nubia',
    model: 'RedMagic 10S Pro',
    batteryMah: 7050,
    releaseDate: '2025-06-04',
    estimate: [9, 34],
    browsing: [21, 26],
    video: [13, 59],
    gaming: [13, 55],
  },
  {
    id: 'phonearena-poco-f9-ultra-8050',
    manufacturer: 'POCO',
    model: 'F9 Ultra',
    batteryMah: 8050,
    releaseDate: '2026-09-01',
    estimate: [9, 32],
    browsing: [29, 55],
    video: [8, 59],
    gaming: [13, 27],
  },
  {
    id: 'phonearena-moto-g-play-2026-5200',
    manufacturer: 'Motorola',
    model: 'Moto G Play (2026)',
    batteryMah: 5200,
    releaseDate: '2025-11-13',
    estimate: [9, 27],
    browsing: [24, 57],
    video: [12, 57],
    gaming: [10, 16],
  },
  {
    id: 'phonearena-poco-f8-pro-6210',
    manufacturer: 'POCO',
    model: 'F8 Pro',
    batteryMah: 6210,
    releaseDate: '2025-11-26',
    estimate: [9, 25],
    browsing: [20, 6],
    video: [14, 24],
    gaming: [13, 37],
  },
  {
    id: 'phonearena-redmi-note17-pro-8340',
    manufacturer: 'Xiaomi',
    model: 'Redmi Note 17 Pro',
    batteryMah: 8340,
    releaseDate: '2026-08-27',
    estimate: [9, 20],
    browsing: [16, 57],
    video: [16, 11],
    gaming: [13, 10],
  },
  {
    id: 'phonearena-redmi-note15-pro5g-6580',
    manufacturer: 'Xiaomi',
    model: 'Redmi Note 15 Pro 5G',
    batteryMah: 6580,
    releaseDate: '2026-01-06',
    estimate: [9, 5],
    browsing: [22, 16],
    video: [12, 46],
    gaming: [11, 40],
  },
  {
    id: 'phonearena-xiaomi17-ultra-6800',
    manufacturer: 'Xiaomi',
    model: '17 Ultra',
    batteryMah: 6800,
    releaseDate: '2025-12-27',
    estimate: [9, 2],
    browsing: [22, 39],
    video: [14, 9],
    gaming: [7, 10],
  },
  {
    id: 'phonearena-vivo-v60-6500',
    manufacturer: 'vivo',
    model: 'V60',
    batteryMah: 6500,
    releaseDate: '2025-08-19',
    estimate: [9, 2],
    browsing: [23, 55],
    video: [10, 39],
    gaming: [14, 7],
  },
  {
    id: 'phonearena-redmi-note17-5g-7700',
    manufacturer: 'Xiaomi',
    model: 'Redmi Note 17 5G',
    batteryMah: 7700,
    releaseDate: '2026-07-14',
    estimate: [8, 58],
    browsing: [15, 12],
    video: [16, 58],
    gaming: [10, 50],
  },
  {
    id: 'phonearena-oppo-find-x8-ultra-6100',
    manufacturer: 'OPPO',
    model: 'Find X8 Ultra',
    batteryMah: 6100,
    releaseDate: '2025-04-16',
    estimate: [8, 56],
    browsing: [23, 36],
    video: [11, 1],
    gaming: [12, 47],
  },
  {
    id: 'phonearena-huawei-pura90s-pro-max-6000',
    manufacturer: 'Huawei',
    model: 'Pura 90s Pro Max',
    batteryMah: 6000,
    releaseDate: '2026-08-01',
    estimate: [8, 50],
    browsing: [16, 57],
    video: [15, 6],
    gaming: [11, 45],
  },
  {
    id: 'phonearena-oneplus15r-7400',
    manufacturer: 'OnePlus',
    model: '15R',
    batteryMah: 7400,
    releaseDate: '2025-12-22',
    estimate: [8, 47],
    browsing: [18, 10],
    video: [13, 0],
    gaming: [14, 40],
  },
  {
    id: 'phonearena-honor600-7000',
    manufacturer: 'Honor',
    model: '600',
    batteryMah: 7000,
    releaseDate: '2026-04-29',
    estimate: [8, 42],
    browsing: [19, 54],
    video: [12, 12],
    gaming: [13, 20],
  },
  {
    id: 'phonearena-edge60-pro-6000',
    manufacturer: 'Motorola',
    model: 'Edge 60 Pro',
    batteryMah: 6000,
    releaseDate: '2025-04-30',
    estimate: [8, 34],
    browsing: [18, 44],
    video: [12, 21],
    gaming: [13, 40],
  },
  {
    id: 'phonearena-vivo-x300-ultra-6600',
    manufacturer: 'vivo',
    model: 'X300 Ultra',
    batteryMah: 6600,
    releaseDate: '2026-03-30',
    estimate: [8, 28],
    browsing: [20, 19],
    video: [11, 54],
    gaming: [11, 30],
  },
  {
    id: 'phonearena-honor-magic-v-flip2-5500',
    manufacturer: 'Honor',
    model: 'Magic V Flip 2',
    batteryMah: 5500,
    releaseDate: '2025-08-21',
    estimate: [8, 19],
    browsing: [21, 26],
    video: [11, 6],
    gaming: [10, 34],
  },
  {
    id: 'phonearena-moto-g-2025-5000',
    manufacturer: 'Motorola',
    model: 'Moto G (2025)',
    batteryMah: 5000,
    releaseDate: '2025-02-06',
    estimate: [8, 15],
    browsing: [22, 3],
    video: [10, 3],
    gaming: [11, 42],
  },
  {
    id: 'phonearena-razr-plus-2026-4500',
    manufacturer: 'Motorola',
    model: 'Razr Plus (2026)',
    batteryMah: 4500,
    releaseDate: '2026-05-14',
    estimate: [8, 13],
    browsing: [16, 48],
    video: [15, 5],
    gaming: [6, 40],
  },
  {
    id: 'phonearena-poco-f7-pro-6000',
    manufacturer: 'POCO',
    model: 'F7 Pro',
    batteryMah: 6000,
    releaseDate: '2025-03-27',
    estimate: [8, 12],
    browsing: [17, 39],
    video: [12, 54],
    gaming: [10, 49],
  },
  {
    id: 'phonearena-pixel9a-5100',
    manufacturer: 'Google',
    model: 'Pixel 9a',
    batteryMah: 5100,
    releaseDate: '2025-03-26',
    estimate: [8, 11],
    browsing: [19, 39],
    video: [10, 57],
    gaming: [12, 30],
  },
  {
    id: 'phonearena-redmagic11-air-7000',
    manufacturer: 'nubia',
    model: 'RedMagic 11 Air',
    batteryMah: 7000,
    releaseDate: '2026-01-20',
    estimate: [8, 7],
    browsing: [18, 59],
    video: [11, 38],
    gaming: [11, 14],
  },
  {
    id: 'phonearena-galaxy-a17-5g-5000',
    manufacturer: 'Samsung',
    model: 'Galaxy A17 5G',
    batteryMah: 5000,
    releaseDate: '2025-08-08',
    estimate: [8, 6],
    browsing: [17, 36],
    video: [13, 26],
    gaming: [8, 37],
  },
  {
    id: 'phonearena-vivo-x300-6040',
    manufacturer: 'vivo',
    model: 'X300',
    batteryMah: 6040,
    releaseDate: '2025-10-17',
    estimate: [8, 3],
    browsing: [19, 46],
    video: [11, 10],
    gaming: [10, 39],
  },
  {
    id: 'phonearena-redmi-note15-6000',
    manufacturer: 'Xiaomi',
    model: 'Redmi Note 15',
    batteryMah: 6000,
    releaseDate: '2026-01-06',
    estimate: [8, 2],
    browsing: [19, 2],
    video: [11, 53],
    gaming: [9, 53],
  },
  {
    id: 'phonearena-nothing-phone4b-5200',
    manufacturer: 'Nothing',
    model: 'Phone (4b)',
    batteryMah: 5200,
    releaseDate: '2026-07-17',
    estimate: [8, 0],
    browsing: [18, 55],
    video: [11, 43],
    gaming: [10, 9],
  },
  {
    id: 'phonearena-galaxy-s25-ultra-5000',
    manufacturer: 'Samsung',
    model: 'Galaxy S25 Ultra',
    batteryMah: 5000,
    releaseDate: '2025-02-07',
    estimate: [8, 0],
    browsing: [20, 49],
    video: [8, 54],
    gaming: [14, 21],
  },
  {
    id: 'phonearena-edge70-4800',
    manufacturer: 'Motorola',
    model: 'Edge 70',
    batteryMah: 4800,
    releaseDate: '2025-10-29',
    estimate: [7, 59],
    browsing: [21, 25],
    video: [10, 13],
    gaming: [10, 0],
  },
  {
    id: 'phonearena-cmf-phone2-pro-5000',
    manufacturer: 'Nothing',
    model: 'CMF Phone 2 Pro',
    batteryMah: 5000,
    releaseDate: '2025-05-06',
    estimate: [7, 55],
    browsing: [14, 19],
    video: [13, 27],
    gaming: [11, 58],
  }
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
