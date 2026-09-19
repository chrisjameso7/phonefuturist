export type CameraModuleType =
  | 'wide'
  | 'ultrawide'
  | 'telephoto'
  | 'periscope'
  | 'front'
  | 'other';

export interface CameraInput {
  type: CameraModuleType;

  /**
   * Sensor optical format expressed as the denominator
   * of the conventional "1/x inch" sensor format.
   *
   * Examples:
   * 1/1.3" sensor -> 1.3
   * 1/2.55" sensor -> 2.55
   *
   * Optical format is historical terminology and is not
   * the sensor's literal physical diagonal.
   */
  sensorFormatDenominator?: number;

  resolutionMp?: number;

  /**
   * 35 mm equivalent focal length.
   */
  equivalentFocalLengthMm?: number;

  /**
   * Physical lens focal length, when actually known.
   */
  physicalFocalLengthMm?: number;

  apertureFNumber?: number;

  /**
   * Optional measured or reported complete module
   * dimensions.
   *
   * These are intentionally not inferred from sensor format.
   */
  moduleWidthMm?: number;
  moduleHeightMm?: number;
  moduleDepthMm?: number;
}

export interface CalculatedCamera {
  type: CameraModuleType;

  /**
   * Approximate physical sensor diagonal derived from
   * optical format.
   *
   * This is an optical-format approximation, not a claim
   * about exact manufacturer die dimensions.
   */
  approximateSensorDiagonalMm?: number;

  /**
   * Crop factor can only be calculated when both the
   * 35 mm equivalent focal length and physical focal
   * length are supplied.
   */
  cropFactor?: number;

  /**
   * Entrance pupil diameter:
   * physical focal length / f-number.
   */
  entrancePupilDiameterMm?: number;

  /**
   * Complete camera module bounding volume.
   *
   * Calculated only from explicitly supplied module
   * dimensions.
   */
  moduleVolumeMm3?: number;
  moduleVolumeCm3?: number;
}

export interface CameraWarning {
  code: string;
  message: string;
}

export interface CameraCalculation {
  result: CalculatedCamera;
  warnings: CameraWarning[];
}

const OPTICAL_FORMAT_REFERENCE_MM = 16;

function isPositiveFinite(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

export function calculateCamera(
  input: CameraInput,
): CameraCalculation {
  const result: CalculatedCamera = {
    type: input.type,
  };

  const warnings: CameraWarning[] = [];

  if (input.sensorFormatDenominator !== undefined) {
    if (isPositiveFinite(input.sensorFormatDenominator)) {
      result.approximateSensorDiagonalMm =
        OPTICAL_FORMAT_REFERENCE_MM /
        input.sensorFormatDenominator;
    } else {
      warnings.push({
        code: 'INVALID_SENSOR_FORMAT',
        message:
          'Sensor format denominator must be a positive finite value.',
      });
    }
  }

  const hasEquivalentFocalLength =
    input.equivalentFocalLengthMm !== undefined;

  const hasPhysicalFocalLength =
    input.physicalFocalLengthMm !== undefined;

  if (
    hasEquivalentFocalLength &&
    hasPhysicalFocalLength
  ) {
    if (
      isPositiveFinite(input.equivalentFocalLengthMm!) &&
      isPositiveFinite(input.physicalFocalLengthMm!)
    ) {
      result.cropFactor =
        input.equivalentFocalLengthMm! /
        input.physicalFocalLengthMm!;
    } else {
      warnings.push({
        code: 'INVALID_FOCAL_LENGTH',
        message:
          'Equivalent and physical focal lengths must be positive finite values.',
      });
    }
  }

  if (
    input.physicalFocalLengthMm !== undefined &&
    input.apertureFNumber !== undefined
  ) {
    if (
      isPositiveFinite(input.physicalFocalLengthMm) &&
      isPositiveFinite(input.apertureFNumber)
    ) {
      result.entrancePupilDiameterMm =
        input.physicalFocalLengthMm /
        input.apertureFNumber;
    } else {
      warnings.push({
        code: 'INVALID_APERTURE_INPUT',
        message:
          'Physical focal length and aperture f-number must be positive finite values.',
      });
    }
  }

  const hasAnyModuleDimension =
    input.moduleWidthMm !== undefined ||
    input.moduleHeightMm !== undefined ||
    input.moduleDepthMm !== undefined;

  const hasAllModuleDimensions =
    input.moduleWidthMm !== undefined &&
    input.moduleHeightMm !== undefined &&
    input.moduleDepthMm !== undefined;

  if (
    hasAnyModuleDimension &&
    !hasAllModuleDimensions
  ) {
    warnings.push({
      code: 'INCOMPLETE_CAMERA_MODULE_DIMENSIONS',
      message:
        'Camera module width, height, and depth are all required to calculate module volume.',
    });
  }

  if (hasAllModuleDimensions) {
    if (
      isPositiveFinite(input.moduleWidthMm!) &&
      isPositiveFinite(input.moduleHeightMm!) &&
      isPositiveFinite(input.moduleDepthMm!)
    ) {
      result.moduleVolumeMm3 =
        input.moduleWidthMm! *
        input.moduleHeightMm! *
        input.moduleDepthMm!;

      result.moduleVolumeCm3 =
        result.moduleVolumeMm3 / 1000;
    } else {
      warnings.push({
        code: 'INVALID_CAMERA_MODULE_DIMENSIONS',
        message:
          'Camera module dimensions must be positive finite values.',
      });
    }
  }

  if (
    input.resolutionMp !== undefined &&
    !isPositiveFinite(input.resolutionMp)
  ) {
    warnings.push({
      code: 'INVALID_CAMERA_RESOLUTION',
      message:
        'Camera resolution must be a positive finite value.',
    });
  }

  return {
    result,
    warnings,
  };
}