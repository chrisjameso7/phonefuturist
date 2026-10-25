import { simulateDevice } from './engine';
import {
  simulateLiveBatteryExperience,
} from './live-battery-experience';
import {
  simulateLiveCameraExperience,
} from './live-camera-experience';
import {
  simulateLiveDisplayExperience,
} from './live-display-experience';
import {
  expandSimpleMode,
  type SimpleModeInput,
} from './simple-mode';
import {
  estimateLiveSustainedPerformance,
} from './modules/sustained-performance-estimator';

export const SIMPLE_MODE_ENGINE_VERSION =
  'simple-mode-engine-0.1.0';

export interface SimpleModeResult {
  version: string;
  access: {
    phase: 'beta';
    paid: false;
    paywallRequired: false;
  };
  expansion: ReturnType<typeof expandSimpleMode>;
  device: ReturnType<typeof simulateDevice>;
  display: ReturnType<
    typeof simulateLiveDisplayExperience
  >;
  battery: ReturnType<
    typeof simulateLiveBatteryExperience
  >;
  cameras: Array<
    ReturnType<typeof simulateLiveCameraExperience>
  >;
  sustainedPerformance: ReturnType<
    typeof estimateLiveSustainedPerformance
  >;
  thermal: {
    status: 'advanced-only';
    reason: string;
  };
}

export function simulateSimpleMode(
  input: SimpleModeInput,
): SimpleModeResult {
  const expansion = expandSimpleMode(input);
  const simulation = expansion.simulationInput;

  const device = simulateDevice(simulation);

  const display =
    simulateLiveDisplayExperience({
      diagonalInches:
        simulation.displays.primary.diagonalInches,
      resolutionWidthPx:
        simulation.displays.primary.resolutionWidthPx,
      resolutionHeightPx:
        simulation.displays.primary.resolutionHeightPx,
      aspectWidth:
        simulation.displays.primary.aspectWidth,
      aspectHeight:
        simulation.displays.primary.aspectHeight,
      refreshRateHz:
        simulation.displays.primary.refreshRateHz,
    });

  const battery =
    simulateLiveBatteryExperience({
      simulation,
      brightnessNits: expansion.advanced.brightnessNits,
      manufacturer:
        expansion.advanced.manufacturer,
      socVendor:
        expansion.advanced.socVendor,
      socName:
        expansion.advanced.socName,
      batteryChemistry:
        expansion.advanced.batteryChemistry,
      wiredWatts:
        expansion.advanced.wiredChargingWatts,
      wirelessWatts:
        expansion.advanced.wirelessChargingWatts,
      wiredChargingStandard:
        expansion.advanced.chargingStandard,
      wirelessChargingStandard:
        expansion.advanced
          .wirelessChargingStandard,
      coolingClass:
        expansion.advanced.coolingClass,
    });

  const cameras = (
    simulation.cameras ?? []
  ).map((camera) =>
    simulateLiveCameraExperience({
      ...camera,
      manufacturer:
        expansion.advanced.manufacturer,
    }),
  );

  const sustainedPerformance =
    estimateLiveSustainedPerformance({
      domain: 'gpu_sustained',
      manufacturer:
        expansion.advanced.manufacturer,
      batteryMah:
        expansion.advanced.batteryMah,
      socVendor:
        expansion.advanced.socVendor,
      socName:
        expansion.advanced.socName,
      displayDiagonalInches:
        simulation.displays.primary
          .diagonalInches,
      refreshRateHz:
        simulation.displays.primary
          .refreshRateHz,
      thicknessMm:
        simulation.dimensions?.thicknessMm,
      weightG:
        simulation.dimensions?.weightG,
      coolingClass:
        expansion.advanced.coolingClass,
    });

  return {
    version: SIMPLE_MODE_ENGINE_VERSION,
    access: {
      phase: 'beta',
      paid: false,
      paywallRequired: false,
    },
    expansion,
    device,
    display,
    battery,
    cameras,
    sustainedPerformance,
    thermal: {
      status: 'advanced-only',
      reason:
        'Simple Mode does not invent thermal resistance, thermal mass or a throttle ceiling. Sustained performance may still resolve from measured comparable evidence, but package and surface temperatures remain unavailable until explicit physical thermal parameters are supplied.',
    },
  };
}
