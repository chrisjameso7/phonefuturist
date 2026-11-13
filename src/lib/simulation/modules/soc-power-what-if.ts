import type { RuntimeWorkload } from './corpus-runtime';

/**
 * Illustrative relative power scenario for an unreleased processor.
 * These coefficients represent an explicitly user-selected ±12% change to
 * the loaded SoC's contribution, NOT real Exynos/Snapdragon efficiency data.
 * Phone-level workloads include non-SoC demand, so we do not apply the
 * full assumed SoC change to the battery drain.
 */
export type SocPowerWhatIf = 'neutral' | 'efficiency' | 'performance';

const ASSUMED_SOC_SHARE: Readonly<Record<RuntimeWorkload, number>> = {
  web_browsing: 0.35,
  video_playback: 0.20,
  gaming: 0.65,
};

export function socWhatIfDrainFactor(
  scenario: SocPowerWhatIf | undefined,
  workload: RuntimeWorkload,
): number {
  if (!scenario || scenario === 'neutral') return 1;
  const relativeSocChange = scenario === 'efficiency' ? -0.12 :
    scenario === 'performance' ? 0.12 : 0;
  return 1 + relativeSocChange * ASSUMED_SOC_SHARE[workload];
}
