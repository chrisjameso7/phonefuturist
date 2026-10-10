import type {
  DeviceFormFactor,
  SimulationInput,
} from './types';
import type { CameraInput } from './modules/camera';
import type { SocVendor } from './modules/device-variant';

export const SIMPLE_MODE_VERSION =
  'simple-mode-0.1.0';

export type SimpleResolutionPreset =
  | 'fhd'
  | 'qhd';

export type SimpleCoolingPreset =
  | 'basic'
  | 'good'
  | 'large-vc'
  | 'active';

export interface SimpleModeInput {
  name?: string;
  manufacturer?: string;
  formFactor?: Extract<DeviceFormFactor, 'phone'>;

  batteryMah: number;
  wiredChargingWatts?: number;
  wirelessChargingWatts?: number;
  batteryChemistry?: string;
  chargingStandard?: string;
  wirelessChargingStandard?: string;

  displayDiagonalInches: number;
  displayResolution: SimpleResolutionPreset;
  refreshRateHz: number;

  socVendor?: SocVendor;
  socName?: string;
  cooling: SimpleCoolingPreset;

  mainCamera?: {
    sensorFormatDenominator?: number;
    resolutionMp?: number;
    apertureFNumber?: number;
    equivalentFocalLengthMm?: number;
  };

  telephoto?: {
    enabled: boolean;
    sensorFormatDenominator?: number;
    resolutionMp?: number;
    apertureFNumber?: number;
    equivalentFocalLengthMm?: number;
  };

  dimensions?: {
    widthMm?: number;
    heightMm?: number;
    thicknessMm?: number;
    weightG?: number;
  };
}

export interface SimpleModeAssumption {
  code:
    | 'DISPLAY_RESOLUTION_PRESET'
    | 'DISPLAY_ASPECT_PRESET'
    | 'COOLING_CLASS_MAPPING';
  message: string;
}

export interface SimpleModeExpansion {
  version: string;
  simulationInput: SimulationInput;
  advanced: {
    manufacturer?: string;
    batteryMah: number;
    wiredChargingWatts?: number;
    wirelessChargingWatts?: number;
    batteryChemistry?: string;
    chargingStandard?: string;
    wirelessChargingStandard?: string;
    socVendor?: SocVendor;
    socName?: string;
    coolingClass:
      | 'passive-graphite'
      | 'vapor-chamber'
      | 'large-vapor-chamber'
      | 'active-fan';
  };
  assumptions: SimpleModeAssumption[];
}

const RESOLUTION_PRESETS: Record<
  SimpleResolutionPreset,
  { width: number; height: number; label: string }
> = {
  fhd: {
    width: 1080,
    height: 2400,
    label: '1080-class',
  },
  qhd: {
    width: 1440,
    height: 3200,
    label: '1440-class',
  },
};

const COOLING_PRESETS: Record<
  SimpleCoolingPreset,
  SimpleModeExpansion['advanced']['coolingClass']
> = {
  basic: 'passive-graphite',
  good: 'vapor-chamber',
  'large-vc': 'large-vapor-chamber',
  active: 'active-fan',
};

function positive(value: number | undefined) {
  return (
    value !== undefined &&
    Number.isFinite(value) &&
    value > 0
  );
}

function cameraFromSimple(
  type: CameraInput['type'],
  input:
    | SimpleModeInput['mainCamera']
    | SimpleModeInput['telephoto'],
): CameraInput | undefined {
  if (!input) return undefined;

  const camera: CameraInput = { type };

  if (positive(input.sensorFormatDenominator)) {
    camera.sensorFormatDenominator =
      input.sensorFormatDenominator;
  }

  if (positive(input.resolutionMp)) {
    camera.resolutionMp = input.resolutionMp;
  }

  if (positive(input.apertureFNumber)) {
    camera.apertureFNumber =
      input.apertureFNumber;
  }

  if (positive(input.equivalentFocalLengthMm)) {
    camera.equivalentFocalLengthMm =
      input.equivalentFocalLengthMm;
  }

  return Object.keys(camera).length > 1
    ? camera
    : undefined;
}

export function expandSimpleMode(
  input: SimpleModeInput,
): SimpleModeExpansion {
  if (!positive(input.batteryMah)) {
    throw new Error(
      'Simple Mode battery capacity must be positive.',
    );
  }

  if (!positive(input.displayDiagonalInches)) {
    throw new Error(
      'Simple Mode display size must be positive.',
    );
  }

  if (!positive(input.refreshRateHz)) {
    throw new Error(
      'Simple Mode refresh rate must be positive.',
    );
  }

  const resolution =
    RESOLUTION_PRESETS[input.displayResolution];

  const cameras: CameraInput[] = [];

  const main = cameraFromSimple(
    'wide',
    input.mainCamera,
  );

  if (main) {
    cameras.push(main);
  }

  if (input.telephoto?.enabled) {
    const telephoto = cameraFromSimple(
      'telephoto',
      input.telephoto,
    );

    if (telephoto) {
      cameras.push(telephoto);
    }
  }

  const simulationInput: SimulationInput = {
    formFactor: input.formFactor ?? 'phone',
    ...(input.name ? { name: input.name } : {}),
    ...(input.dimensions
      ? { dimensions: input.dimensions }
      : {}),
    displays: {
      primary: {
        diagonalInches:
          input.displayDiagonalInches,
        resolutionWidthPx: resolution.width,
        resolutionHeightPx: resolution.height,
        refreshRateHz: input.refreshRateHz,
        aspectWidth: 9,
        aspectHeight: 20,
      },
    },
    battery: {
      cells: [
        {
          capacityMah: input.batteryMah,
        },
      ],
    },
    ...(cameras.length ? { cameras } : {}),
    ...(input.dimensions
      ? {
          packaging: {
            reservedVolumePercent: 20,
          },
        }
      : {}),
  };

  return {
    version: SIMPLE_MODE_VERSION,
    simulationInput,
    advanced: {
      ...(input.manufacturer
        ? { manufacturer: input.manufacturer }
        : {}),
      batteryMah: input.batteryMah,
      ...(positive(input.wiredChargingWatts)
        ? {
            wiredChargingWatts:
              input.wiredChargingWatts,
          }
        : {}),
      ...(positive(input.wirelessChargingWatts)
        ? {
            wirelessChargingWatts:
              input.wirelessChargingWatts,
          }
        : {}),
      ...(input.batteryChemistry
        ? {
            batteryChemistry:
              input.batteryChemistry,
          }
        : {}),
      ...(input.chargingStandard
        ? {
            chargingStandard:
              input.chargingStandard,
          }
        : {}),
      ...(input.wirelessChargingStandard
        ? {
            wirelessChargingStandard:
              input.wirelessChargingStandard,
          }
        : {}),
      ...(input.socVendor
        ? { socVendor: input.socVendor }
        : {}),
      ...(input.socName
        ? { socName: input.socName }
        : {}),
      coolingClass:
        COOLING_PRESETS[input.cooling],
    },
    assumptions: [
      {
        code: 'DISPLAY_RESOLUTION_PRESET',
        message:
          `${resolution.label} maps to ${resolution.width}×${resolution.height} for Simple Mode. This is a workload preset, not a claim about the exact panel resolution.`,
      },
      {
        code: 'DISPLAY_ASPECT_PRESET',
        message:
          'Simple Mode uses a 20:9 display aspect preset unless exact geometry is entered in Advanced Lab.',
      },
      {
        code: 'COOLING_CLASS_MAPPING',
        message:
          `Cooling preset "${input.cooling}" maps to the "${COOLING_PRESETS[input.cooling]}" engineering class. Thermal resistance and thermal mass remain unknown until supplied or calibrated.`,
      },
    ],
  };
}
