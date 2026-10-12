import type {
  CorpusMeasurement,
  CorpusSource,
  DeviceCorpus,
  DeviceCorpusRecord,
} from './device-corpus';

type ChargingRow = {
  id: string;
  manufacturer: string;
  model: string;
  batteryMah: number;
  releaseDate: string;
  wiredWatts: number;
  fullChargeMinutes: number;
  charge30mPercent: number;
  wirelessWatts?: number;
  wirelessFullChargeMinutes?: number;
  wireless30mPercent?: number;
};

const SOURCE_ID =
  'phonearena-charging-2025-2026';

const ROWS: readonly ChargingRow[] = [
  { id: 'pa-charge-redmi-note17-pro-max', manufacturer: 'Xiaomi', model: 'Redmi Note 17 Pro Max 5G', batteryMah: 9210, releaseDate: '2026-08-28', wiredWatts: 100, fullChargeMinutes: 66, charge30mPercent: 52 },
  { id: 'pa-charge-magic8-lite', manufacturer: 'Honor', model: 'Magic8 Lite', batteryMah: 7500, releaseDate: '2025-12-08', wiredWatts: 66, fullChargeMinutes: 72, charge30mPercent: 50 },
  { id: 'pa-charge-oneplus15', manufacturer: 'OnePlus', model: '15', batteryMah: 7300, releaseDate: '2025-10-28', wiredWatts: 80, fullChargeMinutes: 45, charge30mPercent: 68, wirelessWatts: 50, wirelessFullChargeMinutes: 112, wireless30mPercent: 21 },
  { id: 'pa-charge-redmagic11-pro', manufacturer: 'nubia', model: 'RedMagic 11 Pro', batteryMah: 7500, releaseDate: '2025-10-17', wiredWatts: 80, fullChargeMinutes: 57, charge30mPercent: 70, wirelessWatts: 80, wirelessFullChargeMinutes: 68 },
  { id: 'pa-charge-iphone18-pro-max', manufacturer: 'Apple', model: 'iPhone 18 Pro Max', batteryMah: 5567, releaseDate: '2026-09-18', wiredWatts: 60, fullChargeMinutes: 68, charge30mPercent: 71, wirelessWatts: 25 },
  { id: 'pa-charge-mate80-pro', manufacturer: 'Huawei', model: 'Mate 80 Pro', batteryMah: 5750, releaseDate: '2026-02-26', wiredWatts: 100, fullChargeMinutes: 61, charge30mPercent: 67, wirelessWatts: 80 },
  { id: 'pa-charge-poco-x8-pro-max', manufacturer: 'POCO', model: 'X8 Pro Max', batteryMah: 8500, releaseDate: '2026-03-17', wiredWatts: 100, fullChargeMinutes: 65, charge30mPercent: 62 },
  { id: 'pa-charge-edge70-pro', manufacturer: 'Motorola', model: 'Edge 70 Pro', batteryMah: 6500, releaseDate: '2026-04-29', wiredWatts: 80, fullChargeMinutes: 38, charge30mPercent: 80 },
  { id: 'pa-charge-z80-ultra', manufacturer: 'nubia', model: 'Z80 Ultra', batteryMah: 7200, releaseDate: '2025-11-06', wiredWatts: 90, fullChargeMinutes: 68, charge30mPercent: 66, wirelessWatts: 80 },
  { id: 'pa-charge-redmagic11s-pro', manufacturer: 'nubia', model: 'RedMagic 11S Pro', batteryMah: 7500, releaseDate: '2026-06-10', wiredWatts: 80, fullChargeMinutes: 59, charge30mPercent: 61 },
  { id: 'pa-charge-xiaomi17', manufacturer: 'Xiaomi', model: '17', batteryMah: 6330, releaseDate: '2025-10-27', wiredWatts: 100, fullChargeMinutes: 65, charge30mPercent: 61, wirelessWatts: 50 },
  { id: 'pa-charge-redmi-note15-pro', manufacturer: 'Xiaomi', model: 'Redmi Note 15 Pro', batteryMah: 6500, releaseDate: '2026-01-06', wiredWatts: 45, fullChargeMinutes: 88, charge30mPercent: 37 },
  { id: 'pa-charge-redmi-note17-pro', manufacturer: 'Xiaomi', model: 'Redmi Note 17 Pro', batteryMah: 8340, releaseDate: '2026-08-27', wiredWatts: 67, fullChargeMinutes: 87, charge30mPercent: 33 },
  { id: 'pa-charge-edge60-fusion', manufacturer: 'Motorola', model: 'Edge 60 Fusion', batteryMah: 5200, releaseDate: '2025-04-15', wiredWatts: 68, fullChargeMinutes: 41, charge30mPercent: 82 },
  { id: 'pa-charge-honor600', manufacturer: 'Honor', model: '600', batteryMah: 7000, releaseDate: '2026-04-29', wiredWatts: 80, fullChargeMinutes: 53, charge30mPercent: 56 },
  { id: 'pa-charge-galaxy-zflip8', manufacturer: 'Samsung', model: 'Galaxy Z Flip 8', batteryMah: 4300, releaseDate: '2026-08-07', wiredWatts: 25, fullChargeMinutes: 81, charge30mPercent: 54, wirelessWatts: 15 },
  { id: 'pa-charge-s26-ultra', manufacturer: 'Samsung', model: 'Galaxy S26 Ultra', batteryMah: 5000, releaseDate: '2026-03-11', wiredWatts: 60, fullChargeMinutes: 49, charge30mPercent: 78, wirelessWatts: 15 },
  { id: 'pa-charge-s26-plus', manufacturer: 'Samsung', model: 'Galaxy S26+', batteryMah: 4900, releaseDate: '2026-03-11', wiredWatts: 45, fullChargeMinutes: 63, charge30mPercent: 67, wirelessWatts: 15 },
  { id: 'pa-charge-s26', manufacturer: 'Samsung', model: 'Galaxy S26', batteryMah: 4300, releaseDate: '2026-03-11', wiredWatts: 25, fullChargeMinutes: 76, charge30mPercent: 59, wirelessWatts: 15 },
  { id: 'pa-charge-s25-ultra', manufacturer: 'Samsung', model: 'Galaxy S25 Ultra', batteryMah: 5000, releaseDate: '2025-02-07', wiredWatts: 45, fullChargeMinutes: 69, charge30mPercent: 68, wirelessWatts: 15, wirelessFullChargeMinutes: 118, wireless30mPercent: 33 },
  { id: 'pa-charge-s25-plus', manufacturer: 'Samsung', model: 'Galaxy S25+', batteryMah: 4900, releaseDate: '2025-02-07', wiredWatts: 45, fullChargeMinutes: 71, charge30mPercent: 58, wirelessWatts: 15 },
  { id: 'pa-charge-s25', manufacturer: 'Samsung', model: 'Galaxy S25', batteryMah: 4000, releaseDate: '2025-02-07', wiredWatts: 25, fullChargeMinutes: 82, charge30mPercent: 54, wirelessWatts: 15, wirelessFullChargeMinutes: 97, wireless30mPercent: 32 },
  { id: 'pa-charge-xiaomi17-ultra', manufacturer: 'Xiaomi', model: '17 Ultra', batteryMah: 6800, releaseDate: '2025-12-27', wiredWatts: 90, fullChargeMinutes: 70, charge30mPercent: 77, wirelessWatts: 50 },
  { id: 'pa-charge-find-x9-pro', manufacturer: 'OPPO', model: 'Find X9 Pro', batteryMah: 7500, releaseDate: '2025-10-22', wiredWatts: 80, fullChargeMinutes: 80, charge30mPercent: 52, wirelessWatts: 50 },
  { id: 'pa-charge-vivo-x300-ultra', manufacturer: 'vivo', model: 'X300 Ultra', batteryMah: 6600, releaseDate: '2026-03-30', wiredWatts: 100, fullChargeMinutes: 51, charge30mPercent: 59, wirelessWatts: 40 },
  { id: 'pa-charge-xiaomi15-ultra', manufacturer: 'Xiaomi', model: '15 Ultra', batteryMah: 6000, releaseDate: '2025-02-27', wiredWatts: 90, fullChargeMinutes: 63, charge30mPercent: 58, wirelessWatts: 80 },
  { id: 'pa-charge-find-n5', manufacturer: 'OPPO', model: 'Find N5', batteryMah: 5600, releaseDate: '2025-02-24', wiredWatts: 80, fullChargeMinutes: 60, charge30mPercent: 59, wirelessWatts: 50 },
  { id: 'pa-charge-iphone17-pro-max', manufacturer: 'Apple', model: 'iPhone 17 Pro Max', batteryMah: 5088, releaseDate: '2025-09-19', wiredWatts: 40, fullChargeMinutes: 76, charge30mPercent: 64, wirelessWatts: 25, wirelessFullChargeMinutes: 128, wireless30mPercent: 31 },
  { id: 'pa-charge-iphone17-pro', manufacturer: 'Apple', model: 'iPhone 17 Pro', batteryMah: 4252, releaseDate: '2025-09-19', wiredWatts: 40, fullChargeMinutes: 76, charge30mPercent: 67, wirelessWatts: 25, wirelessFullChargeMinutes: 140, wireless30mPercent: 27 },
  { id: 'pa-charge-pixel10-pro-xl', manufacturer: 'Google', model: 'Pixel 10 Pro XL', batteryMah: 5200, releaseDate: '2025-08-28', wiredWatts: 45, fullChargeMinutes: 77, charge30mPercent: 63, wirelessWatts: 25 },
] as const;

export function buildPhoneArenaCurrentChargingCorpus(): DeviceCorpus {
  const sources: CorpusSource[] = [
    {
      id: SOURCE_ID,
      publisher: 'PhoneArena',
      sourceRole: 'measurement-lab',
      url: 'https://www.phonearena.com/phones/benchmarks/battery?f%5By%5D=2026%2C2025',
      protocol:
        'PhoneArena charging benchmark: charging starts from a powered-on phone at 1%; time is measured to 100%; factory charger or verified fully compatible maximum-speed charger; new devices in controlled lab conditions.',
      protocolVersion:
        'phonearena-current-charging-2025-2026',
      accessedDate:
        '2026-10-11',
    },
  ];

  const devices: DeviceCorpusRecord[] =
    ROWS.map((row) => ({
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
      },
      releaseDate:
        row.releaseDate,
      charging: {
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
      sourceIds: [SOURCE_ID],
    }));

  const measurements:
    CorpusMeasurement[] =
    ROWS.flatMap((row) => {
      const result:
        CorpusMeasurement[] = [
        {
          id:
            row.id +
            '-wired-full',
          deviceVariantId:
            row.id,
          workload: 'charging',
          metric:
            'wiredFullChargeMinutes',
          value:
            row.fullChargeMinutes,
          unit: 'minutes',
          sourceId: SOURCE_ID,
          evidenceKind: 'measured',
          testChargerWatts:
            row.wiredWatts,
          notes: [
            'PhoneArena measured wired full-charge time.',
          ],
        },
        {
          id:
            row.id +
            '-wired-30m',
          deviceVariantId:
            row.id,
          workload: 'charging',
          metric:
            'charge30mPercent',
          value:
            row.charge30mPercent,
          unit: 'percent',
          sourceId: SOURCE_ID,
          evidenceKind: 'measured',
          testChargerWatts:
            row.wiredWatts,
          notes: [
            'PhoneArena measured percentage reached after 30 minutes of wired charging.',
          ],
        },
      ];

      if (
        row.wirelessFullChargeMinutes !==
        undefined &&
        row.wirelessWatts !==
        undefined
      ) {
        result.push({
          id:
            row.id +
            '-wireless-full',
          deviceVariantId:
            row.id,
          workload: 'charging',
          metric:
            'wirelessFullChargeMinutes',
          value:
            row.wirelessFullChargeMinutes,
          unit: 'minutes',
          sourceId: SOURCE_ID,
          evidenceKind: 'measured',
          testChargerWatts:
            row.wirelessWatts,
          chargingStandard:
            'wireless',
        });
      }

      if (
        row.wireless30mPercent !==
        undefined &&
        row.wirelessWatts !==
        undefined
      ) {
        result.push({
          id:
            row.id +
            '-wireless-30m',
          deviceVariantId:
            row.id,
          workload: 'charging',
          metric:
            'wirelessThirtyMinutePercent',
          value:
            row.wireless30mPercent,
          unit: 'percent',
          sourceId: SOURCE_ID,
          evidenceKind: 'measured',
          testChargerWatts:
            row.wirelessWatts,
          chargingStandard:
            'wireless',
        });
      }

      return result;
    });

  return {
    version:
      'phonearena-current-charging-corpus-0.1.0',
    sources,
    devices,
    measurements,
  };
}
