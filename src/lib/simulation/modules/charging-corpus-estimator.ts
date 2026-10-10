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

export const CHARGING_CORPUS_ESTIMATOR_VERSION = 'charging-corpus-estimator-0.3.0';

export type ChargingConfidenceGrade = 'high' | 'moderate' | 'low';

export interface ChargingCurveEstimate {
  version: string;
  status: 'resolved' | 'unresolved';
  unresolvedReason?: string;
  estimate?: {
    basis:
      | 'exact-measured-mode'
      | 'weighted-comparable-corpus';
    referenceCount: number;
    referenceModeCount: number;
    normalizationBasis: 'wh' | 'mah';
    measurementCount?: number;
    sourceRecordCount: number;
    publisherCount: number;
    confidence: number;
    confidenceGrade: ChargingConfidenceGrade;
    evidenceMode:
      | 'measured-match'
      | 'interpolated'
      | 'near-extrapolated'
      | 'far-extrapolated'
      | 'comparable-only';
    charge30mPercent?: {
      min: number;
      expected: number;
      max: number;
      provenance?: 'measured' | 'derived' | 'comparable';
    };
    timeTo50Minutes?: {
      min: number;
      expected: number;
      max: number;
      provenance?: 'measured' | 'derived' | 'comparable';
    };
    timeTo80Minutes?: {
      min: number;
      expected: number;
      max: number;
      provenance?: 'measured' | 'derived' | 'comparable';
    };
    timeTo100Minutes?: {
      min: number;
      expected: number;
      max: number;
      provenance?: 'measured' | 'derived' | 'comparable';
    };
    neighborIds: string[];
    powerResponse?: {
      applied: boolean;
      elasticity?: number;
      earlyChargeElasticity?: number;
      earlyChargeConfidence?: number;
      confidence?: number;
      evidenceCount: number;
      earlyEvidenceCount?: number;
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
      expectedFullChargeWhPerMinute?: number;
      expectedMinutesPerWh?: number;
      expectedWhAddedIn30Minutes?: number;
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

function normalizeTimeBand(
  band: { min: number; expected: number; max: number },
) {
  band.min = Math.max(0, band.min);
  band.max = Math.max(band.min, band.max);
  band.expected = clamp(band.expected, band.min, band.max);
}

function capMilestoneAtThirtyMinutes(
  band: { min: number; expected: number; max: number },
) {
  band.max = Math.min(band.max, 30);
  band.expected = Math.min(band.expected, 30);
  band.min = Math.min(band.min, band.expected);
  normalizeTimeBand(band);
}


function normalizeChargingStandard(
  value: string,
) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function sameChargingStandard(
  actual: string | undefined,
  requested: string | undefined,
) {
  if (!requested) return true;
  if (!actual) return false;

  return (
    normalizeChargingStandard(actual) ===
    normalizeChargingStandard(requested)
  );
}

function batteryEnergyWhForDevice(
  device: DeviceCorpus['devices'][number] | undefined,
) {
  const battery = device?.variant.battery;
  if (!battery) return undefined;

  const explicit =
    battery.typicalEnergyWh ??
    battery.ratedEnergyWh;

  if (
    explicit !== undefined &&
    Number.isFinite(explicit) &&
    explicit > 0
  ) {
    return explicit;
  }

  const capacity =
    battery.capacityMah ??
    battery.typicalCapacityMah;

  if (
    capacity !== undefined &&
    Number.isFinite(capacity) &&
    capacity > 0 &&
    battery.nominalVoltageV !== undefined &&
    Number.isFinite(battery.nominalVoltageV) &&
    battery.nominalVoltageV > 0
  ) {
    return (
      capacity *
      battery.nominalVoltageV
    ) / 1000;
  }

  return undefined;
}

function exactMeasuredChargingMatch(
  corpus: DeviceCorpus,
  query: ChargingComparableQuery,
) {
  if (!query.deviceVariantId) return undefined;

  const device = corpus.devices.find(
    (candidate) =>
      candidate.variant.id === query.deviceVariantId,
  );

  const measuredCapacityMah =
    device?.variant.battery?.capacityMah ??
    device?.variant.battery?.typicalCapacityMah;

  if (
    measuredCapacityMah === undefined ||
    Math.abs(
      measuredCapacityMah - query.batteryMah,
    ) > 1
  ) {
    return undefined;
  }

  const measuredEnergyWh =
    batteryEnergyWhForDevice(device);

  if (
    query.batteryEnergyWh !== undefined &&
    Number.isFinite(query.batteryEnergyWh) &&
    query.batteryEnergyWh > 0 &&
    measuredEnergyWh !== undefined
  ) {
    const relativeEnergyDifference =
      Math.abs(
        measuredEnergyWh -
        query.batteryEnergyWh,
      ) /
      Math.max(measuredEnergyWh, 0.001);

    if (relativeEnergyDifference > 0.01) {
      return undefined;
    }
  }

  const measurements = corpus.measurements.filter(
    (measurement) =>
      measurement.deviceVariantId === query.deviceVariantId &&
      measurement.workload === 'charging' &&
      measurement.evidenceKind === 'measured' &&
      measurement.testChargerWatts !== undefined &&
      Math.abs(
        measurement.testChargerWatts -
          query.wiredChargingWatts,
      ) <= 0.1 &&
      sameChargingStandard(
        measurement.chargingStandard,
        query.chargingStandard,
      ),
  );

  if (!measurements.length) return undefined;

  const metric = (names: string[]) => {
    const set = new Set(names.map((name) => name.toLowerCase()));
    return measurements.find((measurement) =>
      set.has(measurement.metric.toLowerCase()),
    )?.value;
  };

  const fullChargeMinutes = metric([
    'wiredFullChargeMinutes',
    'fullChargeMinutes',
    'timeTo100Minutes',
  ]);
  const thirtyMinutePercent = metric([
    'wiredThirtyMinutePercent',
    'charge30mPercent',
    'thirtyMinutePercent',
  ]);
  const timeTo50Minutes = metric([
    'wiredTimeTo50Minutes',
    'timeTo50Minutes',
    'charge50Minutes',
  ]);
  const timeTo80Minutes = metric([
    'wiredTimeTo80Minutes',
    'timeTo80Minutes',
    'charge80Minutes',
  ]);

  if (
    fullChargeMinutes === undefined &&
    thirtyMinutePercent === undefined &&
    timeTo50Minutes === undefined &&
    timeTo80Minutes === undefined
  ) {
    return undefined;
  }

  return {
    fullChargeMinutes,
    thirtyMinutePercent,
    timeTo50Minutes,
    timeTo80Minutes,
    measurementIds: measurements.map(
      (measurement) => measurement.id,
    ),
    sourceIds: [
      ...new Set(
        measurements.map(
          (measurement) =>
            measurement.sourceId,
        ),
      ),
    ],
  };
}

function reconcileChargingMilestones(
  estimate: NonNullable<ChargingCurveEstimate['estimate']>,
) {
  const t50 = estimate.timeTo50Minutes;
  const t80 = estimate.timeTo80Minutes;
  const t100 = estimate.timeTo100Minutes;
  const p30 = estimate.charge30mPercent;

  if (t50) normalizeTimeBand(t50);
  if (t80) normalizeTimeBand(t80);
  if (t100) normalizeTimeBand(t100);

  if (p30?.expected !== undefined && p30.expected >= 50 && t50) {
    capMilestoneAtThirtyMinutes(t50);
  }

  if (p30?.expected !== undefined && p30.expected >= 80 && t80) {
    capMilestoneAtThirtyMinutes(t80);
  }

  if (t50 && t80) {
    t80.min = Math.max(t80.min, t50.min);
    t80.expected = Math.max(t80.expected, t50.expected);
    t80.max = Math.max(t80.max, t50.max);
    normalizeTimeBand(t80);
  }

  if (t80 && t100) {
    t100.min = Math.max(t100.min, t80.min);
    t100.expected = Math.max(t100.expected, t80.expected);
    t100.max = Math.max(t100.max, t80.max);
    normalizeTimeBand(t100);
  } else if (t50 && t100) {
    t100.min = Math.max(t100.min, t50.min);
    t100.expected = Math.max(t100.expected, t50.expected);
    t100.max = Math.max(t100.max, t50.max);
    normalizeTimeBand(t100);
  }
}

export function estimateChargingFromCorpus(
  corpus: DeviceCorpus,
  query: ChargingComparableQuery,
): ChargingCurveEstimate {
  const exact = exactMeasuredChargingMatch(corpus, query);

  if (exact) {
    const estimate: NonNullable<ChargingCurveEstimate['estimate']> = {
      basis: 'exact-measured-mode',
      referenceCount: 1,
      referenceModeCount: 1,
      normalizationBasis:
        query.batteryEnergyWh !== undefined &&
        Number.isFinite(query.batteryEnergyWh) &&
        query.batteryEnergyWh > 0
          ? 'wh'
          : 'mah',
      measurementCount:
        exact.measurementIds.length,
      sourceRecordCount:
        exact.sourceIds.length,
      publisherCount:
        new Set(
          exact.sourceIds
            .map(
              (sourceId) =>
                corpus.sources.find(
                  (source) =>
                    source.id === sourceId,
                )?.publisher,
            )
            .filter(
              (publisher):
                publisher is string =>
                  Boolean(publisher),
            ),
        ).size,
      confidence: 1,
      confidenceGrade: 'high',
      evidenceMode: 'measured-match',
      neighborIds: [query.deviceVariantId!],
      powerResponse: {
        applied: false,
        evidenceCount: 0,
        earlyEvidenceCount: 0,
      },
      thermalContext: {
        status: 'unresolved',
        confidenceMultiplier: 1,
        matchedMeasurementIds: [],
        note:
          'Exact measured charger-mode evidence was used. Thermal context was not inferred from neighboring devices.',
      },
      note:
        'Exact measured wired charging evidence matched the selected device variant, charger power and charging standard. Comparable-device averaging and wattage extrapolation were not used.',
    };

    if (exact.thirtyMinutePercent !== undefined) {
      estimate.charge30mPercent = {
        min: exact.thirtyMinutePercent,
        expected: exact.thirtyMinutePercent,
        max: exact.thirtyMinutePercent,
        provenance: 'measured',
      };
    }

    if (exact.fullChargeMinutes !== undefined) {
      estimate.timeTo100Minutes = {
        min: exact.fullChargeMinutes,
        expected: exact.fullChargeMinutes,
        max: exact.fullChargeMinutes,
        provenance: 'measured',
      };
    }

    if (exact.timeTo50Minutes !== undefined) {
      estimate.timeTo50Minutes = {
        min: exact.timeTo50Minutes,
        expected: exact.timeTo50Minutes,
        max: exact.timeTo50Minutes,
        provenance: 'measured',
      };
    } else if (
      exact.fullChargeMinutes !== undefined &&
      exact.thirtyMinutePercent !== undefined
    ) {
      const value = curveTime(
        50,
        exact.thirtyMinutePercent,
        exact.fullChargeMinutes,
      );
      estimate.timeTo50Minutes = {
        min: value,
        expected: value,
        max: value,
        provenance: 'derived',
      };
    }

    if (exact.timeTo80Minutes !== undefined) {
      estimate.timeTo80Minutes = {
        min: exact.timeTo80Minutes,
        expected: exact.timeTo80Minutes,
        max: exact.timeTo80Minutes,
        provenance: 'measured',
      };
    } else if (
      exact.fullChargeMinutes !== undefined &&
      exact.thirtyMinutePercent !== undefined
    ) {
      const value = curveTime(
        80,
        exact.thirtyMinutePercent,
        exact.fullChargeMinutes,
      );
      estimate.timeTo80Minutes = {
        min: value,
        expected: value,
        max: value,
        provenance: 'derived',
      };
    }

    reconcileChargingMilestones(estimate);

    if (estimate.timeTo100Minutes?.expected) {
      const fullMinutes = estimate.timeTo100Minutes.expected;
      estimate.normalized = {
        expectedFullChargeMahPerMinute:
          query.batteryMah / fullMinutes,
        expectedMinutesPer1000Mah:
          fullMinutes / (query.batteryMah / 1000),
        effectiveFullChargeCPerHour:
          60 / fullMinutes,
        ...(query.batteryEnergyWh !== undefined &&
        Number.isFinite(query.batteryEnergyWh) &&
        query.batteryEnergyWh > 0
          ? {
              expectedFullChargeWhPerMinute:
                query.batteryEnergyWh /
                fullMinutes,
              expectedMinutesPerWh:
                fullMinutes /
                query.batteryEnergyWh,
            }
          : {}),
      };
    }

    if (estimate.charge30mPercent?.expected !== undefined) {
      estimate.normalized = {
        ...(estimate.normalized ?? {}),
        expectedMahAddedIn30Minutes:
          query.batteryMah *
          (estimate.charge30mPercent.expected / 100),
        ...(query.batteryEnergyWh !== undefined &&
        Number.isFinite(query.batteryEnergyWh) &&
        query.batteryEnergyWh > 0
          ? {
              expectedWhAddedIn30Minutes:
                query.batteryEnergyWh *
                (estimate.charge30mPercent.expected /
                  100),
            }
          : {}),
      };
    }

    return {
      version: CHARGING_CORPUS_ESTIMATOR_VERSION,
      status: 'resolved',
      estimate,
    };
  }

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

  const useWhNormalization =
    query.batteryEnergyWh !== undefined &&
    Number.isFinite(query.batteryEnergyWh) &&
    query.batteryEnergyWh > 0 &&
    comparable.references.every(
      (reference) =>
        reference.batteryEnergyWh !== undefined &&
        Number.isFinite(reference.batteryEnergyWh) &&
        reference.batteryEnergyWh > 0,
    );

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

    const energyScale =
      useWhNormalization &&
      reference.batteryEnergyWh !== undefined
        ? query.batteryEnergyWh! /
          reference.batteryEnergyWh
        : undefined;

    const normalizationScale =
      energyScale ??
      capacityScale;

    const referenceWatts =
      reference.testChargerWatts ??
      reference.advertisedWiredWatts;

    const powerScale = chargingTimePowerScale(
      referenceWatts,
      query.wiredChargingWatts,
      powerResponse.elasticity,
    );

    const earlyPowerScale =
      referenceWatts !== undefined &&
      referenceWatts > 0 &&
      powerResponse.earlyChargeElasticity !== undefined
        ? (
            query.wiredChargingWatts /
            referenceWatts
          ) ** powerResponse.earlyChargeElasticity
        : 1;

    return {
      reference,
      weight: Math.max(reference.score, 0.05) ** 2,
      capacityScale,
      normalizationScale,
      powerScale,
      earlyPowerScale,
    };
  });

  const fullValues = weights.flatMap(
    ({ reference, weight, normalizationScale, powerScale }) =>
      reference.fullChargeMinutes !== undefined
        ? [{
            value:
              reference.fullChargeMinutes *
              normalizationScale *
              powerScale,
            weight,
          }]
        : [],
  );

  const p30Values = weights.flatMap(
    ({
      reference,
      weight,
      normalizationScale,
      earlyPowerScale,
    }) =>
      reference.thirtyMinutePercent !== undefined
        ? [{
            value: clamp(
              reference.thirtyMinutePercent *
                earlyPowerScale /
                normalizationScale,
              0,
              100,
            ),
            weight,
          }]
        : [],
  );

  const t50Values = weights.flatMap(
    ({ reference, weight, normalizationScale, powerScale }) =>
      reference.timeTo50Minutes !== undefined
        ? [{
            value:
              reference.timeTo50Minutes *
              normalizationScale *
              powerScale,
            weight,
          }]
        : [],
  );

  const t80Values = weights.flatMap(
    ({ reference, weight, normalizationScale, powerScale }) =>
      reference.timeTo80Minutes !== undefined
        ? [{
            value:
              reference.timeTo80Minutes *
              normalizationScale *
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
    referenceCount: neighborIds.size,
    referenceModeCount:
      comparable.references.length,
    normalizationBasis:
      useWhNormalization ? 'wh' : 'mah',
    sourceRecordCount:
      new Set(
        comparable.references
          .map(
            (reference) =>
              reference.sourceId,
          )
          .filter(
            (sourceId):
              sourceId is string =>
                Boolean(sourceId),
          ),
      ).size,
    publisherCount:
      new Set(
        comparable.references
          .map(
            (reference) =>
              reference.sourcePublisher,
          )
          .filter(
            (publisher):
              publisher is string =>
                Boolean(publisher),
          ),
      ).size,
    confidence: clamp(adjustedConfidence, 0, 1),
    confidenceGrade,
    evidenceMode:
      powerResponse.status !== 'resolved'
        ? 'comparable-only'
        : powerResponse.targetPosition === 'interpolation'
          ? 'interpolated'
          : powerResponse.targetPosition === 'near-extrapolation'
            ? 'near-extrapolated'
            : 'far-extrapolated',
    neighborIds: [...neighborIds],
    thermalContext: {
      status: thermalContext.status,
      confidenceMultiplier: thermalContext.confidenceMultiplier,
      matchedMeasurementIds: thermalContext.matchedMeasurementIds,
      note: thermalContext.note,
    },
    powerResponse: {
      applied: powerResponse.status === 'resolved',
      elasticity: powerResponse.elasticity,
      earlyChargeElasticity:
        powerResponse.earlyChargeElasticity,
      earlyChargeConfidence:
        powerResponse.earlyChargeConfidence,
      confidence: powerResponse.confidence,
      evidenceCount: powerResponse.evidence?.length ?? 0,
      earlyEvidenceCount:
        powerResponse.earlyEvidence?.length ?? 0,
      targetPosition: powerResponse.targetPosition,
      evidenceRangeWatts: powerResponse.evidenceRangeWatts,
    },
    note:
      powerResponse.status === 'resolved'
        ? `Estimate is weighted toward the closest released-device charging references. Full-charge time and early-charge percentage use separate same-device multi-watt response evidence when available, then normalize for battery ${useWhNormalization ? 'energy (Wh)' : 'capacity (mAh)'}. Directly measured 50% and 80% milestones take precedence over interpolation. Advertised wattage is never assumed to be sustained.`
        : `Estimate is weighted toward the closest released-device charging references and normalized for battery ${useWhNormalization ? 'energy (Wh)' : 'capacity (mAh)'}. No reliable same-device multi-watt response curve was available, so wattage extrapolation was not applied. Directly measured 50% and 80% milestones take precedence over interpolation.`,
  };

  if (p30Values.length && expectedP30 !== undefined) {
    const raw = p30Values.map((item) => item.value);
    const r = range(raw);
    estimate.charge30mPercent = {
      min: r.min,
      expected: expectedP30,
      max: r.max,
      provenance: 'comparable',
    };
  }

  if (fullValues.length && expectedFull !== undefined) {
    const raw = fullValues.map((item) => item.value);
    const r = range(raw);
    estimate.timeTo100Minutes = {
      min: r.min,
      expected: expectedFull,
      max: r.max,
      provenance: 'comparable',
    };
  }

  if (t50Values.length) {
    const raw = t50Values.map((item) => item.value);
    const r = range(raw);
    estimate.timeTo50Minutes = {
      min: r.min,
      expected: weightedMean(t50Values),
      max: r.max,
      provenance: 'comparable',
    };
  } else if (expectedFull !== undefined && expectedP30 !== undefined) {
    const perReference50 = weights.flatMap(
      ({
        reference,
        normalizationScale,
        powerScale,
        earlyPowerScale,
      }) =>
        reference.fullChargeMinutes !== undefined &&
        reference.thirtyMinutePercent !== undefined
          ? [
              curveTime(
                50,
                clamp(
                  reference.thirtyMinutePercent *
                    earlyPowerScale /
                    normalizationScale,
                  0,
                  100,
                ),
                reference.fullChargeMinutes *
                  normalizationScale *
                  powerScale,
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
        provenance: 'derived',
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
      provenance: 'comparable',
    };
  } else if (expectedFull !== undefined && expectedP30 !== undefined) {
    const perReference80 = weights.flatMap(
      ({
        reference,
        normalizationScale,
        powerScale,
        earlyPowerScale,
      }) =>
        reference.fullChargeMinutes !== undefined &&
        reference.thirtyMinutePercent !== undefined
          ? [
              curveTime(
                80,
                clamp(
                  reference.thirtyMinutePercent *
                    earlyPowerScale /
                    normalizationScale,
                  0,
                  100,
                ),
                reference.fullChargeMinutes *
                  normalizationScale *
                  powerScale,
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
        provenance: 'derived',
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
      ...(query.batteryEnergyWh !== undefined &&
      Number.isFinite(query.batteryEnergyWh) &&
      query.batteryEnergyWh > 0
        ? {
            expectedFullChargeWhPerMinute:
              query.batteryEnergyWh /
              fullMinutes,
            expectedMinutesPerWh:
              fullMinutes /
              query.batteryEnergyWh,
          }
        : {}),
    };
  }

  if (estimate.charge30mPercent?.expected !== undefined) {
    estimate.normalized = {
      ...(estimate.normalized ?? {}),
      expectedMahAddedIn30Minutes:
        query.batteryMah *
        (estimate.charge30mPercent.expected / 100),
      ...(query.batteryEnergyWh !== undefined &&
      Number.isFinite(query.batteryEnergyWh) &&
      query.batteryEnergyWh > 0
        ? {
            expectedWhAddedIn30Minutes:
              query.batteryEnergyWh *
              (estimate.charge30mPercent.expected /
                100),
          }
        : {}),
    };
  }

  return {
    version: CHARGING_CORPUS_ESTIMATOR_VERSION,
    status: 'resolved',
    estimate,
  };
}
