/** Scenario-only sustained performance after extended CPU load. Peak Geekbench is unchanged. */
export function projectedSustainedCpuScore(input: {
  peakScore: number;
  coolingClass?: 'unknown' | 'passive-graphite' | 'vapor-chamber' | 'large-vapor-chamber' | 'active-fan' | 'other';
  socPowerW?: number;
  durationMinutes?: number;
}): number | undefined {
  if (!Number.isFinite(input.peakScore) || input.peakScore <= 0) return undefined;
  const retention = {
    unknown: 0.83, 'passive-graphite': 0.74, 'vapor-chamber': 0.84,
    'large-vapor-chamber': 0.89, 'active-fan': 0.94, other: 0.83,
  }[input.coolingClass ?? 'unknown'];
  const powerPenalty = input.socPowerW !== undefined && Number.isFinite(input.socPowerW)
    ? Math.max(0, Math.min(0.12, (input.socPowerW - 7) * 0.012)) : 0;
  const duration = Math.max(0, Math.min(60, input.durationMinutes ?? 15));
  const load = Math.min(1, duration / 15);
  const sustainedFraction = 1 - (1 - retention + powerPenalty) * load;
  return Math.round(input.peakScore * Math.max(0.55, Math.min(1, sustainedFraction)));
}
