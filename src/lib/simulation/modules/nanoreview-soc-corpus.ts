import type {
  CorpusMeasurement,
  CorpusSource,
  DeviceCorpus,
  DeviceCorpusRecord,
} from './device-corpus';
import type {
  SocVendor,
} from './device-variant';

export const NANOREVIEW_SOC_REFERENCE_VERSION =
  'nanoreview-soc-reference-0.1.0';

type Row = {
  vendor: SocVendor;
  soc: string;
  antutu11: number;
  gb6Single: number;
  gb6Multi: number;
};

const SOURCE_ID =
  'nanoreview-soc-ranking-2026-10';

const ROWS: readonly Row[] = [
  { vendor: 'other', soc: 'Xring O3', antutu11: 5228014, gb6Single: 3715, gb6Multi: 14213 },
  { vendor: 'Qualcomm', soc: 'Snapdragon 8 Elite Gen 6', antutu11: 4945385, gb6Single: 4301, gb6Multi: 12490 },
  { vendor: 'MediaTek', soc: 'Dimensity 9600M', antutu11: 4011932, gb6Single: 3302, gb6Multi: 10240 },
  { vendor: 'MediaTek', soc: 'Dimensity 9600 Pro', antutu11: 4838033, gb6Single: 4188, gb6Multi: 13145 },
  { vendor: 'Apple', soc: 'A20 Pro', antutu11: 3434654, gb6Single: 4772, gb6Multi: 12989 },
  { vendor: 'Qualcomm', soc: 'Snapdragon 8 Elite Extreme Gen 6', antutu11: 5195978, gb6Single: 4327, gb6Multi: 12873 },
  { vendor: 'Qualcomm', soc: 'Snapdragon 8 Elite Gen 5', antutu11: 3950082, gb6Single: 3639, gb6Multi: 11047 },
  { vendor: 'MediaTek', soc: 'Dimensity 9500', antutu11: 3760662, gb6Single: 3352, gb6Multi: 10402 },
  { vendor: 'MediaTek', soc: 'Dimensity 9500M', antutu11: 3579952, gb6Single: 3633, gb6Multi: 11035 },
  { vendor: 'Apple', soc: 'A19 Pro', antutu11: 2538751, gb6Single: 3970, gb6Multi: 10558 },
  { vendor: 'Samsung', soc: 'Exynos 2600', antutu11: 3161126, gb6Single: 3235, gb6Multi: 10904 },
  { vendor: 'Qualcomm', soc: 'Snapdragon 8 Elite Gen 5 V Series', antutu11: 3531378, gb6Single: 3474, gb6Multi: 10594 },
  { vendor: 'Apple', soc: 'A19', antutu11: 2156126, gb6Single: 3692, gb6Multi: 9454 },
  { vendor: 'Qualcomm', soc: 'Snapdragon 8 Elite', antutu11: 3126402, gb6Single: 3013, gb6Multi: 9287 },
  { vendor: 'MediaTek', soc: 'Dimensity 9500s', antutu11: 3032039, gb6Single: 2725, gb6Multi: 8932 },
  { vendor: 'MediaTek', soc: 'Dimensity 9400 Plus', antutu11: 2874956, gb6Single: 2729, gb6Multi: 8430 },
  { vendor: 'MediaTek', soc: 'Dimensity 9400', antutu11: 2825187, gb6Single: 2797, gb6Multi: 8767 },
  { vendor: 'Qualcomm', soc: 'Snapdragon 8 Gen 5', antutu11: 3057215, gb6Single: 2833, gb6Multi: 9119 },
  { vendor: 'other', soc: 'Xring O1', antutu11: 2963052, gb6Single: 2746, gb6Multi: 8431 },
  { vendor: 'Apple', soc: 'A18', antutu11: 1972476, gb6Single: 3431, gb6Multi: 8638 },
  { vendor: 'Apple', soc: 'A18 Pro', antutu11: 1782199, gb6Single: 3570, gb6Multi: 8923 },
  { vendor: 'MediaTek', soc: 'Dimensity 9400e', antutu11: 2518801, gb6Single: 2233, gb6Multi: 7478 },
  { vendor: 'MediaTek', soc: 'Dimensity 9300 Plus', antutu11: 2348248, gb6Single: 2249, gb6Multi: 7352 },
  { vendor: 'Samsung', soc: 'Exynos 2500', antutu11: 2289696, gb6Single: 2285, gb6Multi: 7874 },
] as const;

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function buildNanoReviewSocCorpus(): DeviceCorpus {
  const source: CorpusSource = {
    id: SOURCE_ID,
    publisher: 'NanoReview',
    url:
      'https://nanoreview.net/en/soc-list/rating',
    sourceRole:
      'aggregated-benchmark',
    protocol:
      'NanoReview current smartphone processor ranking; aggregate benchmark context including AnTuTu 11 and Geekbench 6 values. Kept separate from controlled lab protocols.',
    accessedDate:
      '2026-10-12',
  };

  const devices:
    DeviceCorpusRecord[] =
    ROWS.map((row) => {
      const id =
        'nanoreview-soc-' +
        slug(row.soc);

      return {
        variant: {
          id,
          identity: {
            manufacturer:
              'NanoReview SoC Reference',
            family: row.soc,
            modelName: row.soc,
          },
          soc: {
            vendor:
              row.vendor,
            name: row.soc,
          },
          notes: [
            'Aggregated SoC benchmark context only.',
            'Do not treat as a controlled retail-phone lab measurement.',
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
        'nanoreview-soc-' +
        slug(row.soc);

      const common = {
        deviceVariantId: id,
        workload:
          'benchmark' as const,
        unit: 'points',
        sourceId: SOURCE_ID,
        evidenceKind:
          'reported' as const,
        notes: [
          'NanoReview aggregated benchmark context. Metric name is source-namespaced to prevent protocol mixing.',
        ],
      };

      return [
        {
          id:
            id + '-antutu11',
          metric:
            'nanoreview_antutu_11_total',
          value:
            row.antutu11,
          ...common,
        },
        {
          id:
            id + '-gb6-single',
          metric:
            'nanoreview_geekbench_6_single_core',
          value:
            row.gb6Single,
          ...common,
        },
        {
          id:
            id + '-gb6-multi',
          metric:
            'nanoreview_geekbench_6_multi_core',
          value:
            row.gb6Multi,
          ...common,
        },
      ];
    });

  return {
    version:
      NANOREVIEW_SOC_REFERENCE_VERSION,
    sources: [source],
    devices,
    measurements,
  };
}
