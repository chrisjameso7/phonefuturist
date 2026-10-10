export const PREDICTION_VALIDATION_VERSION =
  'prediction-validation-0.1.0';

export type ValidationMetricDirection =
  | 'higher-is-better'
  | 'lower-is-better'
  | 'neutral';

export interface PredictionMetric {
  key: string;
  label: string;
  value: number;
  unit: string;
  direction?: ValidationMetricDirection;
  provenance?:
    | 'deterministic'
    | 'measured-calibrated'
    | 'assumption-adjusted'
    | 'derived';
}

export interface PredictionSnapshot {
  id: string;
  deviceName: string;
  createdAt: string;
  engineVersion?: string;
  corpusVersion?: string;
  simulatorVersion?: string;
  metrics: PredictionMetric[];
  assumptions?: Record<string, unknown>;
  note?: string;
}

export interface RealityMetric {
  key: string;
  label?: string;
  value: number;
  unit: string;
  measuredAt: string;
  sourceId?: string;
  sourcePublisher?: string;
  sourceUrl?: string;
  note?: string;
}

export interface RealitySnapshot {
  id: string;
  predictionId: string;
  createdAt: string;
  metrics: RealityMetric[];
  note?: string;
}

export interface MetricValidationRow {
  key: string;
  label: string;
  unit: string;
  predicted: number;
  actual: number;
  signedError: number;
  absoluteError: number;
  absolutePercentError?: number;
  signedPercentError?: number;
  direction: ValidationMetricDirection;
  outcome:
    | 'overpredicted'
    | 'underpredicted'
    | 'exact';
  desirabilityOutcome?:
    | 'better-than-predicted'
    | 'worse-than-predicted'
    | 'matched';
  predictionProvenance?: PredictionMetric['provenance'];
  realitySourceId?: string;
  realitySourcePublisher?: string;
}

export interface PredictionValidationResult {
  version: string;
  status: 'resolved' | 'partial' | 'unresolved';
  predictionId: string;
  realityId: string;
  evaluatedMetrics: number;
  missingRealityKeys: string[];
  unmatchedRealityKeys: string[];
  mae?: number;
  mapePercent?: number;
  medianAbsolutePercentError?: number;
  rows: MetricValidationRow[];
  note: string;
}

function validMetric(
  value: {
    key?: unknown;
    value?: unknown;
    unit?: unknown;
  },
) {
  return (
    typeof value.key === 'string' &&
    value.key.trim().length > 0 &&
    typeof value.unit === 'string' &&
    value.unit.trim().length > 0 &&
    typeof value.value === 'number' &&
    Number.isFinite(value.value)
  );
}

function normalizeKey(value: string) {
  return value
    .trim()
    .toLowerCase();
}

function normalizeUnit(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function median(
  values: number[],
) {
  if (!values.length) {
    return undefined;
  }

  const sorted = [...values].sort(
    (a, b) => a - b,
  );

  const middle =
    Math.floor(sorted.length / 2);

  return sorted.length % 2 === 1
    ? sorted[middle]
    : (
        sorted[middle - 1] +
        sorted[middle]
      ) /
        2;
}

function desirabilityOutcome(
  direction: ValidationMetricDirection,
  signedError: number,
):
  | MetricValidationRow['desirabilityOutcome']
  | undefined {
  if (direction === 'neutral') {
    return undefined;
  }

  if (signedError === 0) {
    return 'matched';
  }

  if (direction === 'higher-is-better') {
    return signedError > 0
      ? 'worse-than-predicted'
      : 'better-than-predicted';
  }

  return signedError > 0
    ? 'better-than-predicted'
    : 'worse-than-predicted';
}

export function validatePredictionAgainstReality(
  prediction: PredictionSnapshot,
  reality: RealitySnapshot,
): PredictionValidationResult {
  if (
    !prediction.id.trim() ||
    !reality.id.trim() ||
    reality.predictionId !== prediction.id
  ) {
    return {
      version:
        PREDICTION_VALIDATION_VERSION,
      status: 'unresolved',
      predictionId:
        prediction.id,
      realityId:
        reality.id,
      evaluatedMetrics: 0,
      missingRealityKeys: [],
      unmatchedRealityKeys: [],
      rows: [],
      note:
        'Reality snapshot must explicitly reference the immutable prediction snapshot being evaluated.',
    };
  }

  const predictedByKey =
    new Map(
      prediction.metrics
        .filter(validMetric)
        .map((metric) => [
          normalizeKey(metric.key),
          metric,
        ]),
    );

  const realityByKey =
    new Map(
      reality.metrics
        .filter(validMetric)
        .map((metric) => [
          normalizeKey(metric.key),
          metric,
        ]),
    );

  const rows: MetricValidationRow[] =
    [];

  for (
    const [key, predicted] of
    predictedByKey
  ) {
    const actual =
      realityByKey.get(key);

    if (!actual) continue;

    if (
      normalizeUnit(predicted.unit) !==
      normalizeUnit(actual.unit)
    ) {
      continue;
    }

    const signedError =
      predicted.value -
      actual.value;

    const absoluteError =
      Math.abs(signedError);

    const signedPercentError =
      actual.value !== 0
        ? (
            signedError /
            Math.abs(
              actual.value,
            )
          ) *
          100
        : undefined;

    const absolutePercentError =
      signedPercentError !== undefined
        ? Math.abs(
            signedPercentError,
          )
        : undefined;

    const direction =
      predicted.direction ??
      'neutral';

    rows.push({
      key:
        predicted.key,
      label:
        predicted.label,
      unit:
        predicted.unit,
      predicted:
        predicted.value,
      actual:
        actual.value,
      signedError,
      absoluteError,
      ...(signedPercentError !==
      undefined
        ? {
            signedPercentError,
            absolutePercentError,
          }
        : {}),
      direction,
      outcome:
        signedError > 0
          ? 'overpredicted'
          : signedError < 0
            ? 'underpredicted'
            : 'exact',
      ...(desirabilityOutcome(
        direction,
        signedError,
      ) !== undefined
        ? {
            desirabilityOutcome:
              desirabilityOutcome(
                direction,
                signedError,
              ),
          }
        : {}),
      ...(predicted.provenance
        ? {
            predictionProvenance:
              predicted.provenance,
          }
        : {}),
      ...(actual.sourceId
        ? {
            realitySourceId:
              actual.sourceId,
          }
        : {}),
      ...(actual.sourcePublisher
        ? {
            realitySourcePublisher:
              actual.sourcePublisher,
          }
        : {}),
    });
  }

  const missingRealityKeys =
    [...predictedByKey.keys()]
      .filter(
        (key) =>
          !realityByKey.has(key),
      );

  const unmatchedRealityKeys =
    [...realityByKey.keys()]
      .filter(
        (key) =>
          !predictedByKey.has(key),
      );

  if (!rows.length) {
    return {
      version:
        PREDICTION_VALIDATION_VERSION,
      status: 'unresolved',
      predictionId:
        prediction.id,
      realityId:
        reality.id,
      evaluatedMetrics: 0,
      missingRealityKeys,
      unmatchedRealityKeys,
      rows: [],
      note:
        'No prediction/reality metric pairs with matching keys and units were available for validation.',
    };
  }

  const percentageRows =
    rows.filter(
      (
        row,
      ): row is MetricValidationRow & {
        absolutePercentError: number;
      } =>
        row.absolutePercentError !==
        undefined,
    );

  return {
    version:
      PREDICTION_VALIDATION_VERSION,
    status:
      missingRealityKeys.length ||
      unmatchedRealityKeys.length
        ? 'partial'
        : 'resolved',
    predictionId:
      prediction.id,
    realityId:
      reality.id,
    evaluatedMetrics:
      rows.length,
    missingRealityKeys,
    unmatchedRealityKeys,
    mae:
      rows.reduce(
        (sum, row) =>
          sum +
          row.absoluteError,
        0,
      ) /
      rows.length,
    ...(percentageRows.length
      ? {
          mapePercent:
            percentageRows.reduce(
              (sum, row) =>
                sum +
                row.absolutePercentError,
              0,
            ) /
            percentageRows.length,
          medianAbsolutePercentError:
            median(
              percentageRows.map(
                (row) =>
                  row.absolutePercentError,
              ),
            ),
        }
      : {}),
    rows,
    note:
      'Prediction values are evaluated exactly as originally recorded. Reality observations are attached separately with their own timestamps and provenance; validation never rewrites historical predictions.',
  };
}

export function createPredictionSnapshot(
  input: Omit<
    PredictionSnapshot,
    'id' | 'createdAt'
  > & {
    id?: string;
    createdAt?: string;
  },
): PredictionSnapshot {
  return {
    id:
      input.id ??
      crypto.randomUUID(),
    createdAt:
      input.createdAt ??
      new Date().toISOString(),
    deviceName:
      input.deviceName,
    engineVersion:
      input.engineVersion,
    corpusVersion:
      input.corpusVersion,
    simulatorVersion:
      input.simulatorVersion,
    metrics:
      input.metrics.map(
        (metric) => ({
          ...metric,
        }),
      ),
    ...(input.assumptions
      ? {
          assumptions:
            structuredClone(
              input.assumptions,
            ),
        }
      : {}),
    ...(input.note
      ? { note: input.note }
      : {}),
  };
}

export function createRealitySnapshot(
  input: Omit<
    RealitySnapshot,
    'id' | 'createdAt'
  > & {
    id?: string;
    createdAt?: string;
  },
): RealitySnapshot {
  return {
    id:
      input.id ??
      crypto.randomUUID(),
    createdAt:
      input.createdAt ??
      new Date().toISOString(),
    predictionId:
      input.predictionId,
    metrics:
      input.metrics.map(
        (metric) => ({
          ...metric,
        }),
      ),
    ...(input.note
      ? { note: input.note }
      : {}),
  };
}
