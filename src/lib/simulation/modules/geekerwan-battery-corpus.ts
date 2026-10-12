import type {
  CorpusMeasurement,
  CorpusSource,
  DeviceCorpus,
  DeviceCorpusRecord,
} from './device-corpus';

export const GEEKERWAN_BATTERY_5_VERSION =
  'geekerwan-battery-5-2026-10-0.1.0';

type Row = {
  rank: number;
  manufacturer: string;
  model: string;
  software: string;
  energyWh?: number;
  hours: number;
  minutes: number;
};

const SOURCE_ID =
  'geekerwan-battery-results-2026';

/**
 * Geekerwan/SOCPK Battery Life 5.0 public ranking.
 *
 * The original July 2026 video announced 78 retail-phone results.
 * The live SOCPK chart has since grown to 80 entries. We snapshot the
 * current chart rather than freezing the original video count.
 *
 * Battery energy is copied only where the public chart publishes a Wh value.
 * Missing Wh values stay unknown.
 */
const ROWS: readonly Row[] = [
  { rank: 1, manufacturer: 'Honor', model: 'WIN RT', software: 'MagicOS 10.0.0.160', energyWh: 36.88, hours: 12, minutes: 6 },
  { rank: 2, manufacturer: 'Honor', model: 'WIN', software: 'MagicOS 10.0.0.160', energyWh: 36.88, hours: 11, minutes: 53 },
  { rank: 3, manufacturer: 'Xiaomi', model: 'Redmi K90 Ultra', software: 'HyperOS 3.0.306.0', energyWh: 31.85, hours: 11, minutes: 47 },
  { rank: 4, manufacturer: 'Xiaomi', model: 'Redmi Turbo 5 Max', software: 'HyperOS 3.0.304.0', energyWh: 33.53, hours: 11, minutes: 26 },
  { rank: 5, manufacturer: 'Xiaomi', model: 'Redmi K90 Max', software: 'HyperOS 3.0.310.0', energyWh: 31.85, hours: 11, minutes: 24 },
  { rank: 6, manufacturer: 'nubia', model: 'RedMagic 11 Pro', software: 'RedMagicOS 11.0.23MR1', energyWh: 29.66, hours: 11, minutes: 21 },
  { rank: 7, manufacturer: 'iQOO', model: 'Z11 Turbo', software: 'OriginOS 6 16.0.11.3', energyWh: 27.83, hours: 10, minutes: 58 },
  { rank: 8, manufacturer: 'Xiaomi', model: '17 Max', software: 'HyperOS 3.0.307.0', energyWh: 29.84, hours: 10, minutes: 58 },
  { rank: 9, manufacturer: 'iQOO', model: 'Z10 Turbo+', software: 'OriginOS 6 16.1.14.1', energyWh: 29.72, hours: 10, minutes: 57 },
  { rank: 10, manufacturer: 'OnePlus', model: 'Ace 6T', software: 'ColorOS 16.0.5.702', energyWh: 30.88, hours: 10, minutes: 40 },
  { rank: 11, manufacturer: 'Apple', model: 'iPhone 18 Pro Max', software: 'iOS 27.0', hours: 10, minutes: 37 },
  { rank: 12, manufacturer: 'OnePlus', model: '15T', software: 'ColorOS 16.0.8.300', energyWh: 27.05, hours: 10, minutes: 24 },
  { rank: 13, manufacturer: 'OnePlus', model: 'Ace 6 Ultra', software: 'ColorOS 16.0.8.300', energyWh: 31.6, hours: 10, minutes: 9 },
  { rank: 14, manufacturer: 'iQOO', model: 'Neo 11', software: 'OriginOS 6 16.0.24.6', energyWh: 27.59, hours: 10, minutes: 8 },
  { rank: 15, manufacturer: 'Honor', model: 'Magic8 Pro', software: 'MagicOS 10.0.0.160', energyWh: 26.54, hours: 10, minutes: 3 },
  { rank: 16, manufacturer: 'OPPO', model: 'Find X9 Pro', software: 'ColorOS 16.0.5.703', energyWh: 27.34, hours: 10, minutes: 0 },
  { rank: 17, manufacturer: 'Huawei', model: 'Nova 16', software: 'HarmonyOS 6.1.0.130', energyWh: 25.98, hours: 10, minutes: 0 },
  { rank: 18, manufacturer: 'Huawei', model: 'Nova 16 Pro', software: 'HarmonyOS 6.1.0.130', energyWh: 25.98, hours: 9, minutes: 56 },
  { rank: 19, manufacturer: 'iQOO', model: '15 Ultra', software: 'OriginOS 6 16.0.14.9', energyWh: 27.08, hours: 9, minutes: 53 },
  { rank: 20, manufacturer: 'iQOO', model: '15T', software: 'OriginOS 6 16.0.11.2', energyWh: 29.35, hours: 9, minutes: 51 },
  { rank: 21, manufacturer: 'Xiaomi', model: 'Redmi K90 Pro Max', software: 'HyperOS 3.0.306.0', energyWh: 28.13, hours: 9, minutes: 41 },
  { rank: 22, manufacturer: 'OnePlus', model: 'Ace 6', software: 'ColorOS 16.0.5.702', energyWh: 28.66, hours: 9, minutes: 40 },
  { rank: 23, manufacturer: 'nubia', model: 'Z80 Ultra', software: 'NebulaAIOS 2.0.26', energyWh: 26.67, hours: 9, minutes: 38 },
  { rank: 24, manufacturer: 'Huawei', model: 'Pura 90 Pro', software: 'HarmonyOS 6.1.0.125', energyWh: 22.35, hours: 9, minutes: 36 },
  { rank: 25, manufacturer: 'Xiaomi', model: 'Redmi K80 Ultra', software: 'HyperOS 3.0.302.0', energyWh: 27.78, hours: 9, minutes: 33 },
  { rank: 26, manufacturer: 'Honor', model: 'GT Pro', software: 'MagicOS 10.0.0.150', energyWh: 27.51, hours: 9, minutes: 30 },
  { rank: 27, manufacturer: 'Huawei', model: 'Nova 15 Pro', software: 'HarmonyOS 6.1.0.125', energyWh: 24.21, hours: 9, minutes: 28 },
  { rank: 28, manufacturer: 'Xiaomi', model: '17T Pro', software: 'HyperOS 3.0.308.0', energyWh: 25.82, hours: 9, minutes: 18 },
  { rank: 29, manufacturer: 'iQOO', model: '15', software: 'OriginOS 6 16.0.26.22', energyWh: 25.62, hours: 9, minutes: 17 },
  { rank: 30, manufacturer: 'OPPO', model: 'Find X9s Pro', software: 'ColorOS 16.0.8.306', energyWh: 25.64, hours: 9, minutes: 13 },
  { rank: 31, manufacturer: 'iQOO', model: 'Neo 10 Pro+', software: 'OriginOS 6 16.1.18.6', energyWh: 25.26, hours: 9, minutes: 13 },
  { rank: 32, manufacturer: 'OnePlus', model: '15', software: 'ColorOS 16.0.5.702', energyWh: 27.03, hours: 9, minutes: 12 },
  { rank: 33, manufacturer: 'Honor', model: 'Magic8', software: 'MagicOS 10.0.0.155', energyWh: 25.78, hours: 9, minutes: 12 },
  { rank: 34, manufacturer: 'Huawei', model: 'Pura 90 Pro Max', software: 'HarmonyOS 6.1.0.125', energyWh: 22.35, hours: 9, minutes: 12 },
  { rank: 35, manufacturer: 'realme', model: 'GT8', software: 'ColorOS 16.0.5.793', energyWh: 26.78, hours: 9, minutes: 4 },
  { rank: 36, manufacturer: 'vivo', model: 'X300s', software: 'OriginOS 6 16.0.8.7', energyWh: 25.81, hours: 9, minutes: 2 },
  { rank: 37, manufacturer: 'Huawei', model: 'Pura 90', software: 'HarmonyOS 6.1.0.125', energyWh: 24.21, hours: 9, minutes: 2 },
  { rank: 38, manufacturer: 'Xiaomi', model: '17 Pro Max', software: 'HyperOS 3.0.306.0', energyWh: 27.64, hours: 8, minutes: 56 },
  { rank: 39, manufacturer: 'Apple', model: 'iPhone 17 Pro Max', software: 'iOS 26.5 RC', energyWh: 18.75, hours: 8, minutes: 54 },
  { rank: 40, manufacturer: 'Xiaomi', model: '17', software: 'HyperOS 3.0.306.0', energyWh: 25.94, hours: 8, minutes: 45 },
  { rank: 41, manufacturer: 'OPPO', model: 'Find X9', software: 'ColorOS 16.0.5.701', energyWh: 25.65, hours: 8, minutes: 44 },
  { rank: 42, manufacturer: 'Xiaomi', model: '17T', software: 'HyperOS 3.0.304.0', energyWh: 25.82, hours: 8, minutes: 41 },
  { rank: 43, manufacturer: 'Xiaomi', model: 'Redmi K90', software: 'HyperOS 3.0.304.0', energyWh: 26.52, hours: 8, minutes: 36 },
  { rank: 44, manufacturer: 'OPPO', model: 'Find X9 Ultra', software: 'ColorOS 16.0.7.210', energyWh: 25.64, hours: 8, minutes: 33 },
  { rank: 45, manufacturer: 'Huawei', model: 'Mate 80', software: 'HarmonyOS 6.1.0.125', energyWh: 21.36, hours: 8, minutes: 32 },
  { rank: 46, manufacturer: 'OnePlus', model: 'Ace 5 Ultra', software: 'ColorOS 16.0.8.300', energyWh: 25.28, hours: 8, minutes: 26 },
  { rank: 47, manufacturer: 'vivo', model: 'X300 Pro', software: 'OriginOS 6 16.0.28.30', energyWh: 24.55, hours: 8, minutes: 21 },
  { rank: 48, manufacturer: 'vivo', model: 'X300', software: 'OriginOS 6 16.0.28.30', energyWh: 22.34, hours: 8, minutes: 20 },
  { rank: 49, manufacturer: 'realme', model: 'GT8 Pro', software: 'ColorOS 16.0.5.704', energyWh: 25.9, hours: 8, minutes: 19 },
  { rank: 50, manufacturer: 'Huawei', model: 'Mate 70 Pro+', software: 'HarmonyOS 6.1.0.117', energyWh: 21.34, hours: 8, minutes: 16 },
  { rank: 51, manufacturer: 'Huawei', model: 'Mate 80 Pro', software: 'HarmonyOS 6.1.0.125', energyWh: 21.36, hours: 8, minutes: 14 },
  { rank: 52, manufacturer: 'Huawei', model: 'Mate 80 Pro Max', software: 'HarmonyOS 6.1.0.125', energyWh: 22.31, hours: 8, minutes: 14 },
  { rank: 53, manufacturer: 'vivo', model: 'X300 Ultra', software: 'OriginOS 6 16.0.21.11', energyWh: 23.92, hours: 8, minutes: 10 },
  { rank: 54, manufacturer: 'Xiaomi', model: '17 Ultra', software: 'HyperOS 3.0.303.0', energyWh: 25.11, hours: 7, minutes: 58 },
  { rank: 55, manufacturer: 'iQOO', model: '13', software: 'OriginOS 6 16.1.16.5', energyWh: 22.97, hours: 7, minutes: 55 },
  { rank: 56, manufacturer: 'OPPO', model: 'Find X8 Ultra', software: 'ColorOS 16.0.8.300', energyWh: 22.87, hours: 7, minutes: 52 },
  { rank: 57, manufacturer: 'Apple', model: 'iPhone 18 Pro', software: 'iOS 27.0', hours: 7, minutes: 50 },
  { rank: 58, manufacturer: 'Xiaomi', model: 'Redmi K80 Pro', software: 'HyperOS 3.0.303.0', energyWh: 22.62, hours: 7, minutes: 47 },
  { rank: 59, manufacturer: 'OnePlus', model: 'Ace 5 Pro', software: 'ColorOS 16.0.5.701', energyWh: 22.76, hours: 7, minutes: 45 },
  { rank: 60, manufacturer: 'Xiaomi', model: '17 Pro', software: 'HyperOS 3.0.306.0', energyWh: 23.13, hours: 7, minutes: 40 },
  { rank: 61, manufacturer: 'Honor', model: 'Magic7 Pro', software: 'MagicOS 10.0.0.150', energyWh: 21.97, hours: 7, minutes: 38 },
  { rank: 62, manufacturer: 'OnePlus', model: '13', software: 'ColorOS 16.0.5.703', energyWh: 22.31, hours: 7, minutes: 36 },
  { rank: 63, manufacturer: 'Xiaomi', model: '15s Pro', software: 'HyperOS 3.0.301.0', energyWh: 22.95, hours: 7, minutes: 34 },
  { rank: 64, manufacturer: 'Xiaomi', model: '15 Pro', software: 'HyperOS 3.0.302.0', energyWh: 22.95, hours: 7, minutes: 25 },
  { rank: 65, manufacturer: 'Apple', model: 'iPhone 17 Pro', software: 'iOS 26.5 RC', energyWh: 15.53, hours: 7, minutes: 19 },
  { rank: 66, manufacturer: 'Samsung', model: 'Galaxy S26 Ultra', software: 'OneUI 8.5', energyWh: 18.94, hours: 7, minutes: 15 },
  { rank: 67, manufacturer: 'vivo', model: 'X200 Ultra', software: 'OriginOS 6 16.1.17.2', energyWh: 22.35, hours: 7, minutes: 14 },
  { rank: 68, manufacturer: 'Apple', model: 'iPhone 16 Pro Max', software: 'iOS 26.5', energyWh: 18.17, hours: 7, minutes: 3 },
  { rank: 69, manufacturer: 'Xiaomi', model: '15', software: 'HyperOS 3.0.302.0', energyWh: 20.26, hours: 7, minutes: 2 },
  { rank: 70, manufacturer: 'Samsung', model: 'Galaxy S25 Ultra', software: 'OneUI 8.5', energyWh: 18.84, hours: 6, minutes: 46 },
  { rank: 71, manufacturer: 'Samsung', model: 'Galaxy S26', software: 'OneUI 8.5', energyWh: 16.29, hours: 6, minutes: 40 },
  { rank: 72, manufacturer: 'Apple', model: 'iPhone 15 Pro Max', software: 'iOS 26.5', energyWh: 17.11, hours: 6, minutes: 36 },
  { rank: 73, manufacturer: 'Apple', model: 'iPhone 17', software: 'iOS 26.5 RC', energyWh: 14.35, hours: 6, minutes: 25 },
  { rank: 74, manufacturer: 'Huawei', model: 'Mate 60 Pro', software: 'HarmonyOS 6.1.0.117', energyWh: 19.15, hours: 5, minutes: 56 },
  { rank: 75, manufacturer: 'Samsung', model: 'Galaxy S25 Edge', software: 'OneUI 8.5', energyWh: 14.77, hours: 5, minutes: 54 },
  { rank: 76, manufacturer: 'Google', model: 'Pixel 10 Pro XL', software: 'Android 16', energyWh: 19.76, hours: 5, minutes: 51 },
  { rank: 77, manufacturer: 'Apple', model: 'iPhone 16', software: 'iOS 26.5', energyWh: 13.84, hours: 5, minutes: 42 },
  { rank: 78, manufacturer: 'Apple', model: 'iPhone 16 Pro', software: 'iOS 26.5', energyWh: 13.94, hours: 5, minutes: 33 },
  { rank: 79, manufacturer: 'Apple', model: 'iPhone Air', software: 'iOS 26.5.2', energyWh: 12.26, hours: 5, minutes: 31 },
  { rank: 80, manufacturer: 'Apple', model: 'iPhone 15 Pro', software: 'iOS 26.5 RC', energyWh: 12.7, hours: 5, minutes: 0 },
] as const;

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function runtimeHours(row: Row) {
  return row.hours +
    row.minutes / 60;
}

export function buildGeekerwanBatteryCorpus(): DeviceCorpus {
  const source: CorpusSource = {
    id: SOURCE_ID,
    publisher: 'Geekerwan',
    url:
      'https://www.socpk.com/chart/battery-life-5-0',
    sourceRole:
      'measurement-lab',
    protocol:
      'Geekerwan 5G Battery Life 5.0: self-purchased retail phones, AI-agent-driven realistic app interaction on a controlled 5G SA network; public SOCPK ranking with full-run video links.',
    protocolVersion:
      'battery-life-5.0',
    accessedDate:
      '2026-10-12',
  };

  const devices:
    DeviceCorpusRecord[] =
    ROWS.map((row) => {
      const id =
        'geekerwan-battery-' +
        slug(
          row.manufacturer +
          '-' +
          row.model,
        );

      return {
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
          ...(row.energyWh !==
          undefined
            ? {
                battery: {
                  typicalEnergyWh:
                    row.energyWh,
                },
              }
            : {}),
          notes: [
            'Geekerwan Battery Life 5.0 retail-unit result.',
            'SOCPK rank: ' +
              row.rank,
            'Software: ' +
              row.software,
            ...(row.energyWh !==
            undefined
              ? [
                  'SOCPK published battery energy: ' +
                    row.energyWh +
                    ' Wh.',
                ]
              : [
                  'SOCPK chart does not publish battery Wh for this row; energy remains unknown.',
                ]),
          ],
        },
        sourceIds: [
          SOURCE_ID,
        ],
      };
    });

  const measurements:
    CorpusMeasurement[] =
    ROWS.flatMap((row) => {
      const id =
        'geekerwan-battery-' +
        slug(
          row.manufacturer +
          '-' +
          row.model,
        );

      const result:
        CorpusMeasurement[] = [
        {
          id:
            id +
            '-battery-life-5',
          deviceVariantId:
            id,
          workload:
            'benchmark',
          metric:
            'geekerwan_battery_life_5_0_hours',
          value:
            runtimeHours(row),
          unit: 'hours',
          sourceId: SOURCE_ID,
          evidenceKind:
            'measured',
          softwareBuild:
            row.software,
          componentScope:
            'whole-device',
          notes: [
            'Rank ' +
              row.rank +
              ' on the live SOCPK Battery Life 5.0 chart.',
          ],
        },
      ];

      if (
        row.energyWh !==
        undefined
      ) {
        result.push({
          id:
            id +
            '-published-energy-wh',
          deviceVariantId:
            id,
          workload:
            'benchmark',
          metric:
            'geekerwan_published_battery_energy_wh',
          value:
            row.energyWh,
          unit: 'Wh',
          sourceId:
            SOURCE_ID,
          evidenceKind:
            'reported',
          notes: [
            'Battery energy shown on the public SOCPK chart; not a PhoneFuturist-derived value.',
          ],
        });
      }

      return result;
    });

  return {
    version:
      GEEKERWAN_BATTERY_5_VERSION,
    sources: [source],
    devices,
    measurements,
  };
}

export function geekerwanBatteryRowCount() {
  return ROWS.length;
}
