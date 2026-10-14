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
};

export function scoreValidationPairs(pairs: readonly ValidationPair[]): AccuracyScore | undefined {
  if (!pairs.length || pairs.some(p => !Number.isFinite(p.observed) ||
    !Number.isFinite(p.predicted) || p.observed <= 0 || p.predicted <= 0)) return undefined;
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
  };
}
