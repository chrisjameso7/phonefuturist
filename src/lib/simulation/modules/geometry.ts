const MM_PER_INCH = 25.4;

export interface Rectangle {
  width: number;
  height: number;
}

function isPositiveFinite(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

/**
 * Calculates the physical width and height of a rectangle from
 * its diagonal and aspect ratio.
 *
 * The diagonal is supplied in inches and the result is millimetres.
 */
export function rectangleFromDiagonal(
  diagonalInches: number,
  aspectWidth: number,
  aspectHeight: number,
): Rectangle | null {
  if (
    !isPositiveFinite(diagonalInches) ||
    !isPositiveFinite(aspectWidth) ||
    !isPositiveFinite(aspectHeight)
  ) {
    return null;
  }

  const diagonalMm = diagonalInches * MM_PER_INCH;
  const aspectDiagonal = Math.hypot(aspectWidth, aspectHeight);

  return {
    width: diagonalMm * (aspectWidth / aspectDiagonal),
    height: diagonalMm * (aspectHeight / aspectDiagonal),
  };
}

/**
 * Calculates rectangular area in square millimetres.
 */
export function rectangleArea(
  widthMm: number,
  heightMm: number,
): number | null {
  if (!isPositiveFinite(widthMm) || !isPositiveFinite(heightMm)) {
    return null;
  }

  return widthMm * heightMm;
}

/**
 * Calculates pixels per inch from resolution and physical diagonal.
 */
export function pixelsPerInch(
  resolutionWidthPx: number,
  resolutionHeightPx: number,
  diagonalInches: number,
): number | null {
  if (
    !isPositiveFinite(resolutionWidthPx) ||
    !isPositiveFinite(resolutionHeightPx) ||
    !isPositiveFinite(diagonalInches)
  ) {
    return null;
  }

  return (
    Math.hypot(resolutionWidthPx, resolutionHeightPx) /
    diagonalInches
  );
}

/**
 * Calculates the ratio between two positive dimensions.
 */
export function dimensionRatio(
  width: number,
  height: number,
): number | null {
  if (!isPositiveFinite(width) || !isPositiveFinite(height)) {
    return null;
  }

  return width / height;
}

/**
 * Calculates what percentage of a rectangular body is occupied
 * by a rectangular display.
 *
 * Result is expressed as a percentage from 0 to 100.
 */
export function screenToBodyRatio(
  displayWidthMm: number,
  displayHeightMm: number,
  bodyWidthMm: number,
  bodyHeightMm: number,
): number | null {
  const displayArea = rectangleArea(displayWidthMm, displayHeightMm);
  const bodyArea = rectangleArea(bodyWidthMm, bodyHeightMm);

  if (displayArea === null || bodyArea === null) {
    return null;
  }

  if (displayArea > bodyArea) {
    return null;
  }

  return (displayArea / bodyArea) * 100;
}