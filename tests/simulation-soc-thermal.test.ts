import { describe, expect, it } from 'vitest';
import { simulateSocThermals } from '../src/lib/simulation/modules/soc-thermal';

const base = {
  targetPowerW: 8,
  ambientTemperatureC: 25,
  thermalResistanceCPerW: 6,
  thermalMassJPerC: 24,
  throttleTemperatureC: 82,
  durationSeconds: 1800,
  stepSeconds: 1,
};

describe('deterministic SoC thermal module', () => {
  it('replays identically for identical inputs', () => {
    expect(simulateSocThermals(base)).toEqual(simulateSocThermals(base));
  });

  it('runs hotter with more power', () => {
    const low = simulateSocThermals({ ...base, targetPowerW: 5 })!;
    const high = simulateSocThermals({ ...base, targetPowerW: 10 })!;
    expect(high.peakTemperatureC).toBeGreaterThan(low.peakTemperatureC);
  });

  it('runs cooler with stronger cooling', () => {
    const weak = simulateSocThermals({ ...base, thermalResistanceCPerW: 8 })!;
    const strong = simulateSocThermals({ ...base, thermalResistanceCPerW: 3.5 })!;
    expect(strong.peakTemperatureC).toBeLessThan(weak.peakTemperatureC);
  });

  it('throttles when the thermal ceiling is crossed', () => {
    const result = simulateSocThermals({ ...base, targetPowerW: 12, thermalResistanceCPerW: 8 })!;
    expect(result.throttleStartSecond).toBeDefined();
    expect(result.sustainedPerformancePercent).toBeLessThan(100);
  });

  it('rejects invalid physical inputs', () => {
    expect(simulateSocThermals({ ...base, targetPowerW: 0 })).toBeUndefined();
    expect(simulateSocThermals({ ...base, thermalMassJPerC: 0 })).toBeUndefined();
    expect(simulateSocThermals({ ...base, throttleTemperatureC: 20 })).toBeUndefined();
  });
});
