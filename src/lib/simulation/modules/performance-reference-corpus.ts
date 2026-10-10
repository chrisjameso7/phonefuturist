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
        accessedDate: '2026-10-09',
      },
      {
        id: 'notebookcheck-vivo-x300-pro-performance',
        publisher: 'Notebookcheck',
        url: 'https://www.notebookcheck.net/More-than-just-an-unusual-camera-setup-Vivo-X300-Pro-review.1184298.0.html',
        protocol:
          '3DMark Wild Life Extreme Stress Test stability',
        accessedDate: '2026-10-10',
      },
      {
        id: 'notebookcheck-vivo-x300-performance',
        publisher: 'Notebookcheck',
        url: 'https://www.notebookcheck.net/Brilliant-Zeiss-camera-in-a-compact-smartphone-Vivo-X300-review.1192262.0.html',
        protocol:
          '3DMark Wild Life Extreme Stress Test stability',
        accessedDate: '2026-10-10',
      },
      {
        id: 'notebookcheck-oppo-find-x9-performance',
        publisher: 'Notebookcheck',
        url: 'https://www.notebookcheck.net/Oppo-Find-X9-smartphone-review-High-end-for-under-900-but-with-SoC-problems.1173149.0.html',
        protocol:
          '3DMark Wild Life Extreme Stress Test stability',
        accessedDate: '2026-10-10',
      },
      {
        id: 'notebookcheck-oneplus-15-performance',
        publisher: 'Notebookcheck',
        url: 'https://www.notebookcheck.net/OnePlus-15-smartphone-review-Gaming-at-165fps-despite-being-slower-than-the-predecessor.1171622.0.html',
        protocol:
          '3DMark Wild Life Extreme Stress Test stability',
        accessedDate: '2026-10-10',
      },
      {
        id: 'notebookcheck-honor-magic8-pro-performance',
        publisher: 'Notebookcheck',
        url: 'https://www.notebookcheck.net/Flagship-power-with-an-XXL-battery-Honor-Magic8-Pro-smartphone-review.1204159.0.html',
        protocol:
          '3DMark Wild Life Extreme Stress Test stability',
        accessedDate: '2026-10-10',
      },
      {
        id: 'notebookcheck-samsung-s26-performance',
        publisher: 'Notebookcheck',
        url: 'https://www.notebookcheck.net/Exynos-and-more-battery-power-make-it-a-star-Samsung-Galaxy-S26-review.1284566.0.html',
        protocol:
          '3DMark Wild Life Extreme Stress Test stability',
        accessedDate: '2026-10-10',
      },
      {
        id: 'notebookcheck-samsung-s26-plus-performance',
        publisher: 'Notebookcheck',
        url: 'https://www.notebookcheck.net/Will-the-Exynos-2600-save-the-unwanted-flagship-Samsung-Galaxy-S26-review.1272005.0.html',
        protocol:
          '3DMark Wild Life Extreme Stress Test stability',
        accessedDate: '2026-10-10',
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
          id: 'vivo-x300-pro-eu-performance',
          identity: {
            manufacturer: 'vivo',
            family: 'X300',
            modelName: 'X300 Pro',
            region: 'Europe',
          },
          battery: {
            capacityMah: 5440,
            chemistry: 'silicon-carbon',
          },
          soc: {
            vendor: 'MediaTek',
            name: 'Dimensity 9500',
          },
        },
        releaseDate: '2025-10-13',
        dimensions: {
          widthMm: 75.48,
          heightMm: 161.98,
          thicknessMm: 7.99,
          weightG: 226,
        },
        sourceIds: [
          'notebookcheck-vivo-x300-pro-performance',
        ],
      },
      {
        variant: {
          id: 'vivo-x300-eu-performance',
          identity: {
            manufacturer: 'vivo',
            family: 'X300',
            modelName: 'X300',
            region: 'Europe',
          },
          battery: {
            capacityMah: 5360,
          },
          soc: {
            vendor: 'MediaTek',
            name: 'Dimensity 9500',
          },
        },
        releaseDate: '2025',
        display: {
          diagonalInches: 6.31,
          resolutionWidthPx: 1216,
          resolutionHeightPx: 2640,
          refreshRateHz: 120,
          panelTechnology: 'LTPO AMOLED',
        },
        dimensions: {
          widthMm: 71.92,
          heightMm: 150.57,
          thicknessMm: 7.95,
          weightG: 190,
        },
        sourceIds: [
          'notebookcheck-vivo-x300-performance',
        ],
      },
      {
        variant: {
          id: 'oppo-find-x9-performance',
          identity: {
            manufacturer: 'Oppo',
            family: 'Find X9',
            modelName: 'Find X9',
          },
          battery: {
            capacityMah: 7025,
          },
          soc: {
            vendor: 'MediaTek',
            name: 'Dimensity 9500',
          },
        },
        releaseDate: '2025',
        display: {
          diagonalInches: 6.59,
          resolutionWidthPx: 1256,
          resolutionHeightPx: 2760,
          refreshRateHz: 120,
          panelTechnology: 'AMOLED',
        },
        dimensions: {
          thicknessMm: 8,
          weightG: 203,
        },
        sourceIds: [
          'notebookcheck-oppo-find-x9-performance',
        ],
      },
      {
        variant: {
          id: 'samsung-galaxy-s26-exynos-performance',
          identity: {
            manufacturer: 'Samsung',
            family: 'Galaxy S26',
            modelName: 'Galaxy S26',
            region: 'Europe',
          },
          battery: {
            capacityMah: 4300,
            chemistry: 'lithium-ion',
          },
          soc: {
            vendor: 'Samsung',
            name: 'Exynos 2600',
          },
        },
        releaseDate: '2026-02-25',
        display: {
          diagonalInches: 6.3,
          resolutionWidthPx: 1080,
          resolutionHeightPx: 2340,
          refreshRateHz: 120,
          panelTechnology: 'Dynamic AMOLED 2X LTPO',
        },
        dimensions: {
          widthMm: 71.7,
          heightMm: 149.6,
          thicknessMm: 7.2,
          weightG: 167,
        },
        sourceIds: [
          'notebookcheck-samsung-s26-performance',
        ],
      },
      {
        variant: {
          id: 'samsung-galaxy-s26-plus-exynos-performance',
          identity: {
            manufacturer: 'Samsung',
            family: 'Galaxy S26',
            modelName: 'Galaxy S26+',
            region: 'Europe',
          },
          battery: {
            capacityMah: 4900,
            chemistry: 'lithium-ion',
          },
          soc: {
            vendor: 'Samsung',
            name: 'Exynos 2600',
          },
        },
        releaseDate: '2026-02-25',
        display: {
          diagonalInches: 6.7,
          resolutionWidthPx: 1440,
          resolutionHeightPx: 3120,
          refreshRateHz: 120,
          panelTechnology: 'LTPO AMOLED',
        },
        dimensions: {
          widthMm: 75.8,
          heightMm: 158.4,
          thicknessMm: 7.3,
          weightG: 190,
        },
        sourceIds: [
          'notebookcheck-samsung-s26-plus-performance',
        ],
      },
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
      {
        id: 'vivo-x300-pro-eu-wle-stability',
        deviceVariantId: 'vivo-x300-pro-eu-performance',
        workload: 'benchmark',
        metric: 'gpu_stability_percent',
        value: 50.3,
        unit: 'percent',
        sourceId: 'notebookcheck-vivo-x300-pro-performance',
        evidenceKind: 'measured',
      },
      {
        id: 'vivo-x300-eu-wle-stability',
        deviceVariantId: 'vivo-x300-eu-performance',
        workload: 'benchmark',
        metric: 'gpu_stability_percent',
        value: 46.7,
        unit: 'percent',
        sourceId: 'notebookcheck-vivo-x300-performance',
        evidenceKind: 'measured',
      },
      {
        id: 'oppo-find-x9-wle-stability',
        deviceVariantId: 'oppo-find-x9-performance',
        workload: 'benchmark',
        metric: 'gpu_stability_percent',
        value: 74.3,
        unit: 'percent',
        sourceId: 'notebookcheck-oppo-find-x9-performance',
        evidenceKind: 'measured',
      },
      {
        id: 'oneplus-15-wle-stability',
        deviceVariantId: 'oneplus-15-global-7300',
        workload: 'benchmark',
        metric: 'gpu_stability_percent',
        value: 52,
        unit: 'percent',
        sourceId: 'notebookcheck-oneplus-15-performance',
        evidenceKind: 'measured',
      },
      {
        id: 'honor-magic8-pro-eu-wle-stability',
        deviceVariantId: 'honor-magic8-pro-eu-6270',
        workload: 'benchmark',
        metric: 'gpu_stability_percent',
        value: 50.7,
        unit: 'percent',
        sourceId: 'notebookcheck-honor-magic8-pro-performance',
        evidenceKind: 'measured',
      },
      {
        id: 'samsung-s26-exynos-wle-stability',
        deviceVariantId: 'samsung-galaxy-s26-exynos-performance',
        workload: 'benchmark',
        metric: 'gpu_stability_percent',
        value: 48.8,
        unit: 'percent',
        sourceId: 'notebookcheck-samsung-s26-performance',
        evidenceKind: 'measured',
      },
      {
        id: 'samsung-s26-plus-exynos-wle-stability',
        deviceVariantId: 'samsung-galaxy-s26-plus-exynos-performance',
        workload: 'benchmark',
        metric: 'gpu_stability_percent',
        value: 59.6,
        unit: 'percent',
        sourceId: 'notebookcheck-samsung-s26-plus-performance',
        evidenceKind: 'measured',
      },
    ],
  };
}
