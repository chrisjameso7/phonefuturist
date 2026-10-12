import { describe, expect, it } from 'vitest';
import {
  buildCalibrationRegistry,
  clearCalibrationRegistryCache,
} from '../src/lib/simulation/modules/calibration-registry';
import {
  estimateGeekerwanBatteryLife,
} from '../src/lib/simulation/modules/geekerwan-battery-estimator';

describe('Geekerwan Smartphone 5.0 battery estimator', () => {
  it('uses only the Geekerwan 5.0 cohort and resolves a modern Snapdragon target', () => {
    clearCalibrationRegistryCache();
    const corpus =
      buildCalibrationRegistry();

    const result =
      estimateGeekerwanBatteryLife(
        corpus,
        {
          batteryMah: 5700,
          batteryEnergyWh: 21.5,
          manufacturer: 'Samsung',
          socVendor: 'Qualcomm',
          socName:
            'Snapdragon 8 Elite Gen 5 for Galaxy',
        },
      );

    expect(result.status).toBe(
      'resolved',
    );
    expect(
      result.referenceCount,
    ).toBeGreaterThan(0);
    expect(
      result.expectedHours,
    ).toBeGreaterThan(0);
    expect(
      result.sourceIds,
    ).toEqual([
      'geekerwan-battery-results-2026',
    ]);
  });

  it('contains the full live Geekerwan Battery Life 5.0 cohort', () => {
    clearCalibrationRegistryCache();
    const corpus =
      buildCalibrationRegistry();

    const rows =
      corpus.measurements.filter(
        (measurement) =>
          measurement.metric ===
          'geekerwan_battery_life_5_0_hours',
      );

    expect(rows).toHaveLength(80);
    expect(
      new Set(
        rows.map(
          (row) =>
            row.deviceVariantId,
        ),
      ).size,
    ).toBe(80);
  });

  it('does not mix PhoneArena or GSMArena battery protocols into the Geekerwan estimate', () => {
    clearCalibrationRegistryCache();
    const corpus =
      buildCalibrationRegistry();

    const result =
      estimateGeekerwanBatteryLife(
        corpus,
        {
          batteryMah: 7000,
          socVendor: 'Qualcomm',
          socName:
            'Snapdragon 8 Elite Gen 5',
        },
      );

    expect(result.status).toBe(
      'resolved',
    );

    expect(
      result.sourceIds.every(
        (sourceId) =>
          sourceId ===
          'geekerwan-battery-results-2026',
      ),
    ).toBe(true);
  });
});
