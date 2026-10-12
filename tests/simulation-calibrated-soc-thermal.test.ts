import { describe, expect, it } from 'vitest';
import { simulateCalibratedSocThermals } from '../src/lib/simulation/modules/calibrated-soc-thermal';
import type { DeviceCorpus } from '../src/lib/simulation/modules/device-corpus';

const corpus: DeviceCorpus = {
  version: 'test',
  sources: [{ id: 'lab', publisher: 'Lab', url: 'https://example.com' }],
  devices: [
    {
      variant: {
        id: 'near',
        identity: { manufacturer: 'A', family: 'A', modelName: 'Near' },
        battery: { capacityMah: 5500 },
        soc: { vendor: 'Qualcomm', name: 'Chip' },
      },
      display: { diagonalInches: 6.8, refreshRateHz: 120 },
      dimensions: { thicknessMm: 8.5, weightG: 220 },
      cooling: { class: 'large-vapor-chamber' },
    },
  ],
  measurements: [
    {
      id: 'gpu-stability',
      deviceVariantId: 'near',
      workload: 'thermal',
      metric: 'gpu_stability_percent',
      value: 72,
      unit: 'percent',
      sourceId: 'lab',
      evidenceKind: 'measured',
    },
  ],
};

describe('calibrated SoC thermal simulation', () => {
  it('anchors an easy thermal case to the measured sustained prior instead of drifting to 100%', () => {
    const result = simulateCalibratedSocThermals(corpus, {
      domain: 'gpu_sustained',
      batteryMah: 5600,
      socVendor: 'Qualcomm',
      displayDiagonalInches: 6.8,
      refreshRateHz: 120,
      thicknessMm: 8.6,
      weightG: 221,
      coolingClass: 'large-vapor-chamber',
      targetPowerW: 12,
      ambientTemperatureC: 25,
      thermalResistanceCPerW: 0.5,
      thermalMassJPerC: 100,
      throttleTemperatureC: 95,
      durationSeconds: 600,
    });

    expect(result.status).toBe('resolved');
    expect(
      result.evidence?.targetSustainedPerformancePercent,
    ).toBe(72);
    expect(
      result.simulation?.evidencePriorPercent,
    ).toBe(72);
    expect(
      result.simulation?.rawPhysicsSustainedPercent,
    ).toBeCloseTo(100, 1);
    expect(
      result.simulation?.sustainedPerformancePercent,
    ).toBeCloseTo(72, 1);
    expect(
      result.simulation?.sustainedPerformancePercent,
    ).toBeLessThan(100);
  });

  it('allows harsher thermal conditions to pull sustained performance below the measured prior', () => {
    const result = simulateCalibratedSocThermals(corpus, {
      domain: 'gpu_sustained',
      batteryMah: 5600,
      socVendor: 'Qualcomm',
      displayDiagonalInches: 6.8,
      refreshRateHz: 120,
      thicknessMm: 8.6,
      weightG: 221,
      coolingClass: 'large-vapor-chamber',
      targetPowerW: 14,
      ambientTemperatureC: 35,
      thermalResistanceCPerW: 8,
      thermalMassJPerC: 18,
      throttleTemperatureC: 45,
      durationSeconds: 600,
    });

    expect(result.status).toBe('resolved');
    expect(
      result.simulation?.rawPhysicsSustainedPercent,
    ).toBeLessThan(100);
    expect(
      result.simulation?.thermalAdjustmentMultiplier,
    ).toBeLessThan(1);
    expect(
      result.simulation?.sustainedPerformancePercent,
    ).toBeLessThan(72);
  });

  it('fails closed when no sustained evidence exists', () => {
    const result = simulateCalibratedSocThermals(
      { ...corpus, measurements: [] },
      {
        domain: 'gpu_sustained',
        targetPowerW: 10,
        ambientTemperatureC: 25,
        thermalResistanceCPerW: 2.5,
        thermalMassJPerC: 45,
        throttleTemperatureC: 42,
      },
    );

    expect(result.status).toBe('unresolved');
  });
});
