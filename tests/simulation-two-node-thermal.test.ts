import { describe, expect, it } from 'vitest';
import { simulateTwoNodeThermals } from '../src/lib/simulation/modules/two-node-thermal';

const base = {
  targetPowerW: 10,
  ambientTemperatureC: 25,
  socToChassisResistanceCPerW: 2.5,
  chassisToAmbientResistanceCPerW: 3.5,
  socThermalMassJPerC: 12,
  chassisThermalMassJPerC: 55,
  socThrottleTemperatureC: 80,
  surfaceComfortTemperatureC: 42,
  durationSeconds: 1200,
  stepSeconds: 0.5,
};

describe('deterministic two-node thermal model', () => {
  it('replays identically for identical inputs', () => {
    expect(
      simulateTwoNodeThermals(base),
    ).toEqual(
      simulateTwoNodeThermals(base),
    );
  });

  it('runs both nodes hotter with more SoC power', () => {
    const low = simulateTwoNodeThermals({
      ...base,
      targetPowerW: 6,
    })!;

    const high = simulateTwoNodeThermals({
      ...base,
      targetPowerW: 14,
    })!;

    expect(
      high.peakSocPackageTemperatureC,
    ).toBeGreaterThan(
      low.peakSocPackageTemperatureC,
    );

    expect(
      high.peakChassisSurfaceTemperatureC,
    ).toBeGreaterThan(
      low.peakChassisSurfaceTemperatureC,
    );
  });

  it('lowers surface temperature with stronger chassis-to-ambient cooling', () => {
    const weak = simulateTwoNodeThermals({
      ...base,
      chassisToAmbientResistanceCPerW: 6,
    })!;

    const strong = simulateTwoNodeThermals({
      ...base,
      chassisToAmbientResistanceCPerW: 2,
    })!;

    expect(
      strong.peakChassisSurfaceTemperatureC,
    ).toBeLessThan(
      weak.peakChassisSurfaceTemperatureC,
    );
  });

  it('reduces the SoC hotspot with stronger package-to-chassis coupling', () => {
    const weak = simulateTwoNodeThermals({
      ...base,
      socToChassisResistanceCPerW: 4,
    })!;

    const strong = simulateTwoNodeThermals({
      ...base,
      socToChassisResistanceCPerW: 1.2,
    })!;

    expect(
      strong.peakSocPackageTemperatureC,
    ).toBeLessThan(
      weak.peakSocPackageTemperatureC,
    );
  });

  it('tracks package throttling separately from surface comfort', () => {
    const result = simulateTwoNodeThermals({
      ...base,
      targetPowerW: 16,
      socThrottleTemperatureC: 62,
      surfaceComfortTemperatureC: 38,
    })!;

    expect(
      result.throttleStartSecond,
    ).toBeDefined();

    expect(
      result.surfaceComfortCrossSecond,
    ).toBeDefined();

    expect(
      result.sustainedPerformancePercent,
    ).toBeLessThan(100);

    expect(
      result.peakSocPackageTemperatureC,
    ).toBeGreaterThan(
      result.peakChassisSurfaceTemperatureC,
    );
  });

  it('keeps the chassis node distinct from the package node', () => {
    const result =
      simulateTwoNodeThermals(base)!;

    expect(
      result.endSocPackageTemperatureC,
    ).not.toBe(
      result.endChassisSurfaceTemperatureC,
    );

    expect(result.points.length).toBeGreaterThan(
      5,
    );

    expect(
      result.points.every(
        (point) =>
          Number.isFinite(
            point.socPackageTemperatureC,
          ) &&
          Number.isFinite(
            point.chassisSurfaceTemperatureC,
          ),
      ),
    ).toBe(true);
  });

  it('rejects invalid physical inputs', () => {
    expect(
      simulateTwoNodeThermals({
        ...base,
        socThermalMassJPerC: 0,
      }),
    ).toBeUndefined();

    expect(
      simulateTwoNodeThermals({
        ...base,
        chassisToAmbientResistanceCPerW:
          0,
      }),
    ).toBeUndefined();

    expect(
      simulateTwoNodeThermals({
        ...base,
        socThrottleTemperatureC: 20,
      }),
    ).toBeUndefined();

    expect(
      simulateTwoNodeThermals({
        ...base,
        stepSeconds: 5,
      }),
    ).toBeUndefined();
  });
});
