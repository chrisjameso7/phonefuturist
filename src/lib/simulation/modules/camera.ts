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

  /**
   * Exact active sensor dimensions when known. When both are valid they
   * override optical-format-derived geometry for area, pixel pitch, FOV and
   * light-capture calculations.
   */
  sensorWidthMm?: number;
  sensorHeightMm?: number;

  resolutionMp?: number;

  /** 35 mm equivalent focal length. */
  equivalentFocalLengthMm?: number;

  /** Physical lens focal length, when actually known. */
  physicalFocalLengthMm?: number;

  apertureFNumber?: number;

  /**
   * Actual exposure time for a single captured frame in seconds.
   * This affects photons collected, unlike ISO/gain which only amplifies
   * the captured signal.
   */
  exposureTimeSeconds?: number;

  /**
   * Full-frame sensor readout time in seconds. This drives rolling-shutter
   * skew and is deliberately separate from exposure time.
   */
  sensorReadoutTimeSeconds?: number;

  /**
   * Optional video frame rate. Used only to compare exposure/readout against
   * the frame interval. It does not imply a shutter time.
   */
  videoFrameRateFps?: number;

  /**
   * Apparent subject angular motion across the camera view in degrees/second.
   * Used for deterministic subject-motion blur during the exposure window.
   */
  subjectAngularSpeedDegPerSecond?: number;

  /**
   * Camera angular motion in degrees/second during capture.
   * Used separately from subject motion.
   */
  cameraAngularShakeDegPerSecond?: number;

  /**
   * Fraction of camera angular shake compensated by OIS, from 0 to 1.
   * This never reduces subject-motion blur.
   */
  oisAngularCompensationFraction?: number;

  /**
   * Fraction of incident light transmitted through the complete lens stack.
   * 1.0 means 100% transmission. Leave unknown rather than guessing.
   */
  lensTransmissionFraction?: number;

  /**
   * Approximate sensor quantum efficiency as a 0-1 fraction when measured or
   * credibly reported. This converts an optical exposure proxy into a
   * photoelectron-capture proxy. It is never inferred from brand or sensor name.
   */
  quantumEfficiencyFraction?: number;

  /**
   * Linear pixel-binning factor. 2 means 2x2 binning, 4 means 4x4.
   * Total sensor light is unchanged, while light represented by one output
   * sample rises with the square of the factor under idealized binning.
   */
  binningLinearFactor?: number;

  /**
   * Centre-crop zoom ratio applied after capture. 1 means no crop, 2 means
   * the linear sensor dimensions are halved and the retained sensor area is
   * one quarter. This is deterministic crop geometry, not AI upscaling.
   */
  cropZoomRatio?: number;

  /**
   * Optional output-resolution floor used to judge whether a sensor crop can
   * still meet the requested output resolution without upscaling.
   */
  targetOutputResolutionMp?: number;

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

  /** Active sensor geometry actually used by deterministic calculations. */
  activeSensorDiagonalMm?: number;
  activeSensorWidthMm?: number;
  activeSensorHeightMm?: number;
  activeSensorAreaMm2?: number;
  sensorGeometrySource?:
    | 'exact-dimensions'
    | 'optical-format-approximation';
  activeSensorCropFactor?: number;

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
   * Exposure-aware aperture throughput = (1 / N²) × shutter time × lens
   * transmission, when those values are supplied. This remains a relative
   * optical exposure proxy because scene illuminance is not known.
   */
  exposureThroughput?: number;

  /**
   * Geometric total-light proxy = approximate sensor area / N².
   * This is useful for relative comparison only. It excludes shutter time,
   * transmission losses, quantum efficiency, CFA, stabilization and processing.
   */
  geometricLightCaptureIndex?: number;

  /**
   * Exposure-aware total sensor light proxy. This multiplies the geometric
   * light-capture index by exposure time and lens transmission when available.
   * It does not assume ISO changes photon capture.
   */
  exposureLightCaptureIndex?: number;

  /**
   * Exposure-aware photoelectron proxy. Only emitted when quantum efficiency
   * is explicitly supplied.
   */
  photoelectronCaptureIndex?: number;

  /** Video frame interval = 1 / FPS when FPS is explicitly supplied. */
  videoFrameIntervalSeconds?: number;

  /** Sensor readout as a fraction of one video frame interval. */
  readoutFractionOfFrame?: number;

  /** Subject-motion image displacement during exposure, in native pixels. */
  subjectMotionBlurPixels?: number;

  /** Camera-shake image displacement during exposure before OIS, in pixels. */
  cameraShakeBlurPixelsBeforeOis?: number;

  /** Camera-shake image displacement after explicit OIS compensation. */
  cameraShakeBlurPixelsAfterOis?: number;

  /** Rolling-shutter image skew from camera angular motion, in native pixels. */
  rollingShutterCameraSkewPixels?: number;

  /** Rolling-shutter image skew from subject angular motion, in native pixels. */
  rollingShutterSubjectSkewPixels?: number;

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

  /** Exposure-aware native-pixel optical capture proxy. */
  nativePixelExposureIndex?: number;

  /** Exposure/QE-aware native-pixel photoelectron proxy. */
  nativePixelPhotoelectronIndex?: number;

  /** Effective output-pixel pitch after idealized square binning. */
  effectiveBinnedPixelPitchMicrons?: number;

  /** Effective output resolution after idealized square binning. */
  effectiveBinnedResolutionMp?: number;

  /**
   * Exposure-aware light represented by one binned output sample. Under the
   * idealized model this is nativePixelExposureIndex × binningFactor².
   */
  binnedOutputPixelExposureIndex?: number;

  /** QE-aware binned output sample photoelectron proxy. */
  binnedOutputPixelPhotoelectronIndex?: number;

  /** Source resolution available to crop after optional binning. */
  cropSourceResolutionMp?: number;

  /** Effective equivalent focal length after deterministic centre crop. */
  croppedEquivalentFocalLengthMm?: number;

  /** Resolution remaining after deterministic centre crop. */
  croppedResolutionMp?: number;

  /** Approximate physical sensor area retained after crop. */
  croppedSensorAreaMm2?: number;

  /**
   * Exposure-aware total-light proxy for only the retained crop region.
   * Per-pixel exposure is unchanged by cropping; total retained image-area
   * light falls with crop area.
   */
  croppedExposureLightCaptureIndex?: number;

  /** Total retained-light loss from cropping, expressed in stops. */
  cropTotalLightLossStops?: number;

  /**
   * Maximum deterministic crop zoom that still meets targetOutputResolutionMp
   * without upscaling, when both source and target resolution are known.
   */
  maxNativeCropZoomForTargetResolution?: number;
  cropMeetsTargetResolution?: boolean;

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

  const hasExactSensorDimensions =
    input.sensorWidthMm !== undefined ||
    input.sensorHeightMm !== undefined;

  if (hasExactSensorDimensions) {
    if (
      input.sensorWidthMm !== undefined &&
      input.sensorHeightMm !== undefined &&
      isPositiveFinite(input.sensorWidthMm) &&
      isPositiveFinite(input.sensorHeightMm)
    ) {
      result.activeSensorWidthMm =
        input.sensorWidthMm;
      result.activeSensorHeightMm =
        input.sensorHeightMm;
      result.activeSensorDiagonalMm =
        Math.hypot(
          input.sensorWidthMm,
          input.sensorHeightMm,
        );
      result.activeSensorAreaMm2 =
        input.sensorWidthMm *
        input.sensorHeightMm;
      result.activeSensorCropFactor =
        FULL_FRAME_DIAGONAL_MM /
        result.activeSensorDiagonalMm;
      result.sensorGeometrySource =
        'exact-dimensions';
    } else {
      warnings.push({
        code: 'INVALID_EXACT_SENSOR_DIMENSIONS',
        message:
          'Exact sensor width and height must both be positive finite values.',
      });
    }
  }

  if (
    result.sensorGeometrySource === undefined &&
    result.approximateSensorWidthMm !== undefined &&
    result.approximateSensorHeightMm !== undefined &&
    result.approximateSensorDiagonalMm !== undefined &&
    result.approximateSensorAreaMm2 !== undefined
  ) {
    result.activeSensorWidthMm =
      result.approximateSensorWidthMm;
    result.activeSensorHeightMm =
      result.approximateSensorHeightMm;
    result.activeSensorDiagonalMm =
      result.approximateSensorDiagonalMm;
    result.activeSensorAreaMm2 =
      result.approximateSensorAreaMm2;
    result.activeSensorCropFactor =
      result.approximateCropFactor;
    result.sensorGeometrySource =
      'optical-format-approximation';
  }

  const sensorWidth =
    result.activeSensorWidthMm;
  const sensorHeight =
    result.activeSensorHeightMm;
  const sensorDiagonal =
    result.activeSensorDiagonalMm;
  const sensorArea =
    result.activeSensorAreaMm2;
  const sensorCrop =
    result.activeSensorCropFactor;

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
    sensorCrop !== undefined
  ) {
    physicalFocalLength =
      input.equivalentFocalLengthMm /
      sensorCrop;

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
    input.exposureTimeSeconds !== undefined &&
    !isPositiveFinite(input.exposureTimeSeconds)
  ) {
    warnings.push({
      code: 'INVALID_EXPOSURE_TIME',
      message:
        'Exposure time must be a positive finite value in seconds.',
    });
  }

  if (
    input.sensorReadoutTimeSeconds !== undefined &&
    !isPositiveFinite(input.sensorReadoutTimeSeconds)
  ) {
    warnings.push({
      code: 'INVALID_SENSOR_READOUT_TIME',
      message:
        'Sensor readout time must be a positive finite value in seconds.',
    });
  }

  if (
    input.videoFrameRateFps !== undefined &&
    !isPositiveFinite(input.videoFrameRateFps)
  ) {
    warnings.push({
      code: 'INVALID_VIDEO_FRAME_RATE',
      message:
        'Video frame rate must be a positive finite value in frames per second.',
    });
  }

  for (const [value, code, label] of [
    [
      input.subjectAngularSpeedDegPerSecond,
      'INVALID_SUBJECT_ANGULAR_SPEED',
      'Subject angular speed',
    ],
    [
      input.cameraAngularShakeDegPerSecond,
      'INVALID_CAMERA_ANGULAR_SHAKE',
      'Camera angular shake',
    ],
  ] as const) {
    if (
      value !== undefined &&
      (!Number.isFinite(value) || value < 0)
    ) {
      warnings.push({
        code,
        message:
          `${label} must be a finite value greater than or equal to 0 degrees/second.`,
      });
    }
  }

  if (
    input.oisAngularCompensationFraction !== undefined &&
    (
      !Number.isFinite(
        input.oisAngularCompensationFraction,
      ) ||
      input.oisAngularCompensationFraction < 0 ||
      input.oisAngularCompensationFraction > 1
    )
  ) {
    warnings.push({
      code: 'INVALID_OIS_COMPENSATION',
      message:
        'OIS angular compensation fraction must be between 0 and 1.',
    });
  }

  if (
    input.lensTransmissionFraction !== undefined &&
    (!Number.isFinite(input.lensTransmissionFraction) ||
      input.lensTransmissionFraction <= 0 ||
      input.lensTransmissionFraction > 1)
  ) {
    warnings.push({
      code: 'INVALID_LENS_TRANSMISSION',
      message:
        'Lens transmission fraction must be greater than 0 and at most 1.',
    });
  }

  if (
    input.quantumEfficiencyFraction !== undefined &&
    (!Number.isFinite(input.quantumEfficiencyFraction) ||
      input.quantumEfficiencyFraction <= 0 ||
      input.quantumEfficiencyFraction > 1)
  ) {
    warnings.push({
      code: 'INVALID_QUANTUM_EFFICIENCY',
      message:
        'Quantum efficiency fraction must be greater than 0 and at most 1.',
    });
  }

  if (
    input.binningLinearFactor !== undefined &&
    (!Number.isFinite(input.binningLinearFactor) ||
      input.binningLinearFactor < 1 ||
      !Number.isInteger(input.binningLinearFactor))
  ) {
    warnings.push({
      code: 'INVALID_BINNING_FACTOR',
      message:
        'Binning linear factor must be an integer greater than or equal to 1.',
    });
  }

  if (
    input.cropZoomRatio !== undefined &&
    (!Number.isFinite(input.cropZoomRatio) ||
      input.cropZoomRatio < 1)
  ) {
    warnings.push({
      code: 'INVALID_CROP_ZOOM',
      message:
        'Crop zoom ratio must be a finite value greater than or equal to 1.',
    });
  }

  if (
    input.targetOutputResolutionMp !== undefined &&
    !isPositiveFinite(input.targetOutputResolutionMp)
  ) {
    warnings.push({
      code: 'INVALID_TARGET_OUTPUT_RESOLUTION',
      message:
        'Target output resolution must be a positive finite megapixel value.',
    });
  }

  if (
    input.videoFrameRateFps !== undefined &&
    isPositiveFinite(input.videoFrameRateFps)
  ) {
    result.videoFrameIntervalSeconds =
      1 / input.videoFrameRateFps;

    if (
      input.sensorReadoutTimeSeconds !== undefined &&
      isPositiveFinite(input.sensorReadoutTimeSeconds)
    ) {
      result.readoutFractionOfFrame =
        input.sensorReadoutTimeSeconds /
        result.videoFrameIntervalSeconds;

      if (result.readoutFractionOfFrame > 1) {
        warnings.push({
          code: 'READOUT_EXCEEDS_FRAME_INTERVAL',
          message:
            'Full-frame sensor readout is longer than the supplied video frame interval.',
        });
      }
    }

    if (
      input.exposureTimeSeconds !== undefined &&
      isPositiveFinite(input.exposureTimeSeconds) &&
      input.exposureTimeSeconds >
        result.videoFrameIntervalSeconds
    ) {
      warnings.push({
        code: 'EXPOSURE_EXCEEDS_FRAME_INTERVAL',
        message:
          'Exposure time is longer than the supplied video frame interval.',
      });
    }
  }

  if (
    input.apertureFNumber !== undefined &&
    isPositiveFinite(input.apertureFNumber)
  ) {
    const n = input.apertureFNumber;

    result.apertureThroughput = 1 / (n * n);

    if (
      input.exposureTimeSeconds !== undefined &&
      isPositiveFinite(input.exposureTimeSeconds)
    ) {
      const transmission =
        input.lensTransmissionFraction !== undefined &&
        Number.isFinite(input.lensTransmissionFraction) &&
        input.lensTransmissionFraction > 0 &&
        input.lensTransmissionFraction <= 1
          ? input.lensTransmissionFraction
          : 1;

      result.exposureThroughput =
        result.apertureThroughput *
        input.exposureTimeSeconds *
        transmission;
    }

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

    if (sensorArea !== undefined) {
      result.geometricLightCaptureIndex =
        sensorArea /
        (n * n);

      if (result.exposureThroughput !== undefined) {
        result.exposureLightCaptureIndex =
          sensorArea *
          result.exposureThroughput;

        if (
          input.quantumEfficiencyFraction !== undefined &&
          Number.isFinite(input.quantumEfficiencyFraction) &&
          input.quantumEfficiencyFraction > 0 &&
          input.quantumEfficiencyFraction <= 1
        ) {
          result.photoelectronCaptureIndex =
            result.exposureLightCaptureIndex *
            input.quantumEfficiencyFraction;
        }
      }
    }

    const crop =
      result.cropFactor ??
      sensorCrop;

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
    sensorArea !== undefined
  ) {
    // mm² / MP is numerically equal to µm² per pixel.
    // Exact active dimensions win over optical-format approximation.
    const pixelAreaMicrons2 =
      sensorArea /
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

      if (result.exposureThroughput !== undefined) {
        result.nativePixelExposureIndex =
          pixelAreaMicrons2 *
          result.exposureThroughput;

        if (
          input.quantumEfficiencyFraction !== undefined &&
          Number.isFinite(input.quantumEfficiencyFraction) &&
          input.quantumEfficiencyFraction > 0 &&
          input.quantumEfficiencyFraction <= 1
        ) {
          result.nativePixelPhotoelectronIndex =
            result.nativePixelExposureIndex *
            input.quantumEfficiencyFraction;
        }
      }
    }

    const nativePixelPitchMm =
      result.approximatePixelPitchMicrons /
      1000;

    const angularDisplacementPixels = (
      angularSpeedDegPerSecond: number,
      durationSeconds: number,
    ) => {
      if (
        physicalFocalLength === undefined ||
        nativePixelPitchMm <= 0
      ) {
        return undefined;
      }

      const angleRad =
        (
          angularSpeedDegPerSecond *
          durationSeconds
        ) *
        (Math.PI / 180);

      return (
        Math.abs(
          physicalFocalLength *
          Math.tan(angleRad),
        ) /
        nativePixelPitchMm
      );
    };

    if (
      input.exposureTimeSeconds !== undefined &&
      isPositiveFinite(input.exposureTimeSeconds)
    ) {
      if (
        input.subjectAngularSpeedDegPerSecond !== undefined &&
        Number.isFinite(input.subjectAngularSpeedDegPerSecond) &&
        input.subjectAngularSpeedDegPerSecond >= 0
      ) {
        result.subjectMotionBlurPixels =
          angularDisplacementPixels(
            input.subjectAngularSpeedDegPerSecond,
            input.exposureTimeSeconds,
          );
      }

      if (
        input.cameraAngularShakeDegPerSecond !== undefined &&
        Number.isFinite(input.cameraAngularShakeDegPerSecond) &&
        input.cameraAngularShakeDegPerSecond >= 0
      ) {
        const raw =
          angularDisplacementPixels(
            input.cameraAngularShakeDegPerSecond,
            input.exposureTimeSeconds,
          );

        if (raw !== undefined) {
          result.cameraShakeBlurPixelsBeforeOis =
            raw;

          const compensation =
            input.oisAngularCompensationFraction !== undefined &&
            Number.isFinite(input.oisAngularCompensationFraction) &&
            input.oisAngularCompensationFraction >= 0 &&
            input.oisAngularCompensationFraction <= 1
              ? input.oisAngularCompensationFraction
              : 0;

          result.cameraShakeBlurPixelsAfterOis =
            raw *
            (1 - compensation);
        }
      }
    }

    if (
      input.sensorReadoutTimeSeconds !== undefined &&
      isPositiveFinite(input.sensorReadoutTimeSeconds)
    ) {
      if (
        input.cameraAngularShakeDegPerSecond !== undefined &&
        Number.isFinite(input.cameraAngularShakeDegPerSecond) &&
        input.cameraAngularShakeDegPerSecond >= 0
      ) {
        result.rollingShutterCameraSkewPixels =
          angularDisplacementPixels(
            input.cameraAngularShakeDegPerSecond,
            input.sensorReadoutTimeSeconds,
          );
      }

      if (
        input.subjectAngularSpeedDegPerSecond !== undefined &&
        Number.isFinite(input.subjectAngularSpeedDegPerSecond) &&
        input.subjectAngularSpeedDegPerSecond >= 0
      ) {
        result.rollingShutterSubjectSkewPixels =
          angularDisplacementPixels(
            input.subjectAngularSpeedDegPerSecond,
            input.sensorReadoutTimeSeconds,
          );
      }
    }

    if (
      input.binningLinearFactor !== undefined &&
      Number.isInteger(input.binningLinearFactor) &&
      input.binningLinearFactor >= 1
    ) {
      const factor = input.binningLinearFactor;
      const samplesPerOutputPixel = factor * factor;

      result.effectiveBinnedPixelPitchMicrons =
        result.approximatePixelPitchMicrons * factor;
      result.effectiveBinnedResolutionMp =
        input.resolutionMp / samplesPerOutputPixel;

      if (result.nativePixelExposureIndex !== undefined) {
        result.binnedOutputPixelExposureIndex =
          result.nativePixelExposureIndex *
          samplesPerOutputPixel;
      }

      if (result.nativePixelPhotoelectronIndex !== undefined) {
        result.binnedOutputPixelPhotoelectronIndex =
          result.nativePixelPhotoelectronIndex *
          samplesPerOutputPixel;
      }
    }

    const cropSourceResolutionMp =
      result.effectiveBinnedResolutionMp ??
      input.resolutionMp;

    if (
      cropSourceResolutionMp !== undefined &&
      isPositiveFinite(cropSourceResolutionMp)
    ) {
      result.cropSourceResolutionMp =
        cropSourceResolutionMp;
    }

    if (
      input.cropZoomRatio !== undefined &&
      Number.isFinite(input.cropZoomRatio) &&
      input.cropZoomRatio >= 1 &&
      cropSourceResolutionMp !== undefined &&
      isPositiveFinite(cropSourceResolutionMp)
    ) {
      const zoom = input.cropZoomRatio;
      const retainedAreaFraction = 1 / (zoom * zoom);

      result.croppedResolutionMp =
        cropSourceResolutionMp *
        retainedAreaFraction;

      if (
        input.equivalentFocalLengthMm !== undefined &&
        isPositiveFinite(input.equivalentFocalLengthMm)
      ) {
        result.croppedEquivalentFocalLengthMm =
          input.equivalentFocalLengthMm * zoom;
      }

      if (
        sensorArea !== undefined
      ) {
        result.croppedSensorAreaMm2 =
          sensorArea *
          retainedAreaFraction;
      }

      if (
        result.exposureLightCaptureIndex !== undefined
      ) {
        result.croppedExposureLightCaptureIndex =
          result.exposureLightCaptureIndex *
          retainedAreaFraction;
      }

      result.cropTotalLightLossStops =
        2 * Math.log2(zoom);

      if (
        input.targetOutputResolutionMp !== undefined &&
        isPositiveFinite(input.targetOutputResolutionMp)
      ) {
        result.maxNativeCropZoomForTargetResolution =
          Math.sqrt(
            cropSourceResolutionMp /
            input.targetOutputResolutionMp,
          );

        result.cropMeetsTargetResolution =
          result.croppedResolutionMp >=
          input.targetOutputResolutionMp;

        if (!result.cropMeetsTargetResolution) {
          warnings.push({
            code: 'CROP_REQUIRES_UPSCALING_FOR_TARGET_RESOLUTION',
            message:
              'The requested crop zoom leaves fewer native pixels than the requested output resolution. Reaching that output size would require upscaling or multi-frame reconstruction.',
          });
        }
      }
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

  // Resolution-only zoom math does not require physical sensor dimensions.
  // Keep it outside the sensor-area branch so a known 50 MP camera can still
  // produce deterministic crop resolution even when the exact sensor format
  // is unavailable.
  if (
    input.resolutionMp !== undefined &&
    isPositiveFinite(input.resolutionMp)
  ) {
    if (
      result.effectiveBinnedResolutionMp === undefined &&
      input.binningLinearFactor !== undefined &&
      Number.isInteger(input.binningLinearFactor) &&
      input.binningLinearFactor >= 1
    ) {
      const factor = input.binningLinearFactor;
      result.effectiveBinnedResolutionMp =
        input.resolutionMp / (factor * factor);
    }

    const cropSourceResolutionMp =
      result.effectiveBinnedResolutionMp ??
      input.resolutionMp;

    if (result.cropSourceResolutionMp === undefined) {
      result.cropSourceResolutionMp =
        cropSourceResolutionMp;
    }

    if (
      result.croppedResolutionMp === undefined &&
      input.cropZoomRatio !== undefined &&
      Number.isFinite(input.cropZoomRatio) &&
      input.cropZoomRatio >= 1
    ) {
      const zoom = input.cropZoomRatio;
      const retainedAreaFraction =
        1 / (zoom * zoom);

      result.croppedResolutionMp =
        cropSourceResolutionMp *
        retainedAreaFraction;

      if (
        input.equivalentFocalLengthMm !== undefined &&
        isPositiveFinite(input.equivalentFocalLengthMm)
      ) {
        result.croppedEquivalentFocalLengthMm =
          input.equivalentFocalLengthMm * zoom;
      }

      if (
        sensorArea !== undefined &&
        result.croppedSensorAreaMm2 === undefined
      ) {
        result.croppedSensorAreaMm2 =
          sensorArea *
          retainedAreaFraction;
      }

      if (
        result.exposureLightCaptureIndex !== undefined &&
        result.croppedExposureLightCaptureIndex === undefined
      ) {
        result.croppedExposureLightCaptureIndex =
          result.exposureLightCaptureIndex *
          retainedAreaFraction;
      }

      result.cropTotalLightLossStops ??=
        2 * Math.log2(zoom);

      if (
        input.targetOutputResolutionMp !== undefined &&
        isPositiveFinite(input.targetOutputResolutionMp)
      ) {
        result.maxNativeCropZoomForTargetResolution ??=
          Math.sqrt(
            cropSourceResolutionMp /
            input.targetOutputResolutionMp,
          );

        result.cropMeetsTargetResolution ??=
          result.croppedResolutionMp >=
          input.targetOutputResolutionMp;

        if (
          !result.cropMeetsTargetResolution &&
          !warnings.some(
            (warning) =>
              warning.code ===
              'CROP_REQUIRES_UPSCALING_FOR_TARGET_RESOLUTION',
          )
        ) {
          warnings.push({
            code: 'CROP_REQUIRES_UPSCALING_FOR_TARGET_RESOLUTION',
            message:
              'The requested crop zoom leaves fewer native pixels than the requested output resolution. Reaching that output size would require upscaling or multi-frame reconstruction.',
          });
        }
      }
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
      sensorCrop;

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
    input.cropZoomRatio !== undefined &&
    Number.isFinite(input.cropZoomRatio) &&
    input.cropZoomRatio > 1 &&
    (
      input.resolutionMp === undefined ||
      !isPositiveFinite(input.resolutionMp)
    )
  ) {
    warnings.push({
      code: 'CROP_ZOOM_WITHOUT_RESOLUTION',
      message:
        'Crop zoom was supplied without a valid sensor resolution, so retained crop resolution cannot be calculated.',
    });
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
    sensorWidth !== undefined &&
    sensorHeight !== undefined &&
    sensorDiagonal !== undefined
  ) {
    result.horizontalFieldOfViewDeg = fieldOfViewDeg(
      sensorWidth,
      physicalFocalLength,
    );

    result.verticalFieldOfViewDeg = fieldOfViewDeg(
      sensorHeight,
      physicalFocalLength,
    );

    result.diagonalFieldOfViewDeg = fieldOfViewDeg(
      sensorDiagonal,
      physicalFocalLength,
    );
  }


  if (
    sensorWidth !== undefined ||
    sensorHeight !== undefined ||
    result.entrancePupilDiameterMm !== undefined
  ) {
    const requiredWidth = Math.max(
      sensorWidth ?? 0,
      result.entrancePupilDiameterMm ?? 0,
    );

    const requiredHeight = Math.max(
      sensorHeight ?? 0,
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
