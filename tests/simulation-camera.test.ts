import { describe, expect, it } from 'vitest';

import {
  calculateCamera,
} from '../src/lib/simulation/modules/camera';

describe('camera simulation module', () => {
  it('calculates approximate sensor diagonal from optical format', () => {
    const calculation = calculateCamera({
      type: 'wide',
      sensorFormatDenominator: 1.3,
    });

    expect(
      calculation.result.approximateSensorDiagonalMm,
    ).toBeCloseTo(12.307692, 6);

    expect(calculation.warnings).toEqual([]);
  });

  it('calculates crop factor when equivalent and physical focal lengths are known', () => {
    const calculation = calculateCamera({
      type: 'telephoto',
      equivalentFocalLengthMm: 120,
      physicalFocalLengthMm: 20,
    });

    expect(
      calculation.result.cropFactor,
    ).toBeCloseTo(6, 6);

    expect(calculation.warnings).toEqual([]);
  });

  it('calculates entrance pupil diameter from physical focal length and aperture', () => {
    const calculation = calculateCamera({
      type: 'wide',
      physicalFocalLengthMm: 6.5,
      apertureFNumber: 1.6,
    });

    expect(
      calculation.result.entrancePupilDiameterMm,
    ).toBeCloseTo(4.0625, 6);

    expect(calculation.warnings).toEqual([]);
  });

  it('compares total-light capture from sensor size and aperture', () => {
    const largeFast = calculateCamera({
      type: 'wide',
      sensorFormatDenominator: 1.0,
      resolutionMp: 50,
      equivalentFocalLengthMm: 24,
      apertureFNumber: 1.6,
    });

    const smallSlow = calculateCamera({
      type: 'wide',
      sensorFormatDenominator: 2.0,
      resolutionMp: 50,
      equivalentFocalLengthMm: 24,
      apertureFNumber: 2.0,
    });

    expect(
      largeFast.result.geometricLightCaptureIndex!,
    ).toBeGreaterThan(
      smallSlow.result.geometricLightCaptureIndex!,
    );

    expect(
      largeFast.result.approximatePixelPitchMicrons!,
    ).toBeGreaterThan(
      smallSlow.result.approximatePixelPitchMicrons!,
    );

    expect(
      largeFast.result.perPixelLightCaptureIndex!,
    ).toBeGreaterThan(
      smallSlow.result.perPixelLightCaptureIndex!,
    );
  });

  it('derives field of view and diffraction indicators when geometry is available', () => {
    const calculation = calculateCamera({
      type: 'wide',
      sensorFormatDenominator: 1.3,
      resolutionMp: 50,
      equivalentFocalLengthMm: 24,
      apertureFNumber: 1.6,
    });

    expect(calculation.result.horizontalFieldOfViewDeg).toBeGreaterThan(0);
    expect(calculation.result.diagonalFieldOfViewDeg).toBeGreaterThan(
      calculation.result.horizontalFieldOfViewDeg!,
    );
    expect(calculation.result.airyDiskDiameterMicrons).toBeGreaterThan(0);
    expect(calculation.result.airyDiskToPixelPitchRatio).toBeGreaterThan(0);
    expect(
      calculation.result.diffractionTwoPixelFNumber,
    ).toBeGreaterThan(0);
    expect(calculation.result.equivalentApertureFNumber).toBeGreaterThan(
      1.6,
    );
  });

  it('calculates classical depth of field when focus distance is supplied', () => {
    const calculation = calculateCamera({
      type: 'wide',
      sensorFormatDenominator: 1.3,
      resolutionMp: 50,
      equivalentFocalLengthMm: 24,
      apertureFNumber: 1.8,
      focusDistanceM: 2,
    });

    expect(
      calculation.result.hyperfocalDistanceM,
    ).toBeGreaterThan(0);

    expect(
      calculation.result.focusNearLimitM,
    ).toBeLessThan(2);

    expect(
      calculation.result.focusFarLimitM,
    ).not.toBe('infinity');

    expect(
      calculation.result.focusFarLimitM as number,
    ).toBeGreaterThan(2);

    expect(
      calculation.result.totalDepthOfFieldM,
    ).toBeGreaterThan(0);
  });

  it('reports infinite far depth of field when focus reaches beyond the hyperfocal geometry', () => {
    const calculation = calculateCamera({
      type: 'wide',
      sensorFormatDenominator: 1.3,
      resolutionMp: 50,
      equivalentFocalLengthMm: 24,
      apertureFNumber: 1.8,
      focusDistanceM: 10,
    });

    expect(
      calculation.result.focusFarLimitM,
    ).toBe('infinity');

    expect(
      calculation.result.totalDepthOfFieldM,
    ).toBe('infinity');
  });

  it('calculates camera module volume only from explicit module dimensions', () => {
    const calculation = calculateCamera({
      type: 'periscope',

      sensorFormatDenominator: 2.5,

      moduleWidthMm: 20,
      moduleHeightMm: 15,
      moduleDepthMm: 6,
    });

    expect(
      calculation.result.approximateSensorDiagonalMm,
    ).toBeCloseTo(6.4, 6);

    expect(
      calculation.result.moduleVolumeMm3,
    ).toBe(1800);

    expect(
      calculation.result.moduleVolumeCm3,
    ).toBeCloseTo(1.8, 6);

    expect(calculation.warnings).toEqual([]);
  });

  it('does not invent module volume from sensor format alone', () => {
    const calculation = calculateCamera({
      type: 'wide',
      sensorFormatDenominator: 1.3,
      resolutionMp: 50,
      equivalentFocalLengthMm: 24,
      apertureFNumber: 1.6,
    });

    expect(
      calculation.result.approximateSensorDiagonalMm,
    ).toBeCloseTo(12.307692, 6);

    expect(
      calculation.result.moduleVolumeMm3,
    ).toBeUndefined();

    expect(
      calculation.result.moduleVolumeCm3,
    ).toBeUndefined();

    expect(
      calculation.result.effectivePhysicalFocalLengthMm,
    ).toBeGreaterThan(0);

    expect(
      calculation.result.entrancePupilDiameterMm,
    ).toBeGreaterThan(0);

    expect(
      calculation.result.geometricLightCaptureIndex,
    ).toBeGreaterThan(0);

    expect(calculation.warnings).toEqual([]);
  });

  it('warns when camera module dimensions are incomplete', () => {
    const calculation = calculateCamera({
      type: 'periscope',
      moduleWidthMm: 20,
      moduleHeightMm: 15,
    });

    expect(
      calculation.result.moduleVolumeMm3,
    ).toBeUndefined();

    expect(calculation.warnings).toContainEqual({
      code: 'INCOMPLETE_CAMERA_MODULE_DIMENSIONS',
      message:
        'Camera module width, height, and depth are all required to calculate module volume.',
    });
  });

  it('rejects invalid camera inputs', () => {
    const calculation = calculateCamera({
      type: 'wide',

      sensorFormatDenominator: -1.3,
      resolutionMp: -50,

      equivalentFocalLengthMm: 24,
      physicalFocalLengthMm: -6,
      apertureFNumber: 0,
      focusDistanceM: -2,

      moduleWidthMm: 20,
      moduleHeightMm: 15,
      moduleDepthMm: -6,
    });

    expect(calculation.warnings).toContainEqual({
      code: 'INVALID_SENSOR_FORMAT',
      message:
        'Sensor format denominator must be a positive finite value.',
    });

    expect(calculation.warnings).toContainEqual({
      code: 'INVALID_FOCAL_LENGTH',
      message:
        'Equivalent and physical focal lengths must be positive finite values.',
    });

    expect(calculation.warnings).toContainEqual({
      code: 'INVALID_APERTURE_INPUT',
      message:
        'Aperture f-number must be a positive finite value.',
    });

    expect(calculation.warnings).toContainEqual({
      code: 'INVALID_CAMERA_MODULE_DIMENSIONS',
      message:
        'Camera module dimensions must be positive finite values.',
    });

    expect(calculation.warnings).toContainEqual({
      code: 'INVALID_FOCUS_DISTANCE',
      message:
        'Focus distance must be a positive finite value in metres.',
    });

    expect(calculation.warnings).toContainEqual({
      code: 'INVALID_CAMERA_RESOLUTION',
      message:
        'Camera resolution must be a positive finite value.',
    });
  });
});