/** Optical menu values, not a claim that every combination has shipped. */
export const CAMERA_SENSOR_FORMATS = [
  0.98, 1, 1.06, 1.12, 1.14, 1.2, 1.22, 1.28, 1.3, 1.31, 1.33, 1.35,
  1.4, 1.43, 1.47, 1.49, 1.5, 1.52, 1.55, 1.56, 1.57, 1.59, 1.6,
  1.67, 1.7, 1.72, 1.73, 1.75, 1.76, 1.8, 1.9, 1.95, 2, 2.25,
  2.4, 2.5, 2.55, 2.6, 2.7, 2.76, 2.8, 2.9, 3, 3.1, 3.2, 3.4,
  3.5, 3.6, 4, 4.5, 5,
] as const;

/** Full-stop, third-stop and phone-industry intermediate f-numbers; broad 2022-2030 scenario menu. */
export const CAMERA_APERTURES = [
  0.95, 1, 1.1, 1.2, 1.25, 1.3, 1.35, 1.4, 1.45, 1.47, 1.5, 1.55, 1.6,
  1.63, 1.65, 1.67, 1.7, 1.75, 1.78, 1.8, 1.85, 1.88, 1.9, 1.95, 2,
  2.05, 2.1, 2.15, 2.2, 2.25, 2.3, 2.35, 2.4, 2.45, 2.5, 2.55, 2.6,
  2.65, 2.7, 2.75, 2.8, 2.9, 3, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 4,
  4.5, 5, 5.6, 6.3, 7.1, 8, 11, 16,
] as const;

export function cameraApertureRangeValid(wide: string, narrow: string): boolean {
  if (!wide || !narrow) return false;
  const a = Number(wide), b = Number(narrow);
  return Number.isFinite(a) && Number.isFinite(b) && a > 0 && b >= a;
}
