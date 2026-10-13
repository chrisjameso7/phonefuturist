import type { DisplayInput } from '../types';

/** Experimental display power factor relative to a 6.5 inch, 120 Hz FHD panel. */
export function projectedDisplayPowerFactor(display: DisplayInput, workload: 'web_browsing' | 'video_playback' | 'gaming'): number {
  const size = Math.pow((display.diagonalInches ?? 6.5) / 6.5, 2);
  const refresh = 0.82 + 0.18 * (display.refreshRateHz ?? 120) / 120;
  const pixelCount = (display.renderingWidthPx ?? display.resolutionWidthPx ?? 1080) * (display.renderingHeightPx ?? display.resolutionHeightPx ?? 2400);
  const resolution = Math.sqrt(pixelCount / (1080 * 2400));
  const share = workload === 'gaming' ? 0.34 : workload === 'video_playback' ? 0.24 : 0.29;
  return Math.max(0.7, Math.min(1.4, 1 + share * (size * refresh * (0.75 + 0.25 * resolution) - 1)));
}
