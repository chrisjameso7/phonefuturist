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
   */
  sensorFormatDenominator?: number;

  resolutionMp?: number;

  /** 35 mm equivalent focal length. */
  equivalentFocalLengthMm?: number;

  /** Physical lens focal length, when actually known. */
  physicalFocalLengthMm?: number;

  apertureFNumber?: number;

  /**
   * Subject focus distance in metres. Used only for deterministic
   * depth-of-field geometry when focal length and aperture are known.
   */
  focusDistanceM?: number;

  /** Optional measured or reported complete module dimensions. */
  moduleWidthMm?: number;
  moduleHeightMm?: number;
  moduleDepthMm?: number;
}

export interface CalculatedCamera {
  type: CameraModuleType;

  approximateSensorDiagonalMm?: number;
  approximateSensorWidthMm?: number;
  approximateSensorHeightMm?: number;
  approximateSensorAreaMm2?: number;

  /**
   * Optical-format-derived crop factor against a 35 mm full-frame diagonal.
   * This is approximate because optical-format naming is approximate.
   */
  approximateCropFactor?: number;

  /**
   * Exact crop factor when both equivalent and physical focal lengths
   * are explicitly supplied.
   */
  cropFactor?: number;

  /**
   * Physical focal length used for geometry. Explicit input wins;
   * otherwise an approximate value can be derived from equivalent focal
   * length and the optical-format-derived crop factor.
   */
  effectivePhysicalFocalLengthMm?: number;
  physicalFocalLengthWasDerived?: boolean;

  /** Entrance pupil diameter = physical focal length / f-number. */
  entrancePupilDiameterMm?: number;
  entrancePupilAreaMm2?: number;

  /** Relative aperture throughput, proportional to 1 / N². */
  apertureThroughput?: number;

  /**
   * Geometric total-light proxy = approximate sensor area / N².
   * This is useful for relative comparison only. It excludes shutter time,
   * transmission losses, quantum efficiency, CFA, stabilization and processing.
   */
  geometricLightCaptureIndex?: number;

  /**
   * Estimated pixel pitch from approximate sensor area and resolution.
   * Assumes the active sensor follows the conventional 4:3 smartphone ratio.
   */
  approximatePixelPitchMicrons?: number;

  /**
   * Per-pixel geometric light proxy = estimated pixel area / N².
   * This is not a noise or image-quality score.
   */
  perPixelLightCaptureIndex?: number;

  /** 35 mm depth-of-field equivalence, approximately N × crop factor. */
  equivalentApertureFNumber?: number;

  horizontalFieldOfViewDeg?: number;
  verticalFieldOfViewDeg?: number;
  diagonalFieldOfViewDeg?: number;

  /**
   * Airy disk diameter at 550 nm, a visible-green reference wavelength.
   * Used only as a diffraction sampling indicator.
   */
  airyDiskDiameterMicrons?: number;
  airyDiskToPixelPitchRatio?: number;

  /**
   * F-number where the 550 nm Airy disk spans two native pixels.
   * This is a sampling reference, not a hard image-quality limit.
   */
  diffractionTwoPixelFNumber?: number;

  /**
   * Classical depth-of-field geometry using a full-frame-equivalent
   * 0.03 mm circle of confusion scaled by crop factor.
   */
  approximateCircleOfConfusionMm?: number;
  hyperfocalDistanceM?: number;
  focusNearLimitM?: number;
  focusFarLimitM?: number | 'infinity';
  totalDepthOfFieldM?: number | 'infinity';

  /**
   * Minimum front-face envelope implied by the approximate sensor
   * dimensions and entrance pupil. This is only a footprint sanity
   * check and does not model lens barrels, OIS travel or board routing.
   */
  minimumOpticalFootprintWidthMm?: number;
  minimumOpticalFootprintHeightMm?: number;
  opticalFootprintFitsModule?: boolean;

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
const FULL_FRAME_DIAGONAL_MM = Math.hypot(36, 24);
const DEFAULT_SENSOR_ASPECT_WIDTH = 4;
const DEFAULT_SENSOR_ASPECT_HEIGHT = 3;
const REFERENCE_WAVELENGTH_MM = 0.00055;

function isPositiveFinite(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function fieldOfViewDeg(sensorDimensionMm: number, focalLengthMm: number) {
  return (
    2 *
    Math.atan(sensorDimensionMm / (2 * focalLengthMm)) *
    (180 / Math.PI)
  );
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
      const diagonal =
        OPTICAL_FORMAT_REFERENCE_MM /
        input.sensorFormatDenominator;

      const aspectDiagonal = Math.hypot(
        DEFAULT_SENSOR_ASPECT_WIDTH,
        DEFAULT_SENSOR_ASPECT_HEIGHT,
      );

      const width =
        diagonal *
        (DEFAULT_SENSOR_ASPECT_WIDTH / aspectDiagonal);

      const height =
        diagonal *
        (DEFAULT_SENSOR_ASPECT_HEIGHT / aspectDiagonal);

      result.approximateSensorDiagonalMm = diagonal;
      result.approximateSensorWidthMm = width;
      result.approximateSensorHeightMm = height;
      result.approximateSensorAreaMm2 = width * height;
      result.approximateCropFactor =
        FULL_FRAME_DIAGONAL_MM / diagonal;

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

  let physicalFocalLength: number | undefined;

  if (
    input.physicalFocalLengthMm !== undefined &&
    isPositiveFinite(input.physicalFocalLengthMm)
  ) {
    physicalFocalLength = input.physicalFocalLengthMm;
    result.effectivePhysicalFocalLengthMm =
      physicalFocalLength;
    result.physicalFocalLengthWasDerived = false;
  } else if (
    input.equivalentFocalLengthMm !== undefined &&
    isPositiveFinite(input.equivalentFocalLengthMm) &&
    result.approximateCropFactor !== undefined
  ) {
    physicalFocalLength =
      input.equivalentFocalLengthMm /
      result.approximateCropFactor;

    result.effectivePhysicalFocalLengthMm =
      physicalFocalLength;
    result.physicalFocalLengthWasDerived = true;

  }

  if (
    input.apertureFNumber !== undefined &&
    !isPositiveFinite(input.apertureFNumber)
  ) {
    warnings.push({
      code: 'INVALID_APERTURE_INPUT',
      message:
        'Aperture f-number must be a positive finite value.',
    });
  }

  if (
    input.apertureFNumber !== undefined &&
    isPositiveFinite(input.apertureFNumber)
  ) {
    const n = input.apertureFNumber;

    result.apertureThroughput = 1 / (n * n);
    result.airyDiskDiameterMicrons =
      2.44 * REFERENCE_WAVELENGTH_MM * n * 1000;

    if (physicalFocalLength !== undefined) {
      result.entrancePupilDiameterMm =
        physicalFocalLength / n;

      result.entrancePupilAreaMm2 =
        Math.PI *
        Math.pow(
          result.entrancePupilDiameterMm / 2,
          2,
        );
    }

    if (result.approximateSensorAreaMm2 !== undefined) {
      result.geometricLightCaptureIndex =
        result.approximateSensorAreaMm2 /
        (n * n);
    }

    const crop =
      result.cropFactor ??
      result.approximateCropFactor;

    if (crop !== undefined) {
      result.equivalentApertureFNumber = n * crop;
    }
  }

  if (
    input.focusDistanceM !== undefined &&
    !isPositiveFinite(input.focusDistanceM)
  ) {
    warnings.push({
      code: 'INVALID_FOCUS_DISTANCE',
      message:
        'Focus distance must be a positive finite value in metres.',
    });
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

  if (
    input.resolutionMp !== undefined &&
    isPositiveFinite(input.resolutionMp) &&
    result.approximateSensorAreaMm2 !== undefined
  ) {
    // mm² / MP is numerically equal to µm² per pixel.
    const pixelAreaMicrons2 =
      result.approximateSensorAreaMm2 /
      input.resolutionMp;

    result.approximatePixelPitchMicrons =
      Math.sqrt(pixelAreaMicrons2);

    if (
      input.apertureFNumber !== undefined &&
      isPositiveFinite(input.apertureFNumber)
    ) {
      result.perPixelLightCaptureIndex =
        pixelAreaMicrons2 /
        Math.pow(input.apertureFNumber, 2);
    }

    if (
      result.airyDiskDiameterMicrons !== undefined &&
      result.approximatePixelPitchMicrons > 0
    ) {
      result.airyDiskToPixelPitchRatio =
        result.airyDiskDiameterMicrons /
        result.approximatePixelPitchMicrons;

      result.diffractionTwoPixelFNumber =
        (
          2 *
          result.approximatePixelPitchMicrons
        ) /
        (2.44 * 0.55);
    }
  }



  if (
    input.focusDistanceM !== undefined &&
    isPositiveFinite(input.focusDistanceM) &&
    input.apertureFNumber !== undefined &&
    isPositiveFinite(input.apertureFNumber) &&
    physicalFocalLength !== undefined
  ) {
    const crop =
      result.cropFactor ??
      result.approximateCropFactor;

    if (
      crop !== undefined &&
      Number.isFinite(crop) &&
      crop > 0
    ) {
      const cocMm = 0.03 / crop;
      const focalMm = physicalFocalLength;
      const focusMm = input.focusDistanceM * 1000;
      const n = input.apertureFNumber;

      const hyperfocalMm =
        (
          focalMm * focalMm
        ) /
          (n * cocMm) +
        focalMm;

      const nearMm =
        (
          hyperfocalMm *
          focusMm
        ) /
        (
          hyperfocalMm +
          (focusMm - focalMm)
        );

      const farDenominator =
        hyperfocalMm -
        (focusMm - focalMm);

      result.approximateCircleOfConfusionMm =
        cocMm;
      result.hyperfocalDistanceM =
        hyperfocalMm / 1000;
      result.focusNearLimitM =
        nearMm / 1000;

      if (farDenominator <= 0) {
        result.focusFarLimitM = 'infinity';
        result.totalDepthOfFieldM = 'infinity';
      } else {
        const farMm =
          (
            hyperfocalMm *
            focusMm
          ) /
          farDenominator;

        result.focusFarLimitM =
          farMm / 1000;
        result.totalDepthOfFieldM =
          Math.max(
            0,
            (farMm - nearMm) / 1000,
          );
      }
    }
  }

  if (
    input.apertureFNumber !== undefined &&
    input.equivalentFocalLengthMm !== undefined &&
    isPositiveFinite(input.apertureFNumber) &&
    isPositiveFinite(input.equivalentFocalLengthMm) &&
    input.equivalentFocalLengthMm >= 85 &&
    input.apertureFNumber < 1.8
  ) {
    warnings.push({
      code: 'AGGRESSIVE_TELEPHOTO_APERTURE',
      message:
        'A telephoto equivalent focal length of 85 mm or longer with an aperture faster than f/1.8 is an aggressive optical/package target. Verify lens diameter, module depth and mechanical feasibility.',
    });
  }

  if (
    result.diffractionTwoPixelFNumber !== undefined &&
    input.apertureFNumber !== undefined &&
    isPositiveFinite(input.apertureFNumber) &&
    input.apertureFNumber >
      result.diffractionTwoPixelFNumber
  ) {
    warnings.push({
      code: 'DIFFRACTION_BEYOND_TWO_PIXEL_SAMPLING',
      message:
        'At the 550 nm reference wavelength, the Airy disk spans more than two estimated native pixels. This is a sampling warning, not a hard resolution cutoff.',
    });
  }

  if (
    result.airyDiskToPixelPitchRatio !== undefined &&
    result.airyDiskToPixelPitchRatio >= 3
  ) {
    warnings.push({
      code: 'DIFFRACTION_SAMPLING_PRESSURE',
      message:
        'The reference-wavelength Airy disk is at least 3× the estimated pixel pitch. Extra native resolution may deliver diminishing optical detail before processing.',
    });
  }

  if (
    result.approximatePixelPitchMicrons !== undefined &&
    result.approximatePixelPitchMicrons < 0.6
  ) {
    warnings.push({
      code: 'VERY_SMALL_PIXEL_PITCH',
      message:
        'Estimated native pixel pitch is below 0.6 µm. Treat per-pixel light estimates cautiously because real sensors may rely heavily on binning and processing.',
    });
  }

  if (
    physicalFocalLength !== undefined &&
    result.approximateSensorWidthMm !== undefined &&
    result.approximateSensorHeightMm !== undefined &&
    result.approximateSensorDiagonalMm !== undefined
  ) {
    result.horizontalFieldOfViewDeg = fieldOfViewDeg(
      result.approximateSensorWidthMm,
      physicalFocalLength,
    );

    result.verticalFieldOfViewDeg = fieldOfViewDeg(
      result.approximateSensorHeightMm,
      physicalFocalLength,
    );

    result.diagonalFieldOfViewDeg = fieldOfViewDeg(
      result.approximateSensorDiagonalMm,
      physicalFocalLength,
    );
  }


  if (
    result.approximateSensorWidthMm !== undefined ||
    result.approximateSensorHeightMm !== undefined ||
    result.entrancePupilDiameterMm !== undefined
  ) {
    const requiredWidth = Math.max(
      result.approximateSensorWidthMm ?? 0,
      result.entrancePupilDiameterMm ?? 0,
    );

    const requiredHeight = Math.max(
      result.approximateSensorHeightMm ?? 0,
      result.entrancePupilDiameterMm ?? 0,
    );

    if (requiredWidth > 0) {
      result.minimumOpticalFootprintWidthMm =
        requiredWidth;
    }

    if (requiredHeight > 0) {
      result.minimumOpticalFootprintHeightMm =
        requiredHeight;
    }

    if (
      input.moduleWidthMm !== undefined &&
      input.moduleHeightMm !== undefined &&
      isPositiveFinite(input.moduleWidthMm) &&
      isPositiveFinite(input.moduleHeightMm) &&
      requiredWidth > 0 &&
      requiredHeight > 0
    ) {
      result.opticalFootprintFitsModule =
        input.moduleWidthMm >= requiredWidth &&
        input.moduleHeightMm >= requiredHeight;

      if (!result.opticalFootprintFitsModule) {
        warnings.push({
          code: 'CAMERA_OPTICAL_FOOTPRINT_EXCEEDS_MODULE',
          message:
            'The entered module width/height is smaller than the minimum front-face footprint implied by the approximate sensor dimensions or entrance pupil. The optical package is not physically plausible as entered.',
        });
      }
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

  return {
    result,
    warnings,
  };
}
