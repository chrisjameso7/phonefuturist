export const GEEKERWAN_SOC_REFERENCE_VERSION =
  'geekerwan-soc-reference-0.1.0';

export interface GeekerwanSocBenchmarkReference {
  socVendor:
    | 'Apple'
    | 'Qualcomm'
    | 'Samsung'
    | 'MediaTek'
    | 'Google'
    | 'Huawei'
    | 'Xiaomi'
    | 'other';
  socName: string;
  metric:
    | 'geekerwan_geekbench_6_multi_core';
  value: number;
  unit: 'points';
  sourceId:
    | 'geekerwan-geekbench6-ranking';
  evidenceKind: 'measured';
  notes?: string[];
}

export interface GeekerwanEfficiencyReference {
  socVendor:
    | 'Apple'
    | 'Qualcomm'
    | 'Samsung'
    | 'MediaTek'
    | 'Google'
    | 'Huawei'
    | 'Xiaomi'
    | 'other';
  socName: string;
  representativeDevice: string;
  memory?: string;
  process?: string;
  workload:
    | 'geekbench6-cpu-efficiency'
    | '3dmark-snl-gpu-efficiency';
  sourceId:
    | 'geekerwan-cpu-efficiency-gb6'
    | 'geekerwan-gpu-efficiency-snl';
  note:
    'protocol-metadata-only';
}

export const GEEKERWAN_SOURCES = [
  {
    id: 'geekerwan-geekbench6-ranking',
    publisher: 'Geekerwan',
    sourceRole: 'measurement-lab' as const,
    url: 'https://www.geekerwan.com/geekbench6/',
    protocol:
      'Geekerwan Geekbench 6 SoC ranking, multi-core table',
    accessedDate: '2026-10-11',
  },
  {
    id: 'geekerwan-cpu-efficiency-gb6',
    publisher: 'Geekerwan',
    sourceRole: 'measurement-lab' as const,
    url: 'https://geekerwan.com/cpucurve/gb6/',
    protocol:
      'CPU efficiency curve: Geekbench 6 multi-frequency measurements using Power Monitor + dummy battery, subtracting live display power to estimate mainboard power',
    accessedDate: '2026-10-11',
  },
  {
    id: 'geekerwan-gpu-efficiency-snl',
    publisher: 'Geekerwan',
    sourceRole: 'measurement-lab' as const,
    url: 'https://geekerwan.com/gpucurve/',
    protocol:
      'GPU efficiency curve: 3DMark SNL measurements using Power Monitor + dummy battery, subtracting live display power to estimate mainboard power',
    accessedDate: '2026-10-11',
  },
] as const;

export const GEEKERWAN_GB6_MULTI_REFERENCES:
  readonly GeekerwanSocBenchmarkReference[] = [
  { socVendor: 'Qualcomm', socName: 'Snapdragon 8 Elite Gen 5', metric: 'geekerwan_geekbench_6_multi_core', value: 12352, unit: 'points', sourceId: 'geekerwan-geekbench6-ranking', evidenceKind: 'measured' },
  { socVendor: 'Apple', socName: 'A19 Pro', metric: 'geekerwan_geekbench_6_multi_core', value: 11094, unit: 'points', sourceId: 'geekerwan-geekbench6-ranking', evidenceKind: 'measured' },
  { socVendor: 'MediaTek', socName: 'Dimensity 9500', metric: 'geekerwan_geekbench_6_multi_core', value: 10716, unit: 'points', sourceId: 'geekerwan-geekbench6-ranking', evidenceKind: 'measured' },
  { socVendor: 'Apple', socName: 'A19', metric: 'geekerwan_geekbench_6_multi_core', value: 10307, unit: 'points', sourceId: 'geekerwan-geekbench6-ranking', evidenceKind: 'measured' },
  { socVendor: 'Qualcomm', socName: 'Snapdragon 8 Elite', metric: 'geekerwan_geekbench_6_multi_core', value: 10244, unit: 'points', sourceId: 'geekerwan-geekbench6-ranking', evidenceKind: 'measured' },
  { socVendor: 'Qualcomm', socName: 'Snapdragon 8 Gen 5', metric: 'geekerwan_geekbench_6_multi_core', value: 10037, unit: 'points', sourceId: 'geekerwan-geekbench6-ranking', evidenceKind: 'measured' },
  { socVendor: 'Xiaomi', socName: 'Xring O1', metric: 'geekerwan_geekbench_6_multi_core', value: 9671, unit: 'points', sourceId: 'geekerwan-geekbench6-ranking', evidenceKind: 'measured' },
  { socVendor: 'Apple', socName: 'A18 Pro', metric: 'geekerwan_geekbench_6_multi_core', value: 9376, unit: 'points', sourceId: 'geekerwan-geekbench6-ranking', evidenceKind: 'measured' },
  { socVendor: 'MediaTek', socName: 'Dimensity 9400', metric: 'geekerwan_geekbench_6_multi_core', value: 9317, unit: 'points', sourceId: 'geekerwan-geekbench6-ranking', evidenceKind: 'measured' },
  { socVendor: 'Apple', socName: 'A18', metric: 'geekerwan_geekbench_6_multi_core', value: 9018, unit: 'points', sourceId: 'geekerwan-geekbench6-ranking', evidenceKind: 'measured' },
  { socVendor: 'Apple', socName: 'A17 Pro', metric: 'geekerwan_geekbench_6_multi_core', value: 7903, unit: 'points', sourceId: 'geekerwan-geekbench6-ranking', evidenceKind: 'measured' },
  { socVendor: 'MediaTek', socName: 'Dimensity 9300', metric: 'geekerwan_geekbench_6_multi_core', value: 7857, unit: 'points', sourceId: 'geekerwan-geekbench6-ranking', evidenceKind: 'measured' },
  { socVendor: 'Qualcomm', socName: 'Snapdragon 8 Gen 3', metric: 'geekerwan_geekbench_6_multi_core', value: 7466, unit: 'points', sourceId: 'geekerwan-geekbench6-ranking', evidenceKind: 'measured' },
  { socVendor: 'Apple', socName: 'A16', metric: 'geekerwan_geekbench_6_multi_core', value: 7271, unit: 'points', sourceId: 'geekerwan-geekbench6-ranking', evidenceKind: 'measured' },
  { socVendor: 'Samsung', socName: 'Exynos 2400', metric: 'geekerwan_geekbench_6_multi_core', value: 7170, unit: 'points', sourceId: 'geekerwan-geekbench6-ranking', evidenceKind: 'measured' },
  { socVendor: 'MediaTek', socName: 'Dimensity 8400-MAX', metric: 'geekerwan_geekbench_6_multi_core', value: 6906, unit: 'points', sourceId: 'geekerwan-geekbench6-ranking', evidenceKind: 'measured' },
  { socVendor: 'Qualcomm', socName: 'Snapdragon 8 Gen 2', metric: 'geekerwan_geekbench_6_multi_core', value: 5697, unit: 'points', sourceId: 'geekerwan-geekbench6-ranking', evidenceKind: 'measured' },
  { socVendor: 'Qualcomm', socName: 'Snapdragon 8s Gen 3', metric: 'geekerwan_geekbench_6_multi_core', value: 5408, unit: 'points', sourceId: 'geekerwan-geekbench6-ranking', evidenceKind: 'measured' },
  { socVendor: 'Qualcomm', socName: 'Snapdragon 7+ Gen 3', metric: 'geekerwan_geekbench_6_multi_core', value: 5330, unit: 'points', sourceId: 'geekerwan-geekbench6-ranking', evidenceKind: 'measured' },
  { socVendor: 'Huawei', socName: 'Kirin 9020', metric: 'geekerwan_geekbench_6_multi_core', value: 5314, unit: 'points', sourceId: 'geekerwan-geekbench6-ranking', evidenceKind: 'measured' },
  { socVendor: 'MediaTek', socName: 'Dimensity 9200', metric: 'geekerwan_geekbench_6_multi_core', value: 5119, unit: 'points', sourceId: 'geekerwan-geekbench6-ranking', evidenceKind: 'measured' },
  { socVendor: 'Apple', socName: 'A14', metric: 'geekerwan_geekbench_6_multi_core', value: 5100, unit: 'points', sourceId: 'geekerwan-geekbench6-ranking', evidenceKind: 'measured' },
  { socVendor: 'MediaTek', socName: 'Dimensity 8300 Ultra', metric: 'geekerwan_geekbench_6_multi_core', value: 5084, unit: 'points', sourceId: 'geekerwan-geekbench6-ranking', evidenceKind: 'measured' },
  { socVendor: 'MediaTek', socName: 'Dimensity 9200+', metric: 'geekerwan_geekbench_6_multi_core', value: 5079, unit: 'points', sourceId: 'geekerwan-geekbench6-ranking', evidenceKind: 'measured' },
  { socVendor: 'MediaTek', socName: 'Dimensity 9000+', metric: 'geekerwan_geekbench_6_multi_core', value: 4825, unit: 'points', sourceId: 'geekerwan-geekbench6-ranking', evidenceKind: 'measured' },
  { socVendor: 'Qualcomm', socName: 'Snapdragon 8+ Gen 1', metric: 'geekerwan_geekbench_6_multi_core', value: 4710, unit: 'points', sourceId: 'geekerwan-geekbench6-ranking', evidenceKind: 'measured' },
  { socVendor: 'Huawei', socName: 'Kirin 9010', metric: 'geekerwan_geekbench_6_multi_core', value: 4699, unit: 'points', sourceId: 'geekerwan-geekbench6-ranking', evidenceKind: 'measured' },
  { socVendor: 'Google', socName: 'Tensor G3', metric: 'geekerwan_geekbench_6_multi_core', value: 4668, unit: 'points', sourceId: 'geekerwan-geekbench6-ranking', evidenceKind: 'measured' },
  { socVendor: 'MediaTek', socName: 'Dimensity 9000', metric: 'geekerwan_geekbench_6_multi_core', value: 4657, unit: 'points', sourceId: 'geekerwan-geekbench6-ranking', evidenceKind: 'measured' },
  { socVendor: 'Google', socName: 'Tensor G4', metric: 'geekerwan_geekbench_6_multi_core', value: 4638, unit: 'points', sourceId: 'geekerwan-geekbench6-ranking', evidenceKind: 'measured' },
  { socVendor: 'Qualcomm', socName: 'Snapdragon 7+ Gen 2', metric: 'geekerwan_geekbench_6_multi_core', value: 4476, unit: 'points', sourceId: 'geekerwan-geekbench6-ranking', evidenceKind: 'measured' },
  { socVendor: 'Huawei', socName: 'Kirin 9000S', metric: 'geekerwan_geekbench_6_multi_core', value: 4121, unit: 'points', sourceId: 'geekerwan-geekbench6-ranking', evidenceKind: 'measured' },
  { socVendor: 'Apple', socName: 'A13', metric: 'geekerwan_geekbench_6_multi_core', value: 4090, unit: 'points', sourceId: 'geekerwan-geekbench6-ranking', evidenceKind: 'measured' },
  { socVendor: 'Qualcomm', socName: 'Snapdragon 8 Gen 1', metric: 'geekerwan_geekbench_6_multi_core', value: 4061, unit: 'points', sourceId: 'geekerwan-geekbench6-ranking', evidenceKind: 'measured' },
  { socVendor: 'Huawei', socName: 'Kirin 9000', metric: 'geekerwan_geekbench_6_multi_core', value: 3851, unit: 'points', sourceId: 'geekerwan-geekbench6-ranking', evidenceKind: 'measured' },
  { socVendor: 'MediaTek', socName: 'Dimensity 8200', metric: 'geekerwan_geekbench_6_multi_core', value: 3809, unit: 'points', sourceId: 'geekerwan-geekbench6-ranking', evidenceKind: 'measured' },
  { socVendor: 'MediaTek', socName: 'Dimensity 8100', metric: 'geekerwan_geekbench_6_multi_core', value: 3721, unit: 'points', sourceId: 'geekerwan-geekbench6-ranking', evidenceKind: 'measured' },
  { socVendor: 'Qualcomm', socName: 'Snapdragon 870', metric: 'geekerwan_geekbench_6_multi_core', value: 3437, unit: 'points', sourceId: 'geekerwan-geekbench6-ranking', evidenceKind: 'measured' },
  { socVendor: 'Qualcomm', socName: 'Snapdragon 865', metric: 'geekerwan_geekbench_6_multi_core', value: 3352, unit: 'points', sourceId: 'geekerwan-geekbench6-ranking', evidenceKind: 'measured' },
] as const;

export const GEEKERWAN_EFFICIENCY_REFERENCES:
  readonly GeekerwanEfficiencyReference[] = [
  { socVendor: 'Qualcomm', socName: 'Snapdragon 8 Elite Gen 5', representativeDevice: 'OnePlus 15', memory: 'LPDDR5X 9600', process: 'TSMC 3nm', workload: 'geekbench6-cpu-efficiency', sourceId: 'geekerwan-cpu-efficiency-gb6', note: 'protocol-metadata-only' },
  { socVendor: 'Qualcomm', socName: 'Snapdragon 8 Elite', representativeDevice: 'OnePlus 13', memory: 'LPDDR5X 8533', process: 'TSMC 3nm', workload: 'geekbench6-cpu-efficiency', sourceId: 'geekerwan-cpu-efficiency-gb6', note: 'protocol-metadata-only' },
  { socVendor: 'Qualcomm', socName: 'Snapdragon 8 Gen 5', representativeDevice: 'OnePlus Ace 6T', memory: 'LPDDR5X 9600', process: 'TSMC 3nm', workload: 'geekbench6-cpu-efficiency', sourceId: 'geekerwan-cpu-efficiency-gb6', note: 'protocol-metadata-only' },
  { socVendor: 'MediaTek', socName: 'Dimensity 9500', representativeDevice: 'OPPO Find X9 Pro', memory: 'LPDDR5X 9600', process: 'TSMC 3nm', workload: 'geekbench6-cpu-efficiency', sourceId: 'geekerwan-cpu-efficiency-gb6', note: 'protocol-metadata-only' },
  { socVendor: 'MediaTek', socName: 'Dimensity 9400', representativeDevice: 'OPPO Find X8 Pro', memory: 'LPDDR5X 10667', process: 'TSMC 3nm', workload: 'geekbench6-cpu-efficiency', sourceId: 'geekerwan-cpu-efficiency-gb6', note: 'protocol-metadata-only' },
  { socVendor: 'Apple', socName: 'A19 Pro', representativeDevice: 'iPhone 17 Pro Max', memory: 'LPDDR5X 9600', process: 'TSMC 3nm', workload: 'geekbench6-cpu-efficiency', sourceId: 'geekerwan-cpu-efficiency-gb6', note: 'protocol-metadata-only' },
  { socVendor: 'Apple', socName: 'A19', representativeDevice: 'iPhone 17', memory: 'LPDDR5X 8533', process: 'TSMC 3nm', workload: 'geekbench6-cpu-efficiency', sourceId: 'geekerwan-cpu-efficiency-gb6', note: 'protocol-metadata-only' },
  { socVendor: 'Apple', socName: 'A18 Pro', representativeDevice: 'iPhone 16 Pro Max', memory: 'LPDDR5X 7500', process: 'TSMC 3nm', workload: 'geekbench6-cpu-efficiency', sourceId: 'geekerwan-cpu-efficiency-gb6', note: 'protocol-metadata-only' },
  { socVendor: 'Huawei', socName: 'Kirin 9020', representativeDevice: 'Huawei Mate 70 Pro+', workload: 'geekbench6-cpu-efficiency', sourceId: 'geekerwan-cpu-efficiency-gb6', note: 'protocol-metadata-only' },
  { socVendor: 'Samsung', socName: 'Exynos 2400', representativeDevice: 'Samsung Galaxy S24 EU', memory: 'LPDDR5X', process: 'Samsung 4nm', workload: 'geekbench6-cpu-efficiency', sourceId: 'geekerwan-cpu-efficiency-gb6', note: 'protocol-metadata-only' },
  { socVendor: 'Google', socName: 'Tensor G4', representativeDevice: 'Google Pixel 9', memory: 'LPDDR5X', process: 'Samsung 4nm', workload: 'geekbench6-cpu-efficiency', sourceId: 'geekerwan-cpu-efficiency-gb6', note: 'protocol-metadata-only' },
  { socVendor: 'Xiaomi', socName: 'Xring O1', representativeDevice: 'Xiaomi 15s Pro', memory: 'LPDDR5X 9600', process: 'TSMC 3nm', workload: 'geekbench6-cpu-efficiency', sourceId: 'geekerwan-cpu-efficiency-gb6', note: 'protocol-metadata-only' },

  { socVendor: 'Qualcomm', socName: 'Snapdragon 8 Elite Gen 5', representativeDevice: 'OnePlus 15', memory: 'LPDDR5X 9600', process: 'TSMC 3nm', workload: '3dmark-snl-gpu-efficiency', sourceId: 'geekerwan-gpu-efficiency-snl', note: 'protocol-metadata-only' },
  { socVendor: 'MediaTek', socName: 'Dimensity 9500', representativeDevice: 'OPPO Find X9 Pro', memory: 'LPDDR5X 9600', process: 'TSMC 3nm', workload: '3dmark-snl-gpu-efficiency', sourceId: 'geekerwan-gpu-efficiency-snl', note: 'protocol-metadata-only' },
  { socVendor: 'Apple', socName: 'A19 Pro', representativeDevice: 'iPhone 17 Pro Max', memory: 'LPDDR5X 9600', process: 'TSMC 3nm', workload: '3dmark-snl-gpu-efficiency', sourceId: 'geekerwan-gpu-efficiency-snl', note: 'protocol-metadata-only' },
  { socVendor: 'Samsung', socName: 'Exynos 2400', representativeDevice: 'Samsung Galaxy S24 EU', memory: 'LPDDR5X', process: 'Samsung 4nm', workload: '3dmark-snl-gpu-efficiency', sourceId: 'geekerwan-gpu-efficiency-snl', note: 'protocol-metadata-only' },
  { socVendor: 'Google', socName: 'Tensor G4', representativeDevice: 'Google Pixel 9', memory: 'LPDDR5X', process: 'Samsung 4nm', workload: '3dmark-snl-gpu-efficiency', sourceId: 'geekerwan-gpu-efficiency-snl', note: 'protocol-metadata-only' },
  { socVendor: 'Xiaomi', socName: 'Xring O1', representativeDevice: 'Xiaomi 15s Pro', memory: 'LPDDR5X 9600', process: 'TSMC 3nm', workload: '3dmark-snl-gpu-efficiency', sourceId: 'geekerwan-gpu-efficiency-snl', note: 'protocol-metadata-only' },
] as const;
