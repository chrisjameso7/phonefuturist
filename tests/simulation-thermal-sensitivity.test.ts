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
