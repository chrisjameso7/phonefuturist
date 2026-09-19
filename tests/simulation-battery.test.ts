import { describe, expect, it } from 'vitest';

import {
  calculateBatteryPack,
} from '../src/lib/simulation/modules/battery';

describe('battery simulation module', () => {
  it('calculates a single-cell battery pack correctly', () => {
    const calculation = calculateBatteryPack({
      cells: [
        {
          capacityMah: 5000,
          nominalVoltageV: 3.85,

          widthMm: 60,
          heightMm: 80,
          thicknessMm: 5,

          weightG: 70,
        },
      ],
    });

    const battery = calculation.result;
    const cell = battery.cells[0];

    expect(battery.cellCount).toBe(1);

    expect(cell.capacityMah).toBe(5000);
    expect(cell.energyWh).toBeCloseTo(19.25, 6);

    expect(cell.volumeMm3).toBe(24000);
    expect(cell.volumeCm3).toBe(24);

    expect(cell.volumetricEnergyDensityWhL).toBeCloseTo(
      802.083333,
      6,
    );

    expect(cell.gravimetricEnergyDensityWhKg).toBeCloseTo(
      275,
      6,
    );

    expect(battery.totalCapacityMah).toBe(5000);
    expect(battery.totalEnergyWh).toBeCloseTo(19.25, 6);

    expect(battery.totalVolumeMm3).toBe(24000);
    expect(battery.totalVolumeCm3).toBe(24);

    expect(battery.totalWeightG).toBe(70);

    expect(battery.volumetricEnergyDensityWhL).toBeCloseTo(
      802.083333,
      6,
    );

    expect(battery.gravimetricEnergyDensityWhKg).toBeCloseTo(
      275,
      6,
    );

    expect(calculation.warnings).toEqual([]);
  });

  it('calculates a dual-cell battery pack correctly', () => {
    const calculation = calculateBatteryPack({
      cells: [
        {
          capacityMah: 2500,
          nominalVoltageV: 3.85,

          widthMm: 50,
          heightMm: 60,
          thicknessMm: 5,

          weightG: 35,
        },
        {
          capacityMah: 2500,
          nominalVoltageV: 3.85,

          widthMm: 50,
          heightMm: 60,
          thicknessMm: 5,

          weightG: 35,
        },
      ],
    });

    const battery = calculation.result;

    expect(battery.cellCount).toBe(2);

    expect(battery.totalCapacityMah).toBe(5000);
    expect(battery.totalEnergyWh).toBeCloseTo(19.25, 6);

    expect(battery.totalVolumeMm3).toBe(30000);
    expect(battery.totalVolumeCm3).toBe(30);

    expect(battery.totalWeightG).toBe(70);

    expect(battery.volumetricEnergyDensityWhL).toBeCloseTo(
      641.666667,
      6,
    );

    expect(battery.gravimetricEnergyDensityWhKg).toBeCloseTo(
      275,
      6,
    );

    expect(calculation.warnings).toEqual([]);
  });

  it('does not invent pack totals when required values are missing', () => {
    const calculation = calculateBatteryPack({
      cells: [
        {
          capacityMah: 2500,
          nominalVoltageV: 3.85,
        },
        {
          nominalVoltageV: 3.85,
        },
      ],
    });

    const battery = calculation.result;

    expect(battery.cellCount).toBe(2);

    expect(battery.totalCapacityMah).toBeUndefined();
    expect(battery.totalEnergyWh).toBeUndefined();
    expect(battery.totalVolumeMm3).toBeUndefined();
    expect(battery.totalWeightG).toBeUndefined();
  });

  it('warns when battery dimensions are incomplete', () => {
    const calculation = calculateBatteryPack({
      cells: [
        {
          capacityMah: 5000,
          nominalVoltageV: 3.85,
          widthMm: 60,
          heightMm: 80,
        },
      ],
    });

    expect(
      calculation.result.cells[0].volumeMm3,
    ).toBeUndefined();

    expect(calculation.warnings).toContainEqual({
      code: 'INCOMPLETE_BATTERY_DIMENSIONS',
      message:
        'Battery cell 1 requires width, height, and thickness to calculate volume.',
    });
  });

  it('rejects an empty battery pack', () => {
    const calculation = calculateBatteryPack({
      cells: [],
    });

    expect(calculation.result).toEqual({
      cellCount: 0,
      cells: [],
    });

    expect(calculation.warnings).toEqual([
      {
        code: 'NO_BATTERY_CELLS',
        message:
          'At least one battery cell is required to calculate a battery pack.',
      },
    ]);
  });
});