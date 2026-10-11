import type {
  CorpusMeasurement,
  DeviceCorpus,
  DeviceCorpusRecord,
} from './device-corpus';

export const GSMARENA_BATTERY_V2_REFERENCE_VERSION =
  'gsmarena-battery-v2-reference-0.1.0';

type DetailedRow = {
  id: string;
  manufacturer: string;
  model: string;
  batteryMah?: number;
  active: [number, number];
  calls: [number, number];
  web: [number, number];
  video: [number, number];
  game: [number, number];
};

type ActiveOnlyRow = {
  id: string;
  manufacturer: string;
  model: string;
  batteryMah?: number;
  active: [number, number];
};

function hours(
  [h, m]: [number, number],
) {
  return h + m / 60;
}

const detailed:
  readonly DetailedRow[] = [
  {
    id: 'gsmarena-v2-oneplus15',
    manufacturer: 'OnePlus',
    model: '15',
    batteryMah: 7300,
    active: [23, 7],
    calls: [39, 12],
    web: [21, 48],
    video: [32, 57],
    game: [13, 5],
  },
  {
    id: 'gsmarena-v2-redmagic11-pro',
    manufacturer: 'nubia',
    model: 'RedMagic 11 Pro',
    batteryMah: 7500,
    active: [20, 2],
    calls: [37, 53],
    web: [17, 39],
    video: [27, 33],
    game: [11, 56],
  },
  {
    id: 'gsmarena-v2-poco-x8-pro-max',
    manufacturer: 'POCO',
    model: 'X8 Pro Max',
    batteryMah: 8500,
    active: [25, 22],
    calls: [44, 5],
    web: [21, 26],
    video: [34, 24],
    game: [16, 26],
  },
] as const;

const activeOnly:
  readonly ActiveOnlyRow[] = [
  {
    id: 'gsmarena-v2-galaxy-s26-ultra',
    manufacturer: 'Samsung',
    model: 'Galaxy S26 Ultra',
    batteryMah: 5000,
    active: [16, 23],
  },
  {
    id: 'gsmarena-v2-pixel11',
    manufacturer: 'Google',
    model: 'Pixel 11',
    batteryMah: 4985,
    active: [15, 40],
  },
  {
    id: 'gsmarena-v2-pixel10',
    manufacturer: 'Google',
    model: 'Pixel 10',
    batteryMah: 4970,
    active: [12, 8],
  },
] as const;

export function buildGsmaBatteryV2ReferenceCorpus(): DeviceCorpus {
  const sourceId =
    'gsmarena-battery-test-v2-current';

  const allRows = [
    ...detailed,
    ...activeOnly,
  ];

  const devices:
    DeviceCorpusRecord[] =
    allRows.map((row) => ({
      variant: {
        id: row.id,
        identity: {
          manufacturer:
            row.manufacturer,
          family: row.model,
          modelName: row.model,
        },
        ...(row.batteryMah
          ? {
              battery: {
                capacityMah:
                  row.batteryMah,
              },
            }
          : {}),
        notes: [
          'GSMArena Battery Life Test 2.0 reference.',
          'Do not mix with the discontinued legacy GSMArena Endurance Rating protocol.',
        ],
      },
      sourceIds: [sourceId],
    }));

  const measurements:
    CorpusMeasurement[] = [];

  for (const row of allRows) {
    measurements.push({
      id:
        row.id + '-active-use',
      deviceVariantId: row.id,
      workload: 'benchmark',
      metric:
        'gsmarena_v2_active_use_score_hours',
      value:
        hours(row.active),
      unit: 'hours',
      sourceId,
      evidenceKind: 'measured',
      componentScope:
        'whole-device',
      notes: [
        'GSMArena Battery Life Test 2.0 Active Use Score.',
      ],
    });
  }

  for (const row of detailed) {
    const shared = {
      deviceVariantId: row.id,
      unit: 'hours',
      sourceId,
      evidenceKind:
        'measured' as const,
      componentScope:
        'whole-device' as const,
      notes: [
        'GSMArena Battery Life Test 2.0 workload result.',
      ],
    };

    measurements.push(
      {
        id: row.id + '-calls',
        workload: 'benchmark',
        metric:
          'gsmarena_v2_call_hours',
        value: hours(row.calls),
        ...shared,
      },
      {
        id: row.id + '-web',
        workload: 'web_browsing',
        metric: 'browsingHours',
        value: hours(row.web),
        ...shared,
      },
      {
        id: row.id + '-video',
        workload:
          'video_playback',
        metric: 'videoHours',
        value: hours(row.video),
        ...shared,
      },
      {
        id: row.id + '-game',
        workload: 'gaming',
        metric: 'gamingHours',
        value: hours(row.game),
        ...shared,
      },
    );
  }

  return {
    version:
      GSMARENA_BATTERY_V2_REFERENCE_VERSION,
    sources: [
      {
        id: sourceId,
        publisher: 'GSMArena',
        url:
          'https://www.gsmarena.com/battery-test-v2.php3',
        protocol:
          'GSMArena Battery Life Test 2.0: 4G VoLTE calls, modern interactive web browsing, YouTube streaming and looped 3D gaming; Active Use Score',
        protocolVersion: '2.0',
        accessedDate:
          '2026-10-11',
      },
    ],
    devices,
    measurements,
  };
}
