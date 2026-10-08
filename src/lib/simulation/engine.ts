import type {
  SimulationInput,
  SimulationResult,
  SimulationWarning,
} from './types';

import { calculateBatteryPack } from './modules/battery';
import { calculateCamera } from './modules/camera';
import { calculateDisplay } from './modules/display';
import { calculatePackaging } from './modules/packaging';

export const SIMULATION_ENGINE_VERSION = '0.5.1';

/**
 * Runs a deterministic PhoneFuturist device simulation.
 *
 * The engine contains no device-specific assumptions.
 * It only executes calculations supported by supplied inputs.
 *
 * Missing inputs remain unknown rather than being estimated
 * automatically.
 *
 * Calculated outputs from one module may be passed into another
 * when the relationship is deterministic.
 */
export function simulateDevice(
  input: SimulationInput,
): SimulationResult {
  const warnings: SimulationWarning[] = [];

  const primaryDisplay = calculateDisplay(
    input.displays.primary,
    input.dimensions,
  );

  warnings.push(...primaryDisplay.warnings);

  let coverDisplay;

  if (input.displays.cover) {
    coverDisplay = calculateDisplay(
      input.displays.cover,
      input.dimensions,
    );

    warnings.push(...coverDisplay.warnings);
  }

  let battery;

  if (input.battery) {
    const batteryCalculation = calculateBatteryPack(
      input.battery,
    );

    battery = batteryCalculation.result;

    warnings.push(...batteryCalculation.warnings);
  }

  let cameras;

  if (input.cameras) {
    const cameraCalculations = input.cameras.map(
      (camera) => calculateCamera(camera),
    );

    cameras = cameraCalculations.map(
      (calculation) => calculation.result,
    );

    for (const calculation of cameraCalculations) {
      warnings.push(...calculation.warnings);
    }
  }

  let packaging;

  if (input.packaging) {
    const suppliedComponentVolumes =
      input.packaging.componentVolumes ?? {};

    const knownCameraVolumes =
      cameras
        ?.map((camera) => camera.moduleVolumeMm3)
        .filter(
          (volume): volume is number =>
            volume !== undefined,
        ) ?? [];

    const totalCameraVolumeMm3 =
      knownCameraVolumes.length > 0
        ? knownCameraVolumes.reduce(
            (total, volume) => total + volume,
            0,
          )
        : undefined;

    const componentVolumes = {
      ...suppliedComponentVolumes,

      ...(battery?.totalVolumeMm3 !== undefined
        ? {
            batteryMm3: battery.totalVolumeMm3,
          }
        : {}),

      ...(totalCameraVolumeMm3 !== undefined
        ? {
            cameraMm3: totalCameraVolumeMm3,
          }
        : {}),
    };

    const hasKnownComponentVolumes =
      Object.keys(componentVolumes).length > 0;

    const packagingCalculation = calculatePackaging({
      widthMm: input.dimensions?.widthMm,
      heightMm: input.dimensions?.heightMm,
      thicknessMm: input.dimensions?.thicknessMm,

      reservedVolumePercent:
        input.packaging.reservedVolumePercent,

      ...(hasKnownComponentVolumes
        ? { componentVolumes }
        : {}),
    });

    packaging = packagingCalculation.result;

    warnings.push(...packagingCalculation.warnings);
  }

  return {
    engineVersion: SIMULATION_ENGINE_VERSION,
    formFactor: input.formFactor,

    displays: {
      primary: primaryDisplay.result,

      ...(coverDisplay
        ? {
            cover: coverDisplay.result,
          }
        : {}),
    },

    ...(battery
      ? {
          battery,
        }
      : {}),

    ...(cameras
      ? {
          cameras,
        }
      : {}),

    ...(packaging
      ? {
          packaging,
        }
      : {}),

    warnings,
  };
}