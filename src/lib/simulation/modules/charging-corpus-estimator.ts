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

  const weights = comparable.references.map((reference) => {
    const capacityScale =
      reference.batteryMah !== undefined && reference.batteryMah > 0
        ? query.batteryMah / reference.batteryMah
        : 1;

    return {
      reference,
      weight: Math.max(reference.score, 0.05) ** 2,
      capacityScale,
    };
  });

  const fullValues = weights.flatMap(({ reference, weight, capacityScale }) =>
    reference.fullChargeMinutes !== undefined
      ? [{ value: reference.fullChargeMinutes * capacityScale, weight }]
      : [],
  );

  const p30Values = weights.flatMap(({ reference, weight, capacityScale }) =>
    reference.thirtyMinutePercent !== undefined
      ? [{
          value: clamp(reference.thirtyMinutePercent / capacityScale, 0, 100),
          weight,
        }]
      : [],
  );

  const t50Values = weights.flatMap(({ reference, weight, capacityScale }) =>
    reference.timeTo50Minutes !== undefined
      ? [{ value: reference.timeTo50Minutes * capacityScale, weight }]
      : [],
  );

  const t80Values = weights.flatMap(({ reference, weight, capacityScale }) =>
    reference.timeTo80Minutes !== undefined
      ? [{ value: reference.timeTo80Minutes * capacityScale, weight }]
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

  if (expectedFull === undefined && expectedP30 === undefined && !t50Values.length && !t80Values.length) {
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
      'Estimate is weighted toward the closest released-device charging references. Measured milestone times are normalized for battery-capacity differences before aggregation, so equal advertised wattage does not imply equal charge time. Directly measured 50% and 80% milestones take precedence over interpolation. Advertised wattage is never assumed to be sustained.',
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

  if (t50Values.length) {
    const raw = t50Values.map((item) => item.value);
    const r = range(raw);
    estimate.timeTo50Minutes = {
      min: r.min,
      expected: weightedMean(t50Values),
      max: r.max,
    };
  } else if (expectedFull !== undefined && expectedP30 !== undefined) {
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

    if (perReference50.length) {
      const r = range(perReference50);
      estimate.timeTo50Minutes = {
        min: r.min,
        expected: curveTime(50, expectedP30, expectedFull),
        max: r.max,
      };
    }
  }

  if (t80Values.length) {
    const raw = t80Values.map((item) => item.value);
    const r = range(raw);
    estimate.timeTo80Minutes = {
      min: r.min,
      expected: weightedMean(t80Values),
      max: r.max,
    };
  } else if (expectedFull !== undefined && expectedP30 !== undefined) {
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

    if (perReference80.length) {
      const r = range(perReference80);
      estimate.timeTo80Minutes = {
        min: r.min,
        expected: curveTime(80, expectedP30, expectedFull),
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
