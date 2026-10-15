/** Exploratory sustained GPU retention under a 15-minute load. Values are scenarios, not 3DMark measurements. */
export function projectedSustainedGpuRetention(input: {
  coolingClass?: 'unknown' | 'passive-graphite' | 'vapor-chamber' | 'large-vapor-chamber' | 'active-fan' | 'other';
  socPowerW?: number;
  durationMinutes?: number;
}): number {
  const nominal: Record<NonNullable<typeof input.coolingClass>, number> = {
    unknown: 76, 'passive-graphite': 67, 'vapor-chamber': 79,
    'large-vapor-chamber': 86, 'active-fan': 92, other: 76,
  };
  const baseline = nominal[input.coolingClass ?? 'unknown'];
  const powerPenalty = input.socPowerW !== undefined && Number.isFinite(input.socPowerW)
    ? Math.max(-5, Math.min(12, (input.socPowerW - 7) * 1.5))
    : 0;
  const duration = Number.isFinite(input.durationMinutes)
    ? Math.max(0, Math.min(60, input.durationMinutes!))
    : 15;
  const loadFraction = Math.min(1, duration / 15);
  return Math.round(Math.max(50, Math.min(100, 100 - (100 - baseline + powerPenalty) * loadFraction)));
}
