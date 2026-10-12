import type {
  BatteryPackInput,
  CalculatedBatteryPack,
} from './modules/battery';

import type {
  CalculatedCamera,
  CameraInput,
} from './modules/camera';

import type {
  CalculatedPackaging,
  PackagingInput,
} from './modules/packaging';

import type {
  SystemEfficiencyProfile,
} from './modules/system-efficiency';

export type DeviceFormFactor =
  | 'phone'
  | 'book_foldable'
  | 'flip_foldable'
  | 'tablet'
  | 'laptop'
  | 'wearable';

export type SimulationInputSource =
  | 'user'
  | 'phonefuturist'
  | 'reported'
  | 'confirmed'
  | 'estimated';

export interface SimulationValue<T> {
  value: T;
  source: SimulationInputSource;
}

export interface Dimensions {
  widthMm?: number;
  heightMm?: number;
  thicknessMm?: number;
  weightG?: number;
}

export interface DisplayInput {
  diagonalInches?: number;
  resolutionWidthPx?: number;
  resolutionHeightPx?: number;
  /** Logical resolution drawn by the GPU before panel scaling. */
  renderingWidthPx?: number;
  renderingHeightPx?: number;
  refreshRateHz?: number;

  /**
   * Physical display width:height ratio in the device's
   * current orientation.
   */
  aspectWidth?: number;
  aspectHeight?: number;

  bezelTopMm?: number;
  bezelRightMm?: number;
  bezelBottomMm?: number;
  bezelLeftMm?: number;
}

type PackagingComponentVolumes =
  NonNullable<PackagingInput['componentVolumes']>;

export interface SimulationPackagingInput {
  reservedVolumePercent?: number;

  /**
   * Battery and camera volumes are engine-owned when their
   * respective modules can calculate them.
   *
   * The high-level simulation input therefore accepts only
   * the remaining component-volume categories.
   */
  componentVolumes?: Omit<
    PackagingComponentVolumes,
    'batteryMm3' | 'cameraMm3'
  >;
}

export interface SimulationInput {
  formFactor: DeviceFormFactor;
  name?: string;

  dimensions?: Dimensions;

  displays: {
    primary: DisplayInput;
    cover?: DisplayInput;
  };

  battery?: BatteryPackInput;

  /**
   * Optional workload-specific software/system efficiency evidence.
   * Missing coefficients are neutral and never inferred from brand names.
   */
  systemEfficiency?: SystemEfficiencyProfile;

  /**
   * Any number of camera modules may be simulated.
   */
  cameras?: CameraInput[];

  /**
   * Optional packaging analysis.
   *
   * Device dimensions come automatically from dimensions.
   * Calculated battery and camera module volumes are supplied
   * automatically when those values are known.
   */
  packaging?: SimulationPackagingInput;
}

export interface CalculatedDisplay {
  renderingPixelCount?: number;
  nativePixelCount?: number;
  renderingPixelRatio?: number;
  widthMm?: number;
  heightMm?: number;
  areaMm2?: number;
  ppi?: number;
  aspectRatio?: number;

  estimatedDeviceWidthMm?: number;
  estimatedDeviceHeightMm?: number;

  screenToBodyRatio?: number;
}

export interface SimulationWarning {
  code: string;
  message: string;
}

export interface SimulationResult {
  /**
   * Set by the simulation engine itself.
   * Users cannot choose or override the engine version.
   */
  engineVersion: string;

  formFactor: DeviceFormFactor;

  displays: {
    primary: CalculatedDisplay;
    cover?: CalculatedDisplay;
  };

  battery?: CalculatedBatteryPack;

  cameras?: CalculatedCamera[];

  packaging?: CalculatedPackaging;

  warnings: SimulationWarning[];
}