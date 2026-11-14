import { describe, expect, it } from 'vitest';
import {
  estimateLiveSustainedPerformance,
  estimateSustainedPerformance,
} from '../src/lib/simulation/modules/sustained-performance-estimator';
import type { DeviceCorpus } from '../src/lib/simulation/modules/device-corpus';
import type { SocVendor } from '../src/lib/simulation/modules/device-variant';

const source = {
  id: 'lab',
  publisher: 'Lab',
  url: 'https://example.com',
  protocol: 'gpu-stress',
};

function device(
  id: string,
  vendor: SocVendor,
  name: string,
) {
  return {
    variant: {
      id,
      identity: {
        manufacturer: 'Example',
        family: 'Example',
        modelName: id,
      },
      soc: { vendor, name },
      battery: { capacityMah: 5000 },
    },
  };
}

function measurement(
  id: string,
  deviceVariantId: string,
  value: number,
) {
  return {
    id,
    deviceVariantId,
    workload: 'benchmark' as const,
    metric: 'gpu_stability_percent',
    value,
    unit: 'percent',
    sourceId: 'lab',
    evidenceKind: 'measured' as const,
  };
}

describe('evidence-only sustained performance estimator', () => {
  it('uses same-SoC-family evidence without requiring thermal constants', () => {
    const corpus: DeviceCorpus = {
      version: 'performance-estimator',
      sources: [source],
      devices: [
        device('a', 'MediaTek', 'Dimensity 9500'),
        device('b', 'MediaTek', 'Dimensity 9500'),
        device('c', 'Qualcomm', 'Snapdragon X'),
      ],
      measurements: [
        measurement('m1', 'a', 50),
        measurement('m2', 'b', 60),
        measurement('m3', 'c', 95),
      ],
    };

    const result = estimateSustainedPerformance(
      corpus,
      {
        domain: 'gpu_sustained',
        socVendor: 'MediaTek',
        socName: 'Dimensity 9500',
        batteryMah: 5000,
      },
    );

    expect(result.status).toBe('resolved');
    expect(result.evidenceScope).toBe(
      'same-soc-family',
    );
    expect(result.referenceCount).toBe(2);
    expect(result.expectedPercent).toBeGreaterThan(
      49,
    );
    expect(result.expectedPercent).toBeLessThan(
      61,
    );
    expect(result.neighborIds.sort()).toEqual([
      'a',
      'b',
    ]);
  });

  it('falls back to same vendor when exact-family evidence is too thin', () => {
    const corpus: DeviceCorpus = {
      version: 'performance-estimator-vendor',
      sources: [source],
      devices: [
        device('a', 'MediaTek', 'Dimensity 9500'),
        device('b', 'MediaTek', 'Dimensity 9400'),
        device('c', 'Qualcomm', 'Snapdragon X'),
      ],
      measurements: [
        measurement('m1', 'a', 50),
        measurement('m2', 'b', 70),
        measurement('m3', 'c', 95),
      ],
    };

    const result = estimateSustainedPerformance(
      corpus,
      {
        domain: 'gpu_sustained',
        socVendor: 'MediaTek',
        socName: 'Dimensity 9500',
      },
    );

    expect(result.status).toBe('resolved');
    expect(result.evidenceScope).toBe(
      'same-soc-vendor',
    );
    expect(result.referenceCount).toBe(2);
  });

  it('uses measured Exynos 2600 peers as a same-vendor prior for an Exynos 2700 concept', () => {
    const result =
      estimateLiveSustainedPerformance({
        domain: 'gpu_sustained',
        manufacturer: 'Samsung',
        socVendor: 'Samsung',
        socName: 'Exynos 2700',
        batteryMah: 5700,
        displayDiagonalInches: 6.9,
        refreshRateHz: 120,
        coolingClass: 'large-vapor-chamber',
      });

    expect(result.status).toBe('resolved');
    expect(result.evidenceScope).toBe(
      'same-soc-vendor',
    );
    expect(
      result.sameSocFamilyReferences,
    ).toBe(0);
    expect(
      result.sameSocVendorReferences,
    ).toBeGreaterThanOrEqual(2);
    expect(result.referenceCount).toBeGreaterThanOrEqual(
      2,
    );
    expect(result.expectedPercent).toBeGreaterThan(
      45,
    );
    expect(result.expectedPercent).toBeLessThan(
      65,
    );
  });

  it('stays unresolved without measured sustained-performance evidence', () => {
    const corpus: DeviceCorpus = {
      version: 'empty',
      sources: [],
      devices: [],
      measurements: [],
    };

    const result = estimateSustainedPerformance(
      corpus,
      {
        domain: 'gpu_sustained',
        socVendor: 'Qualcomm',
        socName: 'Unknown Future Chip',
      },
    );

    expect(result.status).toBe('unresolved');
    expect(result.referenceCount).toBe(0);
  });
});
