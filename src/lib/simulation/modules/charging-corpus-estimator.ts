import type { DeviceCorpus } from './device-corpus';
import {
  selectChargingComparables,
  type ChargingComparableQuery,
} from './charging-comparables';
import {
  chargingTimePowerScale,
  resolveChargingPowerResponse,
} from './charging-power-response';
import { resolveChargingThermalContext } from './charging-thermal-context';

export const CHARGING_CORPUS_ESTIMATOR_VERSION = 'charging-corpus-estimator-0.1.0';

export type ChargingConfidenceGrade = 'high' | 'moderate' | 'low';

export interface ChargingCurveEstimate {
  version: string;
  status: 'resolved' | 'unresolved';
  unresolvedReason?: string;
  estimate?: {
    basis: 'weighted-comparable-corpus';
    referenceCount: number;
    confidence: number;
    confidenceGrade: ChargingConfidenceGrade;
    charge30mPercent?: { min: number; expected: number; max: number };
    timeTo50Minutes?: { min: number; expected: number; max: number };
    timeTo80Minutes?: { min: number; expected: number; max: number };
    timeTo100Minutes?: { min: number; expected: number; max: number };
    neighborIds: string[];
    powerResponse?: {
      applied: boolean;
      elasticity?: number;
      confidence?: number;
      evidenceCount: number;
      targetPosition?: 'interpolation' | 'near-extrapolation' | 'far-extrapolation';
      evidenceRangeWatts?: { min: number; max: number };
    };
    thermalContext?: {
      status: 'resolved' | 'unresolved';
      confidenceMultiplier: number;
      matchedMeasurementIds: string[];
      note: string;
    };
    normalized?: {
      expectedFullChargeMahPerMinute?: number;
      expectedMinutesPer1000Mah?: number;
      effectiveFullChargeCPerHour?: number;
      expectedMahAddedIn30Minutes?: number;
    };
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

function reconcileChargingMilestones(
  estimate: NonNullable<ChargingCurveEstimate['estimate']>,
) {
  const t50 = estimate.timeTo50Minutes;
  const t80 = estimate.timeTo80Minutes;
  const t100 = estimate.timeTo100Minutes;

  if (t50 && t80) {
    t80.expected = Math.max(t80.expected, t50.expected);
    t80.min = Math.max(t80.min, t50.min);
    t80.max = Math.max(t80.max, t50.max);
  }

  if (t80 && t100) {
    t100.expected = Math.max(t100.expected, t80.expected);
    t100.min = Math.max(t100.min, t80.min);
    t100.max = Math.max(t100.max, t80.max);
  } else if (t50 && t100) {
    t100.expected = Math.max(t100.expected, t50.expected);
    t100.min = Math.max(t100.min, t50.min);
    t100.max = Math.max(t100.max, t50.max);
  }

  if (
    estimate.charge30mPercent &&
    estimate.timeTo50Minutes?.expected &&
    estimate.charge30mPercent.expected >= 50 &&
    estimate.timeTo50Minutes.expected > 30
  ) {
    estimate.timeTo50Minutes.expected = 30;
  }

  if (
    estimate.charge30mPercent &&
    estimate.timeTo80Minutes?.expected &&
    estimate.charge30mPercent.expected >= 80 &&
    estimate.timeTo80Minutes.expected > 30
  ) {
    estimate.timeTo80Minutes.expected = 30;
  }
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

  const powerResponse = resolveChargingPowerResponse(corpus, {
    manufacturer: query.manufacturer,
    batteryChemistry: query.batteryChemistry,
    cellArchitecture: query.cellArchitecture,
    targetWatts: query.wiredChargingWatts,
  });

  const weights = comparable.references.map((reference) => {
    const capacityScale =
      reference.batteryMah !== undefined && reference.batteryMah > 0
        ? query.batteryMah / reference.batteryMah
        : 1;

    const referenceWatts =
      reference.testChargerWatts ??
      reference.advertisedWiredWatts;

    const powerScale = chargingTimePowerScale(
      referenceWatts,
      query.wiredChargingWatts,
      powerResponse.elasticity,
    );

    return {
      reference,
      weight: Math.max(reference.score, 0.05) ** 2,
      capacityScale,
      powerScale,
    };
  });

  const fullValues = weights.flatMap(
    ({ reference, weight, capacityScale, powerScale }) =>
      reference.fullChargeMinutes !== undefined
        ? [{
            value:
              reference.fullChargeMinutes *
              capacityScale *
              powerScale,
            weight,
          }]
        : [],
  );

  const p30Values = weights.flatMap(
    ({ reference, weight, capacityScale, powerScale }) =>
      reference.thirtyMinutePercent !== undefined
        ? [{
            value: clamp(
              reference.thirtyMinutePercent /
                capacityScale /
                Math.max(powerScale, 0.25),
              0,
              100,
            ),
            weight,
          }]
        : [],
  );

  const t50Values = weights.flatMap(
    ({ reference, weight, capacityScale, powerScale }) =>
      reference.timeTo50Minutes !== undefined
        ? [{
            value:
              reference.timeTo50Minutes *
              capacityScale *
              powerScale,
            weight,
          }]
        : [],
  );

  const t80Values = weights.flatMap(
    ({ reference, weight, capacityScale, powerScale }) =>
      reference.timeTo80Minutes !== undefined
        ? [{
            value:
              reference.timeTo80Minutes *
              capacityScale *
              powerScale,
            weight,
          }]
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

  const neighborIds = new Set(
    comparable.references.map((reference) => reference.deviceVariantId),
  );

  const thermalContext = resolveChargingThermalContext(
    corpus.measurements.filter((measurement) =>
      neighborIds.has(measurement.deviceVariantId),
    ),
    { ambientTemperatureC: query.ambientTemperatureC },
  );

  const adjustedConfidence =
    confidence *
    (powerResponse.status === 'resolved'
      ? powerResponse.confidence ?? 1
      : 0.72) *
    thermalContext.confidenceMultiplier;

  const confidenceGrade: ChargingConfidenceGrade =
    adjustedConfidence >= 0.72
      ? 'high'
      : adjustedConfidence >= 0.48
        ? 'moderate'
        : 'low';

  const estimate: NonNullable<ChargingCurveEstimate['estimate']> = {
    basis: 'weighted-comparable-corpus',
    referenceCount: comparable.references.length,
    confidence: clamp(adjustedConfidence, 0, 1),
    confidenceGrade,
    neighborIds: comparable.references.map((reference) => reference.deviceVariantId),
    thermalContext: {
      status: thermalContext.status,
      confidenceMultiplier: thermalContext.confidenceMultiplier,
      matchedMeasurementIds: thermalContext.matchedMeasurementIds,
      note: thermalContext.note,
    },
    powerResponse: {
      applied: powerResponse.status === 'resolved',
      elasticity: powerResponse.elasticity,
      confidence: powerResponse.confidence,
      evidenceCount: powerResponse.evidence?.length ?? 0,
      targetPosition: powerResponse.targetPosition,
      evidenceRangeWatts: powerResponse.evidenceRangeWatts,
    },
    note:
      powerResponse.status === 'resolved'
        ? 'Estimate is weighted toward the closest released-device charging references. Milestones are normalized for battery capacity and adjusted using charging-power elasticity learned from same-device multi-watt tests. Directly measured 50% and 80% milestones take precedence over interpolation. Advertised wattage is never assumed to be sustained.'
        : 'Estimate is weighted toward the closest released-device charging references and normalized for battery capacity. No reliable same-device multi-watt response curve was available, so wattage extrapolation was not applied. Directly measured 50% and 80% milestones take precedence over interpolation.',
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

  reconcileChargingMilestones(estimate);

  if (estimate.timeTo100Minutes?.expected) {
    const fullMinutes = estimate.timeTo100Minutes.expected;
    estimate.normalized = {
      ...(estimate.normalized ?? {}),
      expectedFullChargeMahPerMinute:
        query.batteryMah / fullMinutes,
      expectedMinutesPer1000Mah:
        fullMinutes / (query.batteryMah / 1000),
      effectiveFullChargeCPerHour:
        60 / fullMinutes,
    };
  }

  if (estimate.charge30mPercent?.expected !== undefined) {
    estimate.normalized = {
      ...(estimate.normalized ?? {}),
      expectedMahAddedIn30Minutes:
        query.batteryMah *
        (estimate.charge30mPercent.expected / 100),
    };
  }

  return {
    version: CHARGING_CORPUS_ESTIMATOR_VERSION,
    status: 'resolved',
    estimate,
  };
}
