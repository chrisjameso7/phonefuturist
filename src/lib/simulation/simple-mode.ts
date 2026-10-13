import type {
  DeviceFormFactor,
  SimulationInput,
} from './types';
import type { CameraInput } from './modules/camera';
import type { SocVendor } from './modules/device-variant';

export const SIMPLE_MODE_VERSION =
  'simple-mode-0.1.0';

export type SimpleResolutionPreset =
  | 'hd' | 'hd-plus' | 'fhd' | 'fhd-plus' | '1200p' | '1220p' | '1260p' | '1280p' | '1344p' | 'qhd' | 'qhd-plus' | '4k' | 'custom';

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
  renderingScalePercent?: 100 | 75 | 50;
  aspectRatioWidth?: number;
  aspectRatioHeight?: number;
  customResolutionWidthPx?: number;
  customResolutionHeightPx?: number;
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

const RESOLUTION_PRESETS: Record<Exclude<SimpleResolutionPreset, 'custom'>,
  { width: number; height: number; label: string }> = {
  hd: { width: 720, height: 1600, label: 'HD' },
  'hd-plus': { width: 720, height: 1650, label: 'HD+' },
  fhd: { width: 1080, height: 2400, label: 'FHD' },
  'fhd-plus': { width: 1080, height: 2520, label: 'FHD+' },
  '1200p': { width: 1200, height: 2640, label: '1200p' },
  '1220p': { width: 1220, height: 2712, label: '1220p / 1.5K' },
  '1260p': { width: 1260, height: 2800, label: '1260p' },
  '1280p': { width: 1280, height: 2856, label: '1280p' },
  '1344p': { width: 1344, height: 2992, label: '1344p' },
  qhd: { width: 1440, height: 3200, label: 'QHD' },
  'qhd-plus': { width: 1440, height: 3120, label: 'QHD+' },
  '4k': { width: 1644, height: 3840, label: '4K-class' },
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

  const resolution = input.displayResolution === 'custom'
    ? { width: input.customResolutionWidthPx ?? 0, height: input.customResolutionHeightPx ?? 0, label: 'Custom' }
    : RESOLUTION_PRESETS[input.displayResolution];
  if (!positive(resolution.width) || !positive(resolution.height)) {
    throw new Error('A custom display resolution requires positive width and height.');
  }

  const renderScale = input.renderingScalePercent ?? 100;
  if (![100, 75, 50].includes(renderScale)) {
    throw new Error('Rendering scale must be 100%, 75%, or 50%.');
  }

  if ((input.aspectRatioWidth !== undefined || input.aspectRatioHeight !== undefined) &&
      (!positive(input.aspectRatioWidth) || !positive(input.aspectRatioHeight))) {
    throw new Error('Both custom aspect ratio dimensions must be positive.');
  }
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
        renderingWidthPx: Math.max(1, Math.round(resolution.width * renderScale / 100)),
        renderingHeightPx: Math.max(1, Math.round(resolution.height * renderScale / 100)),
        refreshRateHz: input.refreshRateHz,
        aspectWidth: input.aspectRatioWidth ?? 9,
        aspectHeight: input.aspectRatioHeight ?? 20,
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
