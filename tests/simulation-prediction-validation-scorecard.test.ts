import { describe, expect, it } from 'vitest';
import {
  buildPredictionValidationScorecard,
} from '../src/lib/simulation/modules/prediction-validation-scorecard';
import type {
  PredictionValidationResult,
} from '../src/lib/simulation/modules/prediction-validation';

function validation(
  id: string,
  rows: PredictionValidationResult['rows'],
): PredictionValidationResult {
  return {
    version: 'test',
    status: 'resolved',
    predictionId: `p-${id}`,
    realityId: `r-${id}`,
    evaluatedMetrics: rows.length,
    missingRealityKeys: [],
    unmatchedRealityKeys: [],
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
    unitSummaries: [],
    provenanceSummaries: [],
    rows,
    note: 'test',
  };
}

describe('prediction validation scorecard', () => {
  it('aggregates recurring metric bias across predictions without mixing units', () => {
    const scorecard =
      buildPredictionValidationScorecard([
        validation('1', [
          {
            key: 'runtime',
            label: 'Runtime',
            unit: 'hours',
            predicted: 10,
            actual: 8,
            signedError: 2,
            absoluteError: 2,
            signedPercentError: 25,
            absolutePercentError: 25,
            direction:
              'higher-is-better',
            outcome:
              'overpredicted',
            predictionProvenance:
              'measured-calibrated',
          },
        ]),
        validation('2', [
          {
            key: 'runtime',
            label: 'Runtime',
            unit: 'hours',
            predicted: 9,
            actual: 10,
            signedError: -1,
            absoluteError: 1,
            signedPercentError: -10,
            absolutePercentError: 10,
            direction:
              'higher-is-better',
            outcome:
              'underpredicted',
            predictionProvenance:
              'measured-calibrated',
          },
          {
            key: 'runtime',
            label: 'Runtime',
            unit: 'minutes',
            predicted: 600,
            actual: 660,
            signedError: -60,
            absoluteError: 60,
            signedPercentError:
              -60 / 660 * 100,
            absolutePercentError:
              60 / 660 * 100,
            direction:
              'higher-is-better',
            outcome:
              'underpredicted',
            predictionProvenance:
              'derived',
          },
        ]),
      ]);

    expect(scorecard.status).toBe('resolved');
    expect(scorecard.validationCount).toBe(2);
    expect(scorecard.metricRows).toHaveLength(2);

    const hours =
      scorecard.metricRows.find(
        (row) =>
          row.unit === 'hours',
      );

    expect(hours?.observations).toBe(2);
    expect(hours?.accuracyTargetStatus).toBe('insufficient-data');
    expect(hours?.withinOnePercentRate).toBe(0);
    expect(hours?.mae).toBeCloseTo(
      1.5,
      8,
    );
    expect(
      hours?.meanSignedError,
    ).toBeCloseTo(0.5, 8);
  });

  it('separates assumption-adjusted errors from measured-calibrated errors', () => {
    const scorecard =
      buildPredictionValidationScorecard([
        validation('1', [
          {
            key: 'score',
            label: 'Score',
            unit: 'points',
            predicted: 110,
            actual: 100,
            signedError: 10,
            absoluteError: 10,
            signedPercentError: 10,
            absolutePercentError: 10,
            direction: 'neutral',
            outcome:
              'overpredicted',
            predictionProvenance:
              'assumption-adjusted',
          },
          {
            key: 'runtime',
            label: 'Runtime',
            unit: 'hours',
            predicted: 10,
            actual: 10,
            signedError: 0,
            absoluteError: 0,
            signedPercentError: 0,
            absolutePercentError: 0,
            direction: 'neutral',
            outcome: 'exact',
            predictionProvenance:
              'measured-calibrated',
          },
        ]),
      ]);

    expect(
      scorecard.provenanceRows.map(
        (row) => row.provenance,
      ),
    ).toEqual(
      expect.arrayContaining([
        'assumption-adjusted',
        'measured-calibrated',
      ]),
    );
  });

  it('stays unresolved without validated rows', () => {
    const scorecard =
      buildPredictionValidationScorecard(
        [],
      );

    expect(scorecard.status).toBe(
      'unresolved',
    );
  });
});
