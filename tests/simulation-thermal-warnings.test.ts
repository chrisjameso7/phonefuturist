import { describe, expect, it } from 'vitest';
import { simulateThermalExperience } from '../src/lib/simulation/live-thermal-experience';
import type { DeviceCorpus } from '../src/lib/simulation/modules/device-corpus';

const emptyCorpus: DeviceCorpus = {
  version: 'empty',
  sources: [],
  devices: [],
  measurements: [],
};

describe('thermal plausibility warnings', () => {
  it('warns when throttle headroom is unrealistically small', () => {
    const result = simulateThermalExperience(emptyCorpus, {
      domain: 'gpu_sustained',
      targetPowerW: 8,
      ambientTemperatureC: 30,
      thermalResistanceCPerW: 4,
      thermalMassJPerC: 35,
      throttleTemperatureC: 35,
      durationSeconds: 300,
    });

    expect(result.status).toBe('resolved');
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'LOW_THROTTLE_HEADROOM',
        }),
      ]),
    );
  });

  it('flags severe sustained throttling on a thermally constrained setup', () => {
    const result = simulateThermalExperience(emptyCorpus, {
      domain: 'gpu_sustained',
      targetPowerW: 15,
      ambientTemperatureC: 25,
      thermalResistanceCPerW: 10,
      thermalMassJPerC: 10,
      throttleTemperatureC: 40,
      durationSeconds: 600,
    });

    expect(result.status).toBe('resolved');
    expect(result.throttleStartSecond).toBeDefined();
    expect(result.warnings?.some(
      (warning) =>
        warning.code === 'EARLY_THROTTLE' ||
        warning.code === 'SEVERE_SUSTAINED_THROTTLE',
    )).toBe(true);
  });
});
