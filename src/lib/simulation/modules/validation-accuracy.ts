/**
 * Error-based calibration metrics. A prediction is within 20% when its
 * absolute error divided by the independent reference measurement is <= 0.20.
 * 'Within tolerance' and MAPE-based accuracy must never be conflated.
 */
export type ValidationPair = { observed: number; predicted: number };
export type AccuracyScore = {
  evaluated: number;
  mapePercent: number;
  within10Percent: number;
  within20Percent: number;
  coverageWithin20Percent: number;
  accuracyFromMapePercent: number;
  target80Met: boolean;
  target90Met: boolean;
  /** True only when both mean error and individual prediction coverage pass. */
  meets80QualityGate: boolean;
};

export function scoreValidationPairs(pairs: readonly ValidationPair[]): AccuracyScore | undefined {
  if (!pairs.length || pairs.some(p => !Number.isFinite(p.observed) ||
    !Number.isFinite(p.predicted) || p.observed <= 0 || p.predicted < 0)) return undefined;
  const errors = pairs.map(p => Math.abs(p.predicted - p.observed) / p.observed);
  const meanError = errors.reduce((sum, error) => sum + error, 0) / errors.length;
  const within10Percent = errors.filter(error => error <= 0.10 + 1e-12).length;
  const within20Percent = errors.filter(error => error <= 0.20 + 1e-12).length;
  return {
    evaluated: pairs.length,
    mapePercent: meanError * 100,
    within10Percent,
    within20Percent,
    coverageWithin20Percent: 100 * within20Percent / pairs.length,
    accuracyFromMapePercent: Math.max(0, 100 * (1 - meanError)),
    target80Met: meanError <= 0.20,
    target90Met: meanError <= 0.10,
    meets80QualityGate: meanError <= 0.20 && within20Percent / pairs.length >= 0.80,
  };
}

/** Group validation by workload, manufacturer, charging band, or other cohort.
 * Small groups are reported but cannot be treated as validated milestones.
 */
export type CohortAccuracy = {
  key: string;
  score: AccuracyScore;
  sufficientSample: boolean;
  meanSignedErrorPercent: number;
  p90AbsoluteErrorPercent: number;
};

export function scoreValidationCohorts<T>(
  rows: readonly T[],
  keyOf: (row: T) => string,
  pairOf: (row: T) => ValidationPair,
  minimumSamples = 5,
): CohortAccuracy[] {
  if (!Number.isInteger(minimumSamples) || minimumSamples < 1)
    throw new Error('Minimum cohort sample size must be a positive integer.');
  const groups = new Map<string, ValidationPair[]>();
  for (const row of rows) {
    const key = keyOf(row);
    const group = groups.get(key) ?? [];
    group.push(pairOf(row));
    groups.set(key, group);
  }
  return [...groups.entries()].map(([key, pairs]) => {
    const score = scoreValidationPairs(pairs);
    if (!score) return undefined;
    const errors = pairs.map(p => Math.abs(p.predicted - p.observed) / p.observed * 100).sort((a, b) => a - b);
    const rank = Math.ceil(0.9 * errors.length) - 1;
    return {
      key,
      score,
      sufficientSample: score.evaluated >= minimumSamples,
      meanSignedErrorPercent: pairs.reduce((sum, p) => sum + (p.predicted - p.observed) / p.observed * 100, 0) / pairs.length,
      p90AbsoluteErrorPercent: errors[Math.max(0, rank)],
    };
  }).filter((cohort): cohort is CohortAccuracy => cohort !== undefined)
    .sort((a, b) => b.score.mapePercent - a.score.mapePercent);
}
