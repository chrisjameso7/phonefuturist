import type { DisplayInput } from '../types';

const positiveOr = (value: number | undefined, fallback: number) =>
  value !== undefined && Number.isFinite(value) && value > 0 ? value : fallback;

/** Experimental display power factor relative to a 6.5 inch, 120 Hz FHD panel. */
export function projectedDisplayPowerFactor(display: DisplayInput, workload: 'web_browsing' | 'video_playback' | 'gaming'): number {
  const size = Math.pow(Math.max(0.1, positiveOr(display.diagonalInches, 6.5)) / 6.5, 2);
  const refresh = 0.82 + 0.18 * Math.min(240, Math.max(1, positiveOr(display.refreshRateHz, 120))) / 120;
  const pixelCount = (positiveOr(display.renderingWidthPx, positiveOr(display.resolutionWidthPx, 1080))) * (positiveOr(display.renderingHeightPx, positiveOr(display.resolutionHeightPx, 2400)));
  const resolution = Math.sqrt(Math.max(1, pixelCount) / (1080 * 2400));
  const share = workload === 'gaming' ? 0.34 : workload === 'video_playback' ? 0.24 : 0.29;
  return Math.max(0.7, Math.min(1.4, 1 + share * (size * refresh * (0.75 + 0.25 * resolution) - 1)));
}

/** Brightness changes only the estimated display share of total workload draw. */
export function projectedBrightnessPowerFactor(brightnessNits?: number): number {
  if (brightnessNits === undefined || !Number.isFinite(brightnessNits) || brightnessNits <= 0) return 1;
  const relative = Math.sqrt(Math.min(2000, Math.max(100, brightnessNits)) / 400);
  return Math.max(0.8, Math.min(1.3, 1 + 0.22 * (relative - 1)));
}
