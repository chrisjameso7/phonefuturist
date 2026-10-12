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
  { id: 'pa-charge-pixel10-pro-xl', manufacturer: 'Google', model: 'Pixel 10 Pro XL', batteryMah: 5200, releaseDate: '2025-08-28', wiredWatts: 45, fullChargeMinutes: 77, charge30mPercent: 63, wirelessWatts: 25 },,
  { id: 'pa-charge-redmi-note14-pro-plus', manufacturer: 'Xiaomi', model: 'Redmi Note 14 Pro+ 5G', batteryMah: 5110, releaseDate: '2025-01-16', wiredWatts: 120, fullChargeMinutes: 25, charge30mPercent: 100 },
  { id: 'pa-charge-vivo-x300-pro', manufacturer: 'vivo', model: 'X300 Pro', batteryMah: 6510, releaseDate: '2025-10-17', wiredWatts: 90, fullChargeMinutes: 31, charge30mPercent: 98, wirelessWatts: 40 },
  { id: 'pa-charge-magic7-pro', manufacturer: 'Honor', model: 'Magic7 Pro', batteryMah: 5270, releaseDate: '2025-01-15', wiredWatts: 100, fullChargeMinutes: 31, charge30mPercent: 98, wirelessWatts: 80, wirelessFullChargeMinutes: 47, wireless30mPercent: 64 },
  { id: 'pa-charge-poco-f7-ultra', manufacturer: 'POCO', model: 'F7 Ultra', batteryMah: 5300, releaseDate: '2025-03-27', wiredWatts: 120, fullChargeMinutes: 32, charge30mPercent: 99, wirelessWatts: 50, wirelessFullChargeMinutes: 75, wireless30mPercent: 43 },
  { id: 'pa-charge-find-x8-ultra', manufacturer: 'OPPO', model: 'Find X8 Ultra', batteryMah: 6100, releaseDate: '2025-04-16', wiredWatts: 100, fullChargeMinutes: 32, charge30mPercent: 98, wirelessWatts: 50 },
  { id: 'pa-charge-poco-f7-pro', manufacturer: 'POCO', model: 'F7 Pro', batteryMah: 6000, releaseDate: '2025-03-27', wiredWatts: 90, fullChargeMinutes: 36, charge30mPercent: 88 },
  { id: 'pa-charge-redmagic10s-pro', manufacturer: 'nubia', model: 'RedMagic 10S Pro', batteryMah: 7050, releaseDate: '2025-06-04', wiredWatts: 80, fullChargeMinutes: 38, charge30mPercent: 88 },
  { id: 'pa-charge-poco-f8-ultra', manufacturer: 'POCO', model: 'F8 Ultra', batteryMah: 6500, releaseDate: '2025-11-26', wiredWatts: 100, fullChargeMinutes: 39, charge30mPercent: 78, wirelessWatts: 50 },
  { id: 'pa-charge-pura80-ultra', manufacturer: 'Huawei', model: 'Pura 80 Ultra', batteryMah: 5170, releaseDate: '2025-07-10', wiredWatts: 100, fullChargeMinutes: 39, charge30mPercent: 88, wirelessWatts: 80, wirelessFullChargeMinutes: 55 },
  { id: 'pa-charge-xiaomi15t-pro', manufacturer: 'Xiaomi', model: '15T Pro', batteryMah: 5500, releaseDate: '2025-09-24', wiredWatts: 90, fullChargeMinutes: 40, charge30mPercent: 75, wirelessWatts: 50 },
  { id: 'pa-charge-moto-g-stylus-2025', manufacturer: 'Motorola', model: 'Moto G Stylus 5G (2025)', batteryMah: 5000, releaseDate: '2025-04-17', wiredWatts: 68, fullChargeMinutes: 40, charge30mPercent: 90, wirelessWatts: 15 },
  { id: 'pa-charge-edge70', manufacturer: 'Motorola', model: 'Edge 70', batteryMah: 4800, releaseDate: '2025-10-29', wiredWatts: 68, fullChargeMinutes: 41, charge30mPercent: 84, wirelessWatts: 15 },
  { id: 'pa-charge-edge60-fusion', manufacturer: 'Motorola', model: 'Edge 60 Fusion', batteryMah: 5200, releaseDate: '2025-04-15', wiredWatts: 68, fullChargeMinutes: 41, charge30mPercent: 82 },
  { id: 'pa-charge-poco-f7', manufacturer: 'POCO', model: 'F7', batteryMah: 6500, releaseDate: '2025-06-24', wiredWatts: 90, fullChargeMinutes: 42, charge30mPercent: 75 },
  { id: 'pa-charge-mate-x7', manufacturer: 'Huawei', model: 'Mate X7', batteryMah: 5600, releaseDate: '2025-11-26', wiredWatts: 66, fullChargeMinutes: 43, charge30mPercent: 79, wirelessWatts: 50, wirelessFullChargeMinutes: 73, wireless30mPercent: 49 },
  { id: 'pa-charge-razr-ultra-2025', manufacturer: 'Motorola', model: 'Razr Ultra (2025)', batteryMah: 4700, releaseDate: '2025-04-25', wiredWatts: 68, fullChargeMinutes: 43, charge30mPercent: 80, wirelessWatts: 30 },
  { id: 'pa-charge-oneplus13', manufacturer: 'OnePlus', model: '13', batteryMah: 6000, releaseDate: '2025-01-07', wiredWatts: 100, fullChargeMinutes: 43, charge30mPercent: 86, wirelessWatts: 50, wirelessFullChargeMinutes: 89, wireless30mPercent: 41 },
  { id: 'pa-charge-honor400', manufacturer: 'Honor', model: '400', batteryMah: 5300, releaseDate: '2025-05-23', wiredWatts: 66, fullChargeMinutes: 45, charge30mPercent: 75 },
  { id: 'pa-charge-zenfone12-ultra', manufacturer: 'Asus', model: 'Zenfone 12 Ultra', batteryMah: 5500, releaseDate: '2025-02-28', wiredWatts: 65, fullChargeMinutes: 45, charge30mPercent: 74, wirelessWatts: 15 },
  { id: 'pa-charge-moto-g-stylus-2026', manufacturer: 'Motorola', model: 'Moto G Stylus 5G (2026)', batteryMah: 5200, releaseDate: '2026-04-16', wiredWatts: 68, fullChargeMinutes: 46, charge30mPercent: 80, wirelessWatts: 15 },
  { id: 'pa-charge-motorola-signature', manufacturer: 'Motorola', model: 'Signature', batteryMah: 5200, releaseDate: '2026-01-07', wiredWatts: 90, fullChargeMinutes: 47, charge30mPercent: 78, wirelessWatts: 50 },
  { id: 'pa-charge-magic-v5', manufacturer: 'Honor', model: 'Magic V5', batteryMah: 5820, releaseDate: '2025-07-02', wiredWatts: 66, fullChargeMinutes: 47, charge30mPercent: 80, wirelessWatts: 50 },
  { id: 'pa-charge-edge60', manufacturer: 'Motorola', model: 'Edge 60', batteryMah: 5200, releaseDate: '2025-04-30', wiredWatts: 68, fullChargeMinutes: 47, charge30mPercent: 75 },
  { id: 'pa-charge-vivo-x200-ultra', manufacturer: 'vivo', model: 'X200 Ultra', batteryMah: 6000, releaseDate: '2025-04-29', wiredWatts: 90, fullChargeMinutes: 47, charge30mPercent: 64, wirelessWatts: 30 },
  { id: 'pa-charge-redmagic-astra2', manufacturer: 'nubia', model: 'RedMagic Astra 2', batteryMah: 8300, releaseDate: '2026-07-17', wiredWatts: 75, fullChargeMinutes: 50, charge30mPercent: 60 },
  { id: 'pa-charge-xiaomi15t', manufacturer: 'Xiaomi', model: '15T', batteryMah: 5500, releaseDate: '2025-09-24', wiredWatts: 67, fullChargeMinutes: 50, charge30mPercent: 67 },
  { id: 'pa-charge-magic-v6', manufacturer: 'Honor', model: 'Magic V6', batteryMah: 6660, releaseDate: '2026-03-13', wiredWatts: 80, fullChargeMinutes: 52, charge30mPercent: 75, wirelessWatts: 66, wirelessFullChargeMinutes: 73, wireless30mPercent: 53 }
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
