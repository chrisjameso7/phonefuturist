import { describe, expect, it } from 'vitest';
import {
  createPredictionSnapshot,
  createRealitySnapshot,
  validatePredictionAgainstReality,
} from '../src/lib/simulation/modules/prediction-validation';

describe('prediction versus reality validation', () => {
  it('computes signed and absolute error without mutating the prediction', () => {
    const prediction =
      createPredictionSnapshot({
        id: 'prediction-1',
        createdAt:
          '2026-01-01T00:00:00.000Z',
        deviceName: 'Future Phone',
        engineVersion: '0.6.0',
        corpusVersion: 'corpus-a',
        metrics: [
          {
            key: 'battery_capacity',
            label: 'Battery capacity',
            value: 5700,
            unit: 'mAh',
            direction: 'higher-is-better',
            provenance: 'assumption-adjusted',
          },
          {
            key: 'full_charge',
            label: '0-100% charging',
            value: 55,
            unit: 'minutes',
            direction: 'lower-is-better',
            provenance: 'measured-calibrated',
          },
        ],
      });

    const before =
      structuredClone(prediction);

    const reality =
      createRealitySnapshot({
        id: 'reality-1',
        predictionId: prediction.id,
        createdAt:
          '2026-09-01T00:00:00.000Z',
        metrics: [
          {
            key: 'battery_capacity',
            value: 5600,
            unit: 'mAh',
            measuredAt:
              '2026-09-01T00:00:00.000Z',
            sourceId: 'official',
            sourcePublisher: 'Manufacturer',
          },
          {
            key: 'full_charge',
            value: 60,
            unit: 'minutes',
            measuredAt:
              '2026-09-10T00:00:00.000Z',
            sourceId: 'lab',
            sourcePublisher: 'Lab',
          },
        ],
      });

    const result =
      validatePredictionAgainstReality(
        prediction,
        reality,
      );

    expect(result.status).toBe('resolved');
    expect(result.evaluatedMetrics).toBe(2);

    const battery = result.rows.find(
      (row) =>
        row.key === 'battery_capacity',
    );

    expect(
      battery?.signedError,
    ).toBe(100);
    expect(
      battery?.absolutePercentError,
    ).toBeCloseTo(
      100 / 5600 * 100,
      8,
    );
    expect(
      battery?.desirabilityOutcome,
    ).toBe('worse-than-predicted');

    const charging = result.rows.find(
      (row) => row.key === 'full_charge',
    );

    expect(
      charging?.signedError,
    ).toBe(-5);
    expect(
      charging?.outcome,
    ).toBe('underpredicted');
    expect(
      charging?.desirabilityOutcome,
    ).toBe('worse-than-predicted');

    expect(result.mae).toBeUndefined();
    expect(result.unitSummaries).toHaveLength(2);
    expect(
      result.provenanceSummaries.some(
        (summary) =>
          summary.provenance ===
          'assumption-adjusted',
      ),
    ).toBe(true);
    expect(
      result.meanSignedPercentError,
    ).toBeDefined();

    expect(prediction).toEqual(before);
  });

  it('returns partial validation when reality has not resolved every predicted metric', () => {
    const prediction =
      createPredictionSnapshot({
        id: 'p',
        deviceName: 'Phone',
        metrics: [
          {
            key: 'a',
            label: 'A',
            value: 10,
            unit: 'points',
          },
          {
            key: 'b',
            label: 'B',
            value: 20,
            unit: 'points',
          },
        ],
      });

    const reality =
      createRealitySnapshot({
        id: 'r',
        predictionId: 'p',
        metrics: [
          {
            key: 'a',
            value: 12,
            unit: 'points',
            measuredAt:
              '2026-10-01T00:00:00.000Z',
          },
        ],
      });

    const result =
      validatePredictionAgainstReality(
        prediction,
        reality,
      );

    expect(result.status).toBe('partial');
    expect(result.evaluatedMetrics).toBe(1);
    expect(
      result.missingRealityKeys,
    ).toContain('b');
  });

  it('does not compare matching keys with incompatible units', () => {
    const prediction =
      createPredictionSnapshot({
        id: 'p',
        deviceName: 'Phone',
        metrics: [
          {
            key: 'runtime',
            label: 'Runtime',
            value: 10,
            unit: 'hours',
          },
        ],
      });

    const reality =
      createRealitySnapshot({
        id: 'r',
        predictionId: 'p',
        metrics: [
          {
            key: 'runtime',
            value: 600,
            unit: 'minutes',
            measuredAt:
              '2026-10-01T00:00:00.000Z',
          },
        ],
      });

    const result =
      validatePredictionAgainstReality(
        prediction,
        reality,
      );

    expect(result.status).toBe('unresolved');
    expect(result.evaluatedMetrics).toBe(0);
  });

  it('emits raw MAE when all validated rows share one unit', () => {
    const prediction =
      createPredictionSnapshot({
        id: 'same-unit',
        deviceName: 'Phone',
        metrics: [
          {
            key: 'a',
            label: 'A',
            value: 100,
            unit: 'points',
            provenance:
              'measured-calibrated',
          },
          {
            key: 'b',
            label: 'B',
            value: 200,
            unit: 'points',
            provenance:
              'measured-calibrated',
          },
        ],
      });

    const reality =
      createRealitySnapshot({
        id: 'same-unit-reality',
        predictionId: 'same-unit',
        metrics: [
          {
            key: 'a',
            value: 90,
            unit: 'points',
            measuredAt:
              '2026-10-01T00:00:00.000Z',
          },
          {
            key: 'b',
            value: 220,
            unit: 'points',
            measuredAt:
              '2026-10-01T00:00:00.000Z',
          },
        ],
      });

    const result =
      validatePredictionAgainstReality(
        prediction,
        reality,
      );

    expect(result.mae).toBeCloseTo(15, 8);
    expect(result.unitSummaries).toHaveLength(1);
    expect(
      result.unitSummaries[0].meanSignedError,
    ).toBeCloseTo(-5, 8);
  });

  it('rejects a reality snapshot attached to the wrong historical prediction', () => {
    const prediction =
      createPredictionSnapshot({
        id: 'prediction-a',
        deviceName: 'Phone',
        metrics: [
          {
            key: 'score',
            label: 'Score',
            value: 100,
            unit: 'points',
          },
        ],
      });

    const reality =
      createRealitySnapshot({
        id: 'reality',
        predictionId: 'prediction-b',
        metrics: [
          {
            key: 'score',
            value: 100,
            unit: 'points',
            measuredAt:
              '2026-10-01T00:00:00.000Z',
          },
        ],
      });

    const result =
      validatePredictionAgainstReality(
        prediction,
        reality,
      );

    expect(result.status).toBe('unresolved');
    expect(result.evaluatedMetrics).toBe(0);
  });
});
