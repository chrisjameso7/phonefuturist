import { describe, expect, it } from 'vitest';
import {
  buildCalibrationRegistry,
  clearCalibrationRegistryCache,
} from '../src/lib/simulation/modules/calibration-registry';
import {
  buildGeekerwanChargingEfficiencyRows,
} from '../src/lib/simulation/modules/geekerwan-charging-efficiency';

describe('Geekerwan charging efficiency pairing', () => {
  it('pairs Geekerwan cell energy and wall-input charging energy by canonical device', () => {
    clearCalibrationRegistryCache();

    const result =
      buildGeekerwanChargingEfficiencyRows(
        buildCalibrationRegistry(),
      );

    expect(
      result.pairedDeviceCount,
    ).toBeGreaterThanOrEqual(20);
  });

  it('pins Galaxy S26 Ultra end-to-end charging energy ratio', () => {
    clearCalibrationRegistryCache();

    const result =
      buildGeekerwanChargingEfficiencyRows(
        buildCalibrationRegistry(),
      );

    const row =
      result.rows.find(
        (candidate) =>
          candidate.model ===
          'Galaxy S26 Ultra',
      );

    expect(row).toBeDefined();

    expect(
      row?.batteryEnergyWh,
    ).toBeCloseTo(18.94, 8);

    expect(
      row?.wallInputEnergyWh,
    ).toBeCloseTo(23.47, 8);

    expect(
      row?.chargerPowerW,
    ).toBe(60);

    expect(
      row?.fullChargeMinutes,
    ).toBeCloseTo(68.1, 8);

    expect(
      row?.cellToWallEnergyRatio,
    ).toBeCloseTo(
      18.94 / 23.47,
      8,
    );

    expect(
      row?.averageChargerUtilizationPercent,
    ).toBeCloseTo(
      20.67 / 60 * 100,
      8,
    );
  });

  it('does not reinterpret wall-input Wh as battery Wh', () => {
    clearCalibrationRegistryCache();

    const result =
      buildGeekerwanChargingEfficiencyRows(
        buildCalibrationRegistry(),
      );

    const row =
      result.rows.find(
        (candidate) =>
          candidate.linkedDeviceIds.includes(
            'geekerwan-charge-oneplus-15',
          ),
      );

    expect(row).toBeDefined();

    expect(
      row?.wallInputEnergyWh,
    ).toBeGreaterThan(
      row?.batteryEnergyWh ?? Infinity,
    );
  });
});
