import type { DeviceCorpus } from './device-corpus';

export const PERFORMANCE_REFERENCE_CORPUS_VERSION =
  'performance-reference-corpus-0.1.0';

export function buildPerformanceReferenceCorpus(): DeviceCorpus {
  return {
    version: PERFORMANCE_REFERENCE_CORPUS_VERSION,
    sources: [
      {
        id: 'notebookcheck-vivo-x300-ultra-performance',
        publisher: 'Notebookcheck',
        url: 'https://www.notebookcheck.net/Vivo-X300-Ultra-Review-Best-2026-camera-smartphone-with-a-surprising-number-of-weaknesses.1293093.0.html',
        protocol:
          '3DMark Wild Life Extreme Stress Test stability',
        protocolVersion: '1.1.14.3',
        accessedDate: '2026-10-09',
      },
      {
        id: 'xiaomi-17-ultra-official-performance',
        publisher: 'Xiaomi',
        url: 'https://www.mi.com/global/product/xiaomi-17-ultra/',
        protocol: 'official product specification',
        accessedDate: '2026-10-09',
      },
    ],
    devices: [
      {
        variant: {
          id: 'xiaomi-17-ultra-performance',
          identity: {
            manufacturer: 'Xiaomi',
            family: 'Xiaomi 17',
            modelName: 'Xiaomi 17 Ultra',
          },
          battery: {
            capacityMah: 6000,
          },
          soc: {
            vendor: 'Qualcomm',
            name: 'Snapdragon 8 Elite Gen 5',
          },
        },
        releaseDate: '2026',
        display: {
          diagonalInches: 6.9,
          resolutionWidthPx: 1200,
          resolutionHeightPx: 2608,
          refreshRateHz: 120,
          panelTechnology: 'LTPO OLED',
        },
        dimensions: {
          widthMm: 77.6,
          heightMm: 162.9,
          thicknessMm: 8.29,
          weightG: 218.4,
        },
        cooling: {
          class: 'large-vapor-chamber',
          vaporChamberAreaMm2: 5500,
          fan: false,
        },
        sourceIds: [
          'xiaomi-17-ultra-official-performance',
        ],
      },
    ],
    measurements: [
      {
        id: 'xiaomi-17-ultra-wle-stability',
        deviceVariantId: 'xiaomi-17-ultra-performance',
        workload: 'benchmark',
        metric: 'gpu_stability_percent',
        value: 73,
        unit: 'percent',
        sourceId: 'notebookcheck-vivo-x300-ultra-performance',
        evidenceKind: 'measured',
      },
      {
        id: 'vivo-x300-ultra-wle-stability',
        deviceVariantId: 'vivo-x300-ultra-global-6600',
        workload: 'benchmark',
        metric: 'gpu_stability_percent',
        value: 60.4,
        unit: 'percent',
        sourceId: 'notebookcheck-vivo-x300-ultra-performance',
        evidenceKind: 'measured',
      },
      {
        id: 'samsung-s26-ultra-wle-stability',
        deviceVariantId: 'samsung-galaxy-s26-ultra-global-5000',
        workload: 'benchmark',
        metric: 'gpu_stability_percent',
        value: 54,
        unit: 'percent',
        sourceId: 'notebookcheck-vivo-x300-ultra-performance',
        evidenceKind: 'measured',
      },
      {
        id: 'oppo-find-x9-pro-wle-stability',
        deviceVariantId: 'oppo-find-x9-pro-global-7500',
        workload: 'benchmark',
        metric: 'gpu_stability_percent',
        value: 38.7,
        unit: 'percent',
        sourceId: 'notebookcheck-vivo-x300-ultra-performance',
        evidenceKind: 'measured',
      },
    ],
  };
}
