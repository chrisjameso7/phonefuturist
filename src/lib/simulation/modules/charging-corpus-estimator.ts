import type { DeviceCorpus } from './device-corpus';
import {
  selectChargingComparables,
  type ChargingComparableQuery,
} from './charging-comparables';

export const CHARGING_CORPUS_ESTIMATOR_VERSION = 'charging-corpus-estimator-0.1.0';

export interface ChargingCurveEstimate {
  version: string;
  status: 'resolved' | 'unresolved';
  unresolvedReason?: string;
  estimate?: {
    basis: 'weighted-comparable-corpus';
    referenceCount: number;
    confidence: number;
    charge30mPercent?: { min: number; expected: number; max: number };
    timeTo50Minutes?: { min: number; expected: number; max: number };
    timeTo80Minutes?: { min: number; expected: number; max: number };
    timeTo100Minutes?: { min: number; expected: number; max: number };
    neighborIds: string[];
    note: string;
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function weightedMean(values: Array<{ value: number; weight: number }>) {
  const totalWeight = values.reduce((sum, item) => sum + item.weight, 0);
  return values.reduce((sum, item) => sum + item.value * item.weight, 0) /
    Math.max(totalWeight, Number.EPSILON);
}

function range(values: number[]) {
  return {
    min: Math.min(...values),
    max: Math.max(...values),
  };
}

function curveTime(targetPercent: number, p30: number, fullMinutes: number) {
  const boundedP30 = clamp(p30, 1, 99.5);
  const boundedFull = Math.max(fullMinutes, 1);

  if (targetPercent <= boundedP30) {
    return 30 * (targetPercent / boundedP30);
  }

  return (
    30 +
    (boundedFull - 30) *
      ((targetPercent - boundedP30) / (100 - boundedP30))
  );
}

export function estimateChargingFromCorpus(
  corpus: DeviceCorpus,
  query: ChargingComparableQuery,
): ChargingCurveEstimate {
  const comparable = selectChargingComparables(corpus, query);

  if (comparable.status !== 'resolved' || !comparable.references.length) {
    return {
      version: CHARGING_CORPUS_ESTIMATOR_VERSION,
      status: 'unresolved',
      unresolvedReason:
        comparable.unresolvedReason ??
        'No usable charging comparables were found.',
    };
  }

  const weights = comparable.references.map((reference) => ({
    reference,
    weight: Math.max(reference.score, 0.05) ** 2,
  }));

  const fullValues = weights.flatMap(({ reference, weight }) =>
    reference.fullChargeMinutes !== undefined
      ? [{ value: reference.fullChargeMinutes, weight }]
      : [],
  );

  const p30Values = weights.flatMap(({ reference, weight }) =>
    reference.thirtyMinutePercent !== undefined
      ? [{ value: reference.thirtyMinutePercent, weight }]
      : [],
  );

  let expectedFull: number | undefined;
  let expectedP30: number | undefined;

  if (fullValues.length) {
    expectedFull = weightedMean(fullValues);
  }

  if (p30Values.length) {
    expectedP30 = weightedMean(p30Values);
  }

  if (expectedFull === undefined && expectedP30 === undefined) {
    return {
      version: CHARGING_CORPUS_ESTIMATOR_VERSION,
      status: 'unresolved',
      unresolvedReason:
        'Comparable devices were found but none had usable charging measurements.',
    };
  }

  const confidence =
    comparable.references.reduce((sum, ref) => sum + ref.score, 0) /
    comparable.references.length;

  const estimate: NonNullable<ChargingCurveEstimate['estimate']> = {
    basis: 'weighted-comparable-corpus',
    referenceCount: comparable.references.length,
    confidence: clamp(confidence, 0, 1),
    neighborIds: comparable.references.map((reference) => reference.deviceVariantId),
    note:
      'Estimate is weighted toward the closest released-device charging references. It preserves measured charging taper where 30-minute and full-charge data exist and does not assume advertised wattage is sustained.',
  };

  if (p30Values.length && expectedP30 !== undefined) {
    const raw = p30Values.map((item) => item.value);
    const r = range(raw);
    estimate.charge30mPercent = {
      min: r.min,
      expected: expectedP30,
      max: r.max,
    };
  }

  if (fullValues.length && expectedFull !== undefined) {
    const raw = fullValues.map((item) => item.value);
    const r = range(raw);
    estimate.timeTo100Minutes = {
      min: r.min,
      expected: expectedFull,
      max: r.max,
    };
  }

  if (expectedFull !== undefined && expectedP30 !== undefined) {
    const t50 = curveTime(50, expectedP30, expectedFull);
    const t80 = curveTime(80, expectedP30, expectedFull);

    const perReference50 = weights.flatMap(({ reference }) =>
      reference.fullChargeMinutes !== undefined &&
      reference.thirtyMinutePercent !== undefined
        ? [
            curveTime(
              50,
              reference.thirtyMinutePercent,
              reference.fullChargeMinutes,
            ),
          ]
        : [],
    );

    const perReference80 = weights.flatMap(({ reference }) =>
      reference.fullChargeMinutes !== undefined &&
      reference.thirtyMinutePercent !== undefined
        ? [
            curveTime(
              80,
              reference.thirtyMinutePercent,
              reference.fullChargeMinutes,
            ),
          ]
        : [],
    );

    if (perReference50.length) {
      const r = range(perReference50);
      estimate.timeTo50Minutes = {
        min: r.min,
        expected: t50,
        max: r.max,
      };
    }

    if (perReference80.length) {
      const r = range(perReference80);
      estimate.timeTo80Minutes = {
        min: r.min,
        expected: t80,
        max: r.max,
      };
    }
  }

  return {
    version: CHARGING_CORPUS_ESTIMATOR_VERSION,
    status: 'resolved',
    estimate,
  };
}
