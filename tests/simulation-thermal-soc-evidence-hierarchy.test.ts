import { describe, expect, it } from 'vitest';
import { simulateCalibratedSocThermals } from '../src/lib/simulation/modules/calibrated-soc-thermal';
import type { DeviceCorpus } from '../src/lib/simulation/modules/device-corpus';
import type { SocVendor } from '../src/lib/simulation/modules/device-variant';

function device(
  id: string,
  vendor: SocVendor,
  socName: string,
) {
  return {
    variant: {
      id,
      identity: {
        manufacturer: 'Example',
        family: 'Example',
        modelName: id,
      },
      soc: {
        vendor,
        name: socName,
      },
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

const source = {
  id: 'lab',
  publisher: 'Lab',
  url: 'https://example.com',
  protocol: 'gpu-stress',
};

function run(corpus: DeviceCorpus) {
  return simulateCalibratedSocThermals(
    corpus,
    {
      domain: 'gpu_sustained',
      socVendor: 'MediaTek',
      socName: 'Dimensity 9500',
      targetPowerW: 10,
      ambientTemperatureC: 25,
      thermalResistanceCPerW: 3,
      thermalMassJPerC: 45,
      throttleTemperatureC: 42,
      durationSeconds: 600,
    },
  );
}

describe('calibrated thermal SoC evidence hierarchy', () => {
  it('prioritizes two or more same-family references over broader peers', () => {
    const corpus: DeviceCorpus = {
      version: 'same-family',
      sources: [source],
      devices: [
        device('d9500-a', 'MediaTek', 'Dimensity 9500'),
        device('d9500-b', 'MediaTek', 'Dimensity 9500'),
        device('snap-a', 'Qualcomm', 'Snapdragon X'),
        device('snap-b', 'Qualcomm', 'Snapdragon X'),
      ],
      measurements: [
        measurement('m1', 'd9500-a', 40),
        measurement('m2', 'd9500-b', 50),
        measurement('m3', 'snap-a', 90),
        measurement('m4', 'snap-b', 95),
      ],
    };

    const result = run(corpus);

    expect(result.status).toBe('resolved');
    expect(result.evidence?.evidenceScope).toBe(
      'same-soc-family',
    );
    expect(result.evidence?.referenceCount).toBe(2);
    expect(
      result.evidence?.neighborIds.sort(),
    ).toEqual(['d9500-a', 'd9500-b']);
    expect(
      result.evidence?.targetSustainedPerformancePercent,
    ).toBeLessThan(60);
  });

  it('does not trust a single same-family reference by itself', () => {
    const corpus: DeviceCorpus = {
      version: 'single-family',
      sources: [source],
      devices: [
        device('d9500-a', 'MediaTek', 'Dimensity 9500'),
        device('mediatek-other', 'MediaTek', 'Dimensity 9400'),
        device('snap-a', 'Qualcomm', 'Snapdragon X'),
      ],
      measurements: [
        measurement('m1', 'd9500-a', 40),
        measurement('m2', 'mediatek-other', 60),
        measurement('m3', 'snap-a', 95),
      ],
    };

    const result = run(corpus);

    expect(result.status).toBe('resolved');
    expect(result.evidence?.evidenceScope).toBe(
      'same-soc-vendor',
    );
    expect(result.evidence?.referenceCount).toBe(2);
  });
});
