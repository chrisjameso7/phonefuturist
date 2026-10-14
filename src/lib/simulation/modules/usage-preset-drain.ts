import type { RuntimeWorkload } from './corpus-runtime';

/**
 * Workload-weighted preset stress. The reference corpus already encodes the
 * energy difference between browsing, video and gaming. A preset must not
 * apply gaming-style extra drain to every workload.
 * These are bounded interactive assumptions, not measured chip coefficients.
 */
export function usagePresetDrainFactor(
  preset: 'Light' | 'Typical' | 'Heavy' | undefined,
  workload: RuntimeWorkload,
): number {
  if (!preset || preset === 'Typical') return 1;
  if (preset === 'Light') {
    return workload === 'gaming' ? 0.90 : workload === 'video_playback' ? 0.95 : 0.90;
  }
  return workload === 'gaming' ? 1.30 : workload === 'video_playback' ? 1.10 : 1.12;
}
