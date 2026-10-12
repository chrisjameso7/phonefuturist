import { describe, expect, it } from 'vitest';
import { simulateThermalExperience } from '../src/lib/simulation/live-thermal-experience';
import type { DeviceCorpus } from '../src/lib/simulation/modules/device-corpus';

const baseInput = {
  domain: 'gpu_sustained' as const,
  batteryMah: 5500,
  socVendor: 'Qualcomm',
  displayDiagonalInches: 6.8,
  refreshRateHz: 120,
  thicknessMm: 8.5,
  weightG: 220,
  coolingClass: 'large-vapor-chamber' as const,
  targetPowerW: 10,
  ambientTemperatureC: 25,
  thermalResistanceCPerW: 3,
  thermalMassJPerC: 45,
  throttleTemperatureC: 42,
  durationSeconds: 600,
};

describe('live thermal experience', () => {
  it('uses calibrated sustained-performance evidence when available', () => {
    const corpus: DeviceCorpus = {
      version: 'test',
      sources: [
        {
          id: 'lab',
          publisher: 'Lab',
          url: 'https://example.com',
        },
      ],
      devices: [
        {
          variant: {
            id: 'reference',
            identity: {
              manufacturer: 'Example',
              family: 'Example',
              modelName: 'Reference',
            },
            battery: { capacityMah: 5500 },
            soc: { vendor: 'Qualcomm', name: 'Chip' },
          },
          display: {
            diagonalInches: 6.8,
            refreshRateHz: 120,
          },
          dimensions: {
            thicknessMm: 8.5,
            weightG: 220,
          },
          cooling: {
            class: 'large-vapor-chamber',
          },
        },
      ],
      measurements: [
        {
          id: 'gpu-stability',
          deviceVariantId: 'reference',
          workload: 'thermal',
          metric: 'gpu_stability_percent',
          value: 75,
          unit: 'percent',
          sourceId: 'lab',
          evidenceKind: 'measured',
        },
      ],
    };

    const result = simulateThermalExperience(
      corpus,
      baseInput,
    );

    expect(result.status).toBe('resolved');
    expect(result.evidenceMode).toBe('calibrated');
    expect(result.referenceCount).toBe(1);
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.sustainedPerformancePercent).toBeGreaterThan(0);
  });

  it('returns a separate package/surface trace when explicit two-node physics is supplied', () => {
    const corpus: DeviceCorpus = {
      version: 'empty-two-node',
      sources: [],
      devices: [],
      measurements: [],
    };

    const result = simulateThermalExperience(
      corpus,
      {
        ...baseInput,
        twoNode: {
          socToChassisResistanceCPerW: 2.2,
          chassisToAmbientResistanceCPerW: 3.4,
          socThermalMassJPerC: 12,
          chassisThermalMassJPerC: 55,
          socThrottleTemperatureC: 80,
          surfaceComfortTemperatureC: 40,
        },
      },
    );

    expect(result.status).toBe('resolved');
    expect(result.twoNode).toBeDefined();
    expect(
      result.twoNode!.peakSocPackageTemperatureC,
    ).toBeGreaterThan(
      result.twoNode!.peakChassisSurfaceTemperatureC,
    );
    expect(
      result.twoNode!.points.length,
    ).toBeGreaterThan(1);
  });

  it('does not invent a two-node trace when the extra physical parameters are absent', () => {
    const corpus: DeviceCorpus = {
      version: 'empty-no-two-node',
      sources: [],
      devices: [],
      measurements: [],
    };

    const result = simulateThermalExperience(
      corpus,
      baseInput,
    );

    expect(result.twoNode).toBeUndefined();
  });

  it('falls back to deterministic thermal physics when no calibration evidence exists', () => {
    const corpus: DeviceCorpus = {
      version: 'empty',
      sources: [],
      devices: [],
      measurements: [],
    };

    const result = simulateThermalExperience(
      corpus,
      baseInput,
    );

    expect(result.status).toBe('resolved');
    expect(result.evidenceMode).toBe('physics-fallback');
    expect(result.confidence).toBeUndefined();
    expect(result.referenceCount).toBeUndefined();
    expect(result.peakTemperatureC).toBeGreaterThanOrEqual(
      baseInput.ambientTemperatureC,
    );
    expect(result.sustainedPerformancePercent).toBeGreaterThan(0);
  });
});
