import type {
  CalculatedDisplay,
  Dimensions,
  DisplayInput,
  SimulationWarning,
} from '../types';

import {
  dimensionRatio,
  pixelsPerInch,
  rectangleArea,
  rectangleFromDiagonal,
  screenToBodyRatio,
} from './geometry';

export interface DisplayCalculation {
  result: CalculatedDisplay;
  warnings: SimulationWarning[];
}

function hasAllBezels(input: DisplayInput): boolean {
  return (
    input.bezelTopMm !== undefined &&
    input.bezelRightMm !== undefined &&
    input.bezelBottomMm !== undefined &&
    input.bezelLeftMm !== undefined
  );
}

export function calculateDisplay(
  input: DisplayInput,
  body?: Dimensions,
): DisplayCalculation {
  const result: CalculatedDisplay = {};
  const warnings: SimulationWarning[] = [];

  // -------------------------------------------------------
  // Physical display geometry
  // -------------------------------------------------------

  if (
    input.diagonalInches !== undefined &&
    input.aspectWidth !== undefined &&
    input.aspectHeight !== undefined
  ) {
    const rectangle = rectangleFromDiagonal(
      input.diagonalInches,
      input.aspectWidth,
      input.aspectHeight,
    );

    if (rectangle) {
      result.widthMm = rectangle.width;
      result.heightMm = rectangle.height;

      const area = rectangleArea(rectangle.width, rectangle.height);

      if (area !== null) {
        result.areaMm2 = area;
      }

      const ratio = dimensionRatio(rectangle.width, rectangle.height);

      if (ratio !== null) {
        result.aspectRatio = ratio;
      }
    } else {
      warnings.push({
        code: 'INVALID_DISPLAY_GEOMETRY',
        message:
          'Display diagonal and aspect ratio must contain positive finite values.',
      });
    }
  }

  // -------------------------------------------------------
  // Pixel density
  // -------------------------------------------------------

  if (
    input.resolutionWidthPx !== undefined &&
    input.resolutionHeightPx !== undefined &&
    input.diagonalInches !== undefined
  ) {
    const ppi = pixelsPerInch(
      input.resolutionWidthPx,
      input.resolutionHeightPx,
      input.diagonalInches,
    );

    if (ppi !== null) {
      result.ppi = ppi;
    } else {
      warnings.push({
        code: 'INVALID_PIXEL_DENSITY_INPUT',
        message:
          'Resolution and display diagonal must contain positive finite values.',
      });
    }
  }

  // -------------------------------------------------------
  // Device dimensions estimated from display + bezels
  // -------------------------------------------------------

  if (
    result.widthMm !== undefined &&
    result.heightMm !== undefined &&
    hasAllBezels(input)
  ) {
    result.estimatedDeviceWidthMm =
      result.widthMm +
      input.bezelLeftMm! +
      input.bezelRightMm!;

    result.estimatedDeviceHeightMm =
      result.heightMm +
      input.bezelTopMm! +
      input.bezelBottomMm!;
  }

  // -------------------------------------------------------
  // Screen-to-body ratio
  // -------------------------------------------------------

  if (
    result.widthMm !== undefined &&
    result.heightMm !== undefined &&
    body?.widthMm !== undefined &&
    body?.heightMm !== undefined
  ) {
    const ratio = screenToBodyRatio(
      result.widthMm,
      result.heightMm,
      body.widthMm,
      body.heightMm,
    );

    if (ratio !== null) {
      result.screenToBodyRatio = ratio;
    } else {
      warnings.push({
        code: 'INVALID_SCREEN_TO_BODY_GEOMETRY',
        message:
          'The supplied display geometry cannot fit within the supplied body dimensions.',
      });
    }
  }

  return {
    result,
    warnings,
  };
}