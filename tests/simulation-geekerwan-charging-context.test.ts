import { describe, expect, it } from 'vitest';
import {
  buildCalibrationRegistry,
  clearCalibrationRegistryCache,
} from '../src/lib/simulation/modules/calibration-registry';
import {
  estimateGeekerwanChargingContext,
} from '../src/lib/simulation/modules/geekerwan-charging-context';

describe('Geekerwan Wh-first charging context', () => {
  it('resolves a hypothetical 60 W Samsung from measured wall/cell energy pairs', () => {
    clearCalibrationRegistryCache();

    const result =
      estimateGeekerwanChargingContext(
        buildCalibrationRegistry(),
        {
          manufacturer: 'Samsung',
          batteryEnergyWh: 22,
          chargerWatts: 60,
        },
      );

    expect(result.status).toBe('resolved');
    expect(
      result.expectedFullChargeMinutes,
    ).toBeGreaterThan(0);
    expect(
      result.expectedWallInputEnergyWh,
    ).toBeGreaterThan(22);
    expect(
      result.expectedAverageWallInputPowerW,
    ).toBeLessThanOrEqual(60);
    expect(
      result.referenceCount,
    ).toBeGreaterThan(0);
  });

  it('fails closed from mAh-only input', () => {
    clearCalibrationRegistryCache();

    const result =
      estimateGeekerwanChargingContext(
        buildCalibrationRegistry(),
        {
          manufacturer: 'Samsung',
          chargerWatts: 60,
        },
      );

    expect(result.status).toBe('unresolved');
    expect(
      result.unresolvedReason,
    ).toContain('Wh');
  });

  it('reports extrapolation state from the selected charger-power evidence range', () => {
    clearCalibrationRegistryCache();

    const result =
      estimateGeekerwanChargingContext(
        buildCalibrationRegistry(),
        {
          manufacturer: 'Samsung',
          batteryEnergyWh: 22,
          chargerWatts: 60,
        },
      );

    expect(result.status).toBe('resolved');
    expect(
      result.targetPosition,
    ).toBeDefined();
    expect(
      result.evidenceRangeWatts?.min,
    ).toBeGreaterThan(0);
  });
});
