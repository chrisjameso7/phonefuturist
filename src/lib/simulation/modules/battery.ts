export interface BatteryCellInput {
  capacityMah?: number;
  nominalVoltageV?: number;

  widthMm?: number;
  heightMm?: number;
  thicknessMm?: number;

  weightG?: number;
}

export interface BatteryPackInput {
  cells: BatteryCellInput[];
}

export interface CalculatedBatteryCell {
  capacityMah?: number;
  energyWh?: number;

  volumeMm3?: number;
  volumeCm3?: number;

  volumetricEnergyDensityWhL?: number;
  gravimetricEnergyDensityWhKg?: number;
}

export interface CalculatedBatteryPack {
  cellCount: number;

  totalCapacityMah?: number;
  totalEnergyWh?: number;

  totalVolumeMm3?: number;
  totalVolumeCm3?: number;

  totalWeightG?: number;

  volumetricEnergyDensityWhL?: number;
  gravimetricEnergyDensityWhKg?: number;

  cells: CalculatedBatteryCell[];
}

export interface BatteryWarning {
  code: string;
  message: string;
}

export interface BatteryCalculation {
  result: CalculatedBatteryPack;
  warnings: BatteryWarning[];
}

function isPositiveFinite(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function calculateCell(
  input: BatteryCellInput,
  index: number,
): {
  result: CalculatedBatteryCell;
  warnings: BatteryWarning[];
} {
  const result: CalculatedBatteryCell = {};
  const warnings: BatteryWarning[] = [];

  if (input.capacityMah !== undefined) {
    if (isPositiveFinite(input.capacityMah)) {
      result.capacityMah = input.capacityMah;
    } else {
      warnings.push({
        code: 'INVALID_BATTERY_CAPACITY',
        message: `Battery cell ${index + 1} capacity must be a positive finite value.`,
      });
    }
  }

  if (
    input.capacityMah !== undefined &&
    input.nominalVoltageV !== undefined
  ) {
    if (
      isPositiveFinite(input.capacityMah) &&
      isPositiveFinite(input.nominalVoltageV)
    ) {
      result.energyWh =
        (input.capacityMah * input.nominalVoltageV) / 1000;
    } else {
      warnings.push({
        code: 'INVALID_BATTERY_ENERGY_INPUT',
        message: `Battery cell ${index + 1} capacity and nominal voltage must be positive finite values.`,
      });
    }
  }

  const hasAnyDimension =
    input.widthMm !== undefined ||
    input.heightMm !== undefined ||
    input.thicknessMm !== undefined;

  const hasAllDimensions =
    input.widthMm !== undefined &&
    input.heightMm !== undefined &&
    input.thicknessMm !== undefined;

  if (hasAnyDimension && !hasAllDimensions) {
    warnings.push({
      code: 'INCOMPLETE_BATTERY_DIMENSIONS',
      message: `Battery cell ${index + 1} requires width, height, and thickness to calculate volume.`,
    });
  }

  if (hasAllDimensions) {
    if (
      isPositiveFinite(input.widthMm!) &&
      isPositiveFinite(input.heightMm!) &&
      isPositiveFinite(input.thicknessMm!)
    ) {
      result.volumeMm3 =
        input.widthMm! *
        input.heightMm! *
        input.thicknessMm!;

      result.volumeCm3 = result.volumeMm3 / 1000;
    } else {
      warnings.push({
        code: 'INVALID_BATTERY_DIMENSIONS',
        message: `Battery cell ${index + 1} dimensions must be positive finite values.`,
      });
    }
  }

  if (
    result.energyWh !== undefined &&
    result.volumeCm3 !== undefined
  ) {
    // 1 litre = 1000 cm³.
    result.volumetricEnergyDensityWhL =
      (result.energyWh / result.volumeCm3) * 1000;
  }

  if (input.weightG !== undefined) {
    if (isPositiveFinite(input.weightG)) {
      if (result.energyWh !== undefined) {
        // Wh / grams × 1000 = Wh/kg.
        result.gravimetricEnergyDensityWhKg =
          (result.energyWh / input.weightG) * 1000;
      }
    } else {
      warnings.push({
        code: 'INVALID_BATTERY_WEIGHT',
        message: `Battery cell ${index + 1} weight must be a positive finite value.`,
      });
    }
  }

  return {
    result,
    warnings,
  };
}

export function calculateBatteryPack(
  input: BatteryPackInput,
): BatteryCalculation {
  const warnings: BatteryWarning[] = [];

  if (input.cells.length === 0) {
    return {
      result: {
        cellCount: 0,
        cells: [],
      },
      warnings: [
        {
          code: 'NO_BATTERY_CELLS',
          message:
            'At least one battery cell is required to calculate a battery pack.',
        },
      ],
    };
  }

  const calculatedCells = input.cells.map((cell, index) =>
    calculateCell(cell, index),
  );

  for (const cell of calculatedCells) {
    warnings.push(...cell.warnings);
  }

  const cells = calculatedCells.map((cell) => cell.result);

  const result: CalculatedBatteryPack = {
    cellCount: cells.length,
    cells,
  };

  if (cells.every((cell) => cell.capacityMah !== undefined)) {
    result.totalCapacityMah = cells.reduce(
      (total, cell) => total + cell.capacityMah!,
      0,
    );
  }

  if (cells.every((cell) => cell.energyWh !== undefined)) {
    result.totalEnergyWh = cells.reduce(
      (total, cell) => total + cell.energyWh!,
      0,
    );
  }

  if (cells.every((cell) => cell.volumeMm3 !== undefined)) {
    result.totalVolumeMm3 = cells.reduce(
      (total, cell) => total + cell.volumeMm3!,
      0,
    );

    result.totalVolumeCm3 = result.totalVolumeMm3 / 1000;
  }

  const allWeightsKnown = input.cells.every(
    (cell) =>
      cell.weightG !== undefined &&
      isPositiveFinite(cell.weightG),
  );

  if (allWeightsKnown) {
    result.totalWeightG = input.cells.reduce(
      (total, cell) => total + cell.weightG!,
      0,
    );
  }

  if (
    result.totalEnergyWh !== undefined &&
    result.totalVolumeCm3 !== undefined
  ) {
    result.volumetricEnergyDensityWhL =
      (result.totalEnergyWh / result.totalVolumeCm3) * 1000;
  }

  if (
    result.totalEnergyWh !== undefined &&
    result.totalWeightG !== undefined
  ) {
    result.gravimetricEnergyDensityWhKg =
      (result.totalEnergyWh / result.totalWeightG) * 1000;
  }

  return {
    result,
    warnings,
  };
}