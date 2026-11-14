import type {
  CorpusMeasurement,
  CorpusSource,
  DeviceCorpus,
  DeviceCorpusRecord,
} from './device-corpus';

export const DXOMARK_CURRENT_BATTERY_VERSION =
  'dxomark-current-battery-2026-10-0.1.0';

type ScoreRow = {
  manufacturer: string;
  model: string;
  releaseDate: string;
  batteryScore: number;
};

type ChargeRow = {
  manufacturer: string;
  model: string;
  batteryMah: number;
  wiredWatts: number;
  wired30mPercent: number;
  wired80Minutes: number;
  wiredFullMinutes: number;
  batteryScore: number;
  wirelessWatts?: number;
  wireless30mPercent?: number;
  wireless80Minutes?: number;
  wirelessFullMinutes?: number;
  sourceId: string;
};

const SCORE_SOURCE_ID =
  'dxomark-smartphone-battery-ranking-2026-10';

const SCORES: readonly ScoreRow[] = [
  { manufacturer: 'Huawei', model: 'Pura 80 Ultra', releaseDate: '2025-06', batteryScore: 175 },
  { manufacturer: 'Apple', model: 'iPhone 18 Pro', releaseDate: '2026-09', batteryScore: 172 },
  { manufacturer: 'vivo', model: 'X300 Pro', releaseDate: '2025-10', batteryScore: 171 },
  { manufacturer: 'OPPO', model: 'Find X9 Ultra', releaseDate: '2026-05', batteryScore: 170 },
  { manufacturer: 'vivo', model: 'X300 Ultra', releaseDate: '2026-04', batteryScore: 170 },
  { manufacturer: 'Google', model: 'Pixel 11 Pro XL', releaseDate: '2026-08', batteryScore: 168 },
  { manufacturer: 'OPPO', model: 'Find X8 Ultra', releaseDate: '2025-04', batteryScore: 168 },
  { manufacturer: 'Apple', model: 'iPhone 17 Pro', releaseDate: '2025-09', batteryScore: 168 },
  { manufacturer: 'vivo', model: 'X200 Ultra', releaseDate: '2025-04', batteryScore: 167 },
  { manufacturer: 'OPPO', model: 'Find X9 Pro', releaseDate: '2025-11', batteryScore: 166 },
  { manufacturer: 'Xiaomi', model: '17 Ultra', releaseDate: '2025-12', batteryScore: 166 },
  { manufacturer: 'Honor', model: 'Magic8 Pro', releaseDate: '2025-10', batteryScore: 164 },
  { manufacturer: 'Motorola', model: 'Razr Fold', releaseDate: '2026-03', batteryScore: 164 },
  { manufacturer: 'Motorola', model: 'Signature', releaseDate: '2026-01', batteryScore: 164 },
  { manufacturer: 'Google', model: 'Pixel 10 Pro XL', releaseDate: '2025-08', batteryScore: 163 },
  { manufacturer: 'Xiaomi', model: '17 Pro Max', releaseDate: '2025-09', batteryScore: 159 },
  { manufacturer: 'Xiaomi', model: '15 Ultra', releaseDate: '2025-03', batteryScore: 159 },
] as const;

const CHARGE_ROWS: readonly ChargeRow[] = [
  {
    manufacturer: 'Motorola',
    model: 'Edge 2025',
    batteryMah: 5200,
    wiredWatts: 68,
    wired30mPercent: 61,
    wired80Minutes: 40,
    wiredFullMinutes: 64,
    wireless30mPercent: 25,
    wireless80Minutes: 107,
    wirelessFullMinutes: 148,
    batteryScore: 152,
    sourceId: 'dxomark-motorola-edge-2025-battery',
  },
  {
    manufacturer: 'OPPO',
    model: 'Find X8',
    batteryMah: 5630,
    wiredWatts: 80,
    wired30mPercent: 72,
    wired80Minutes: 34,
    wiredFullMinutes: 55,
    wirelessWatts: 50,
    wireless30mPercent: 41,
    wireless80Minutes: 57,
    wirelessFullMinutes: 79,
    batteryScore: 156,
    sourceId: 'dxomark-oppo-find-x8-battery',
  },
  {
    manufacturer: 'Honor',
    model: 'X7d (400 Smart)',
    batteryMah: 6500,
    wiredWatts: 35,
    wired30mPercent: 34,
    wired80Minutes: 70,
    wiredFullMinutes: 96,
    batteryScore: 168,
    sourceId: 'dxomark-honor-x7d-battery',
  },
  {
    manufacturer: 'Motorola',
    model: 'Edge 70 Max',
    batteryMah: 7100,
    wiredWatts: 90,
    wired30mPercent: 54,
    wired80Minutes: 47,
    wiredFullMinutes: 70,
    wirelessWatts: 25,
    wireless30mPercent: 31,
    wireless80Minutes: 72,
    wirelessFullMinutes: 108,
    batteryScore: 160,
    sourceId: 'dxomark-motorola-edge70-max-battery',
  },
] as const;

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function deviceId(
  manufacturer: string,
  model: string,
) {
  return (
    'dxomark-battery-' +
    slug(
      manufacturer +
      '-' +
      model,
    )
  );
}

export function buildDxomarkCurrentBatteryCorpus(): DeviceCorpus {
  const sources: CorpusSource[] = [
    {
      id: SCORE_SOURCE_ID,
      publisher: 'DXOMARK',
      url:
        'https://cdn.dxomark.com/smartphones/',
      sourceRole:
        'measurement-lab',
      protocol:
        'DXOMARK smartphone Battery ranking. Score is a protocol-specific composite of autonomy, charging and efficiency and is not directly comparable to runtime hours.',
      accessedDate:
        '2026-10-12',
    },
    {
      id: 'dxomark-motorola-edge-2025-battery',
      publisher: 'DXOMARK',
      url:
        'https://www.dxomark.com/motorola-edge-2025-battery-test/',
      sourceRole:
        'measurement-lab',
      protocol:
        'DXOMARK Battery test: measured wired/wireless charging timing and 30-minute charge state.',
      accessedDate:
        '2026-10-12',
    },
    {
      id: 'dxomark-oppo-find-x8-battery',
      publisher: 'DXOMARK',
      url:
        'https://www.dxomark.com/oppo-find-x8-battery-test/',
      sourceRole:
        'measurement-lab',
      protocol:
        'DXOMARK Battery test: measured wired/wireless charging timing and 30-minute charge state.',
      accessedDate:
        '2026-10-12',
    },
    {
      id: 'dxomark-honor-x7d-battery',
      publisher: 'DXOMARK',
      url:
        'https://www.dxomark.com/honor-x7d-400-smart-battery-test/',
      sourceRole:
        'measurement-lab',
      protocol:
        'DXOMARK Battery test: measured wired charging timing and 30-minute charge state.',
      accessedDate:
        '2026-10-12',
    },
    {
      id: 'dxomark-motorola-edge70-max-battery',
      publisher: 'DXOMARK',
      url:
        'https://www.dxomark.com/motorola-edge-70-max-battery-test/',
      sourceRole:
        'measurement-lab',
      protocol:
        'DXOMARK Battery test: measured wired/wireless charging timing and 30-minute charge state.',
      accessedDate:
        '2026-10-12',
    },
  ];

  const deviceMap =
    new Map<
      string,
      DeviceCorpusRecord
    >();

  for (const row of SCORES) {
    const id =
      deviceId(
        row.manufacturer,
        row.model,
      );

    deviceMap.set(id, {
      variant: {
        id,
        identity: {
          manufacturer:
            row.manufacturer,
          family:
            row.model,
          modelName:
            row.model,
        },
        notes: [
          'DXOMARK Battery score is protocol-specific composite context, not a runtime metric.',
        ],
      },
      releaseDate:
        row.releaseDate,
      sourceIds: [
        SCORE_SOURCE_ID,
      ],
    });
  }

  for (const row of CHARGE_ROWS) {
    const id =
      deviceId(
        row.manufacturer,
        row.model,
      );

    const existing =
      deviceMap.get(id);

    const baseVariant =
      existing?.variant ?? {
        id,
        identity: {
          manufacturer:
            row.manufacturer,
          family:
            row.model,
          modelName:
            row.model,
        },
      };

    deviceMap.set(id, {
      ...(existing ?? {}),
      variant: {
        ...baseVariant,
        battery: {
          ...baseVariant.battery,
          capacityMah:
            row.batteryMah,
        },
      },
      charging: {
        ...existing?.charging,
        referenceWiredWatts:
          row.wiredWatts,
        ...(row.wirelessWatts !==
        undefined
          ? {
              advertisedWirelessWatts:
                row.wirelessWatts,
            }
          : {}),
      },
      sourceIds: [
        ...new Set([
          ...(existing?.sourceIds ??
            []),
          row.sourceId,
        ]),
      ],
    });
  }

  const measurements:
    CorpusMeasurement[] = [];

  for (const row of SCORES) {
    const id =
      deviceId(
        row.manufacturer,
        row.model,
      );

    measurements.push({
      id:
        id +
        '-battery-score',
      deviceVariantId:
        id,
      workload:
        'benchmark',
      metric:
        'dxomark_battery_score',
      value:
        row.batteryScore,
      unit:
        'points',
      sourceId:
        SCORE_SOURCE_ID,
      evidenceKind:
        'reported',
      componentScope:
        'whole-device',
      notes: [
        'DXOMARK Battery composite score. Kept namespaced and never converted into runtime hours.',
      ],
    });
  }

  for (const row of CHARGE_ROWS) {
    const id =
      deviceId(
        row.manufacturer,
        row.model,
      );

    const common = {
      deviceVariantId: id,
      workload:
        'charging' as const,
      sourceId:
        row.sourceId,
      evidenceKind:
        'measured' as const,
      componentScope:
        'whole-device' as const,
      testChargerWatts:
        row.wiredWatts,
    };

    measurements.push(
      {
        id:
          id +
          '-dxo-wired-30m',
        metric:
          'dxomark_wired_30m_percent',
        value:
          row.wired30mPercent,
        unit:
          'percent',
        ...common,
      },
      {
        id:
          id +
          '-dxo-wired-80',
        metric:
          'dxomark_wired_0_80_minutes',
        value:
          row.wired80Minutes,
        unit:
          'minutes',
        ...common,
      },
      {
        id:
          id +
          '-dxo-wired-full',
        metric:
          'dxomark_wired_full_charge_minutes',
        value:
          row.wiredFullMinutes,
        unit:
          'minutes',
        ...common,
      },
    );

    if (
      row.wirelessWatts !==
        undefined &&
      row.wireless30mPercent !==
        undefined &&
      row.wirelessFullMinutes !==
        undefined
    ) {
      measurements.push(
        {
          id:
            id +
            '-dxo-wireless-30m',
          deviceVariantId:
            id,
          workload:
            'charging',
          metric:
            'dxomark_wireless_30m_percent',
          value:
            row.wireless30mPercent,
          unit:
            'percent',
          sourceId:
            row.sourceId,
          evidenceKind:
            'measured',
          testChargerWatts:
            row.wirelessWatts,
          notes: [
            'DXOMARK wireless charging measurement.',
          ],
        },
        {
          id:
            id +
            '-dxo-wireless-full',
          deviceVariantId:
            id,
          workload:
            'charging',
          metric:
            'dxomark_wireless_full_charge_minutes',
          value:
            row.wirelessFullMinutes,
          unit:
            'minutes',
          sourceId:
            row.sourceId,
          evidenceKind:
            'measured',
          testChargerWatts:
            row.wirelessWatts,
          notes: [
            'DXOMARK wireless charging measurement.',
          ],
        },
      );
    }
  }

  return {
    version:
      DXOMARK_CURRENT_BATTERY_VERSION,
    sources,
    devices:
      [...deviceMap.values()],
    measurements,
  };
}
