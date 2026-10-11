import type {
  MetricValidationRow,
  PredictionValidationResult,
} from './prediction-validation';

export const PREDICTION_VALIDATION_SCORECARD_VERSION =
  'prediction-validation-scorecard-0.1.0';

export interface PredictionMetricScorecardRow {
  key: string;
  unit: string;
  observations: number;
  meanSignedError: number;
  mae: number;
  mapePercent?: number;
  meanSignedPercentError?: number;
  overpredictedCount: number;
  underpredictedCount: number;
  exactCount: number;
}

export interface PredictionProvenanceScorecardRow {
  provenance:
    | MetricValidationRow['predictionProvenance']
    | 'unspecified';
  observations: number;
  mapePercent?: number;
  meanSignedPercentError?: number;
  overpredictedCount: number;
  underpredictedCount: number;
  exactCount: number;
}

export interface PredictionValidationScorecard {
  version: string;
  status: 'resolved' | 'unresolved';
  validationCount: number;
  evaluatedMetricRows: number;
  metricRows: PredictionMetricScorecardRow[];
  provenanceRows: PredictionProvenanceScorecardRow[];
  unresolvedReason?: string;
  note: string;
}

function normalize(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function percentageStats(
  rows: MetricValidationRow[],
) {
  const usable = rows.filter(
    (
      row,
    ): row is MetricValidationRow & {
      absolutePercentError: number;
      signedPercentError: number;
    } =>
      row.absolutePercentError !==
        undefined &&
      row.signedPercentError !==
        undefined,
  );

  if (!usable.length) return {};

  return {
    mapePercent:
      usable.reduce(
        (sum, row) =>
          sum +
          row.absolutePercentError,
        0,
      ) /
      usable.length,
    meanSignedPercentError:
      usable.reduce(
        (sum, row) =>
          sum +
          row.signedPercentError,
        0,
      ) /
      usable.length,
  };
}

function outcomeCounts(
  rows: MetricValidationRow[],
) {
  return {
    overpredictedCount:
      rows.filter(
        (row) =>
          row.outcome ===
          'overpredicted',
      ).length,
    underpredictedCount:
      rows.filter(
        (row) =>
          row.outcome ===
          'underpredicted',
      ).length,
    exactCount:
      rows.filter(
        (row) =>
          row.outcome === 'exact',
      ).length,
  };
}

export function buildPredictionValidationScorecard(
  validations: PredictionValidationResult[],
): PredictionValidationScorecard {
  const usableValidations =
    validations.filter(
      (validation) =>
        validation.status !==
          'unresolved' &&
        validation.rows.length > 0,
    );

  const rows =
    usableValidations.flatMap(
      (validation) =>
        validation.rows,
    );

  if (!rows.length) {
    return {
      version:
        PREDICTION_VALIDATION_SCORECARD_VERSION,
      status: 'unresolved',
      validationCount:
        usableValidations.length,
      evaluatedMetricRows: 0,
      metricRows: [],
      provenanceRows: [],
      unresolvedReason:
        'No resolved prediction/reality metric rows are available.',
      note:
        'Scorecard remains empty until immutable predictions have matching reality observations.',
    };
  }

  const metricGroups =
    new Map<
      string,
      MetricValidationRow[]
    >();

  for (const row of rows) {
    const groupKey = [
      normalize(row.key),
      normalize(row.unit),
    ].join('::');

    const group =
      metricGroups.get(groupKey) ??
      [];
    group.push(row);
    metricGroups.set(
      groupKey,
      group,
    );
  }

  const metricRows =
    [...metricGroups.values()]
      .map((group) => ({
        key: group[0].key,
        unit: group[0].unit,
        observations: group.length,
        meanSignedError:
          group.reduce(
            (sum, row) =>
              sum + row.signedError,
            0,
          ) / group.length,
        mae:
          group.reduce(
            (sum, row) =>
              sum + row.absoluteError,
            0,
          ) / group.length,
        ...percentageStats(group),
        ...outcomeCounts(group),
      }))
      .sort(
        (a, b) =>
          b.observations -
          a.observations,
      );

  const provenanceGroups =
    new Map<
      PredictionProvenanceScorecardRow['provenance'],
      MetricValidationRow[]
    >();

  for (const row of rows) {
    const provenance =
      row.predictionProvenance ??
      'unspecified';
    const group =
      provenanceGroups.get(
        provenance,
      ) ?? [];
    group.push(row);
    provenanceGroups.set(
      provenance,
      group,
    );
  }

  const provenanceRows =
    [...provenanceGroups.entries()]
      .map(
        ([provenance, group]) => ({
          provenance,
          observations: group.length,
          ...percentageStats(group),
          ...outcomeCounts(group),
        }),
      )
      .sort(
        (a, b) =>
          b.observations -
          a.observations,
      );

  return {
    version:
      PREDICTION_VALIDATION_SCORECARD_VERSION,
    status: 'resolved',
    validationCount:
      usableValidations.length,
    evaluatedMetricRows:
      rows.length,
    metricRows,
    provenanceRows,
    note:
      'Scorecard aggregates immutable prediction-vs-reality errors by metric/unit and by prediction provenance. Signed error exposes systematic bias; percentage error enables scale-normalized comparison without mixing raw units.',
  };
}
