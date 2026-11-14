import { describe, expect, it } from 'vitest';
import { simulateThermalExperience } from '../src/lib/simulation/live-thermal-experience';
import type { DeviceCorpus } from '../src/lib/simulation/modules/device-corpus';

const corpus: DeviceCorpus = {
  version: 'empty',
  sources: [],
  devices: [],
  measurements: [],
};

const input = {
  domain: 'gpu_sustained' as const,
  targetPowerW: 10,
  ambientTemperatureC: 25,
  thermalResistanceCPerW: 4,
  thermalMassJPerC: 40,
  throttleTemperatureC: 45,
  durationSeconds: 600,
};

describe('thermal sensitivity scenarios', () => {
  it('reports directional hot-room and better-cooling probes', () => {
    const result = simulateThermalExperience(corpus, input);

    expect(result.status).toBe('resolved');
    expect(result.sensitivity).toHaveLength(3);

    const hot = result.sensitivity?.find(
      (row) => row.scenario === 'hot-ambient',
    );
    const cooling = result.sensitivity?.find(
      (row) => row.scenario === 'improved-cooling',
    );

    expect(hot).toBeDefined();
    expect(cooling).toBeDefined();

    expect(hot!.peakTemperatureC).toBeGreaterThanOrEqual(
      result.peakTemperatureC!,
    );
    expect(cooling!.peakTemperatureC).toBeLessThanOrEqual(
      result.peakTemperatureC!,
    );
    expect(hot!.deltaPeakTemperatureC).toBeGreaterThanOrEqual(0);
    expect(cooling!.deltaPeakTemperatureC).toBeLessThanOrEqual(0);
  });

  it('labels higher SoC load as a separate controlled scenario', () => {
    const result = simulateThermalExperience(corpus, input);
    const higherPower = result.sensitivity?.find(
      (row) => row.scenario === 'higher-power',
    );

    expect(higherPower).toBeDefined();
    expect(higherPower!.sustainedPowerW).toBeGreaterThan(0);
  });
});


describe('calibrated thermal sensitivity anchoring', () => {
  it('uses measured baseline calibration but physics-derived scenario deltas', () => {
    const calibratedCorpus: DeviceCorpus = {
      version: 'calibrated-sensitivity',
      sources: [{
        id: 'lab',
        publisher: 'Lab',
        url: 'https://example.com',
        protocol: 'gpu-stress',
      }],
      devices: [{
        variant: {
          id: 'peer',
          identity: {
            manufacturer: 'Example',
            family: 'Example',
            modelName: 'Peer',
          },
          battery: { capacityMah: 5000 },
          soc: {
            vendor: 'Qualcomm',
            name: 'Chip',
          },
        },
        display: {
          diagonalInches: 6.7,
          refreshRateHz: 120,
        },
      }],
      measurements: [{
        id: 'peer-gpu',
        deviceVariantId: 'peer',
        workload: 'benchmark',
        metric: 'gpu_stability_percent',
        value: 70,
        unit: 'percent',
        sourceId: 'lab',
        evidenceKind: 'measured',
      }],
    };

    const result = simulateThermalExperience(
      calibratedCorpus,
      {
        ...input,
        manufacturer: 'Example',
        batteryMah: 5000,
        socVendor: 'Qualcomm',
        socName: 'Chip',
        displayDiagonalInches: 6.7,
        refreshRateHz: 120,
      },
    );

    expect(result.evidenceMode).toBe('calibrated');

    const hot = result.sensitivity?.find(
      (row) => row.scenario === 'hot-ambient',
    );
    const cooling = result.sensitivity?.find(
      (row) => row.scenario === 'improved-cooling',
    );

    expect(hot).toBeDefined();
    expect(cooling).toBeDefined();

    expect(
      hot!.deltaPeakTemperatureC,
    ).toBeGreaterThanOrEqual(0);
    expect(
      cooling!.deltaPeakTemperatureC,
    ).toBeLessThanOrEqual(0);

    expect(
      hot!.sustainedPerformancePercent,
    ).toBeLessThanOrEqual(100);
    expect(
      cooling!.sustainedPerformancePercent,
    ).toBeLessThanOrEqual(100);
  });
});
