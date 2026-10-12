import type { DeviceCorpus, DeviceCorpusRecord } from './device-corpus';

export const CHARGING_POWER_RESPONSE_VERSION =
  'charging-power-response-0.1.0';

export interface ChargingPowerResponseQuery {
  manufacturer?: string;
  batteryChemistry?: string;
  cellArchitecture?: 'single-cell' | 'dual-cell' | 'unknown';
  targetWatts: number;
}

export interface ChargingPowerResponseEvidence {
  deviceVariantId: string;
  lowWatts: number;
  highWatts: number;
  lowFullChargeMinutes: number;
  highFullChargeMinutes: number;
  elasticity: number;
  manufacturer: string;
  batteryChemistry?: string;
  cellArchitecture?: 'single-cell' | 'dual-cell' | 'unknown';
}

export interface EarlyChargePowerResponseEvidence {
  deviceVariantId: string;
  lowWatts: number;
  highWatts: number;
  lowThirtyMinutePercent: number;
  highThirtyMinutePercent: number;
  elasticity: number;
  manufacturer: string;
  batteryChemistry?: string;
  cellArchitecture?: 'single-cell' | 'dual-cell' | 'unknown';
}

export interface ChargingPowerResponse {
  version: string;
  status: 'resolved' | 'unresolved';
  elasticity?: number;
  earlyChargeElasticity?: number;
  earlyChargeConfidence?: number;
  earlyEvidence?: EarlyChargePowerResponseEvidence[];
  confidence?: number;
  evidence?: ChargingPowerResponseEvidence[];
  targetPosition?: 'interpolation' | 'near-extrapolation' | 'far-extrapolation';
  evidenceRangeWatts?: { min: number; max: number };
  note?: string;
}

function normalize(value?: string) {
  return value?.trim().toLowerCase();
}

function fullChargeMetric(metric: string) {
  const value = metric.toLowerCase();
  return (
    value === 'wiredfullchargeminutes' ||
    value === 'fullchargeminutes' ||
    value === 'timeto100minutes'
  );
}

function thirtyMinuteMetric(metric: string) {
  const value = metric.toLowerCase();
  return (
    value === 'wiredthirtyminutepercent' ||
    value === 'charge30mpercent' ||
    value === 'thirtyminutepercent'
  );
}

function capacityChemistry(device: DeviceCorpusRecord) {
  return device.variant.battery?.chemistry;
}

function effectiveChargingWatts(
  measurement: DeviceCorpus['measurements'][number],
) {
  if (
    measurement.measuredPeakWatts !== undefined &&
    Number.isFinite(measurement.measuredPeakWatts) &&
    measurement.measuredPeakWatts > 0
  ) {
    return measurement.measuredPeakWatts;
  }

  if (
    measurement.testChargerWatts !== undefined &&
    Number.isFinite(measurement.testChargerWatts) &&
    measurement.testChargerWatts > 0
  ) {
    return measurement.testChargerWatts;
  }

  return undefined;
}

export function collectChargingPowerResponseEvidence(
  corpus: DeviceCorpus,
): ChargingPowerResponseEvidence[] {
  const evidence: ChargingPowerResponseEvidence[] = [];

  for (const device of corpus.devices) {
    const full = corpus.measurements.filter(
      (measurement) =>
        measurement.deviceVariantId === device.variant.id &&
        measurement.workload === 'charging' &&
        fullChargeMetric(measurement.metric) &&
        effectiveChargingWatts(measurement) !== undefined &&
        measurement.value > 0,
    );

    for (let i = 0; i < full.length; i += 1) {
      for (let j = i + 1; j < full.length; j += 1) {
        const a = full[i];
        const b = full[j];

        const aWatts =
          effectiveChargingWatts(a);
        const bWatts =
          effectiveChargingWatts(b);

        if (
          aWatts === undefined ||
          bWatts === undefined ||
          Math.abs(aWatts - bWatts) < 0.25
        ) {
          continue;
        }

        const low =
          aWatts < bWatts ? a : b;
        const high = low === a ? b : a;
        const lowWatts =
          Math.min(aWatts, bWatts);
        const highWatts =
          Math.max(aWatts, bWatts);

        if (
          low.value <= high.value
        ) {
          continue;
        }

        const elasticity =
          Math.log(low.value / high.value) /
          Math.log(highWatts / lowWatts);

        if (
          !Number.isFinite(elasticity) ||
          elasticity <= 0 ||
          elasticity > 1.5
        ) {
          continue;
        }

        evidence.push({
          deviceVariantId: device.variant.id,
          lowWatts,
          highWatts,
          lowFullChargeMinutes: low.value,
          highFullChargeMinutes: high.value,
          elasticity,
          manufacturer: device.variant.identity.manufacturer,
          batteryChemistry: capacityChemistry(device),
          cellArchitecture: device.charging?.cellArchitecture,
        });
      }
    }
  }

  return evidence;
}

export function collectEarlyChargePowerResponseEvidence(
  corpus: DeviceCorpus,
): EarlyChargePowerResponseEvidence[] {
  const evidence: EarlyChargePowerResponseEvidence[] = [];

  for (const device of corpus.devices) {
    const p30 = corpus.measurements.filter(
      (measurement) =>
        measurement.deviceVariantId === device.variant.id &&
        measurement.workload === 'charging' &&
        thirtyMinuteMetric(measurement.metric) &&
        measurement.testChargerWatts !== undefined &&
        measurement.testChargerWatts > 0 &&
        measurement.value > 0 &&
        measurement.value <= 100,
    );

    for (let i = 0; i < p30.length; i += 1) {
      for (let j = i + 1; j < p30.length; j += 1) {
        const a = p30[i];
        const b = p30[j];

        const aWatts =
          effectiveChargingWatts(a);
        const bWatts =
          effectiveChargingWatts(b);

        if (
          aWatts === undefined ||
          bWatts === undefined ||
          Math.abs(aWatts - bWatts) < 0.25
        ) {
          continue;
        }

        const low =
          aWatts < bWatts ? a : b;
        const high = low === a ? b : a;
        const lowWatts =
          Math.min(aWatts, bWatts);
        const highWatts =
          Math.max(aWatts, bWatts);

        if (
          high.value <= low.value
        ) {
          continue;
        }

        const elasticity =
          Math.log(high.value / low.value) /
          Math.log(highWatts / lowWatts);

        if (
          !Number.isFinite(elasticity) ||
          elasticity <= 0 ||
          elasticity > 1.5
        ) {
          continue;
        }

        evidence.push({
          deviceVariantId: device.variant.id,
          lowWatts,
          highWatts,
          lowThirtyMinutePercent: low.value,
          highThirtyMinutePercent: high.value,
          elasticity,
          manufacturer: device.variant.identity.manufacturer,
          batteryChemistry: capacityChemistry(device),
          cellArchitecture: device.charging?.cellArchitecture,
        });
      }
    }
  }

  return evidence;
}

function evidenceWeight(
  item: Pick<
    ChargingPowerResponseEvidence,
    | 'manufacturer'
    | 'batteryChemistry'
    | 'cellArchitecture'
    | 'lowWatts'
    | 'highWatts'
  >,
  query: ChargingPowerResponseQuery,
) {
  let weight = 1;

  if (
    query.manufacturer &&
    normalize(item.manufacturer) === normalize(query.manufacturer)
  ) {
    weight += 3;
  }

  if (
    query.batteryChemistry &&
    item.batteryChemistry &&
    normalize(item.batteryChemistry) === normalize(query.batteryChemistry)
  ) {
    weight += 2;
  }

  if (
    query.cellArchitecture &&
    item.cellArchitecture === query.cellArchitecture
  ) {
    weight += 2.5;
  }

  if (
    query.targetWatts >= item.lowWatts &&
    query.targetWatts <= item.highWatts
  ) {
    weight += 2;
  }

  return weight;
}

export function resolveChargingPowerResponse(
  corpus: DeviceCorpus,
  query: ChargingPowerResponseQuery,
): ChargingPowerResponse {
  if (!Number.isFinite(query.targetWatts) || query.targetWatts <= 0) {
    return {
      version: CHARGING_POWER_RESPONSE_VERSION,
      status: 'unresolved',
      note: 'Target charging power must be positive.',
    };
  }

  const evidence = collectChargingPowerResponseEvidence(corpus);
  const earlyEvidence =
    collectEarlyChargePowerResponseEvidence(corpus);

  if (!evidence.length) {
    return {
      version: CHARGING_POWER_RESPONSE_VERSION,
      status: 'unresolved',
      note:
        'No same-device multi-watt full-charge measurements are available.',
    };
  }

  const weighted = evidence.map((item) => ({
    item,
    weight: evidenceWeight(item, query),
  }));

  const earlyWeighted = earlyEvidence.map((item) => ({
    item,
    weight: evidenceWeight(item, query),
  }));

  const evidenceMinWatts = Math.min(...evidence.map((item) => item.lowWatts));
  const evidenceMaxWatts = Math.max(...evidence.map((item) => item.highWatts));

  const targetPosition: ChargingPowerResponse['targetPosition'] =
    query.targetWatts >= evidenceMinWatts &&
    query.targetWatts <= evidenceMaxWatts
      ? 'interpolation'
      : query.targetWatts >= evidenceMinWatts * 0.75 &&
          query.targetWatts <= evidenceMaxWatts * 1.25
        ? 'near-extrapolation'
        : 'far-extrapolation';

  const totalWeight = weighted.reduce((sum, row) => sum + row.weight, 0);
  const elasticity =
    weighted.reduce(
      (sum, row) => sum + row.item.elasticity * row.weight,
      0,
    ) / totalWeight;

  const strongMatches = weighted.filter((row) => row.weight >= 5).length;
  const baseConfidence = Math.min(
    1,
    0.35 +
      Math.min(evidence.length, 6) * 0.07 +
      Math.min(strongMatches, 3) * 0.08,
  );

  const positionPenalty =
    targetPosition === 'interpolation'
      ? 1
      : targetPosition === 'near-extrapolation'
        ? 0.75
        : 0.4;

  const confidence = baseConfidence * positionPenalty;

  const earlyTotalWeight = earlyWeighted.reduce(
    (sum, row) => sum + row.weight,
    0,
  );
  const earlyChargeElasticity =
    earlyTotalWeight > 0
      ? earlyWeighted.reduce(
          (sum, row) =>
            sum + row.item.elasticity * row.weight,
          0,
        ) / earlyTotalWeight
      : undefined;
  const earlyStrongMatches = earlyWeighted.filter(
    (row) => row.weight >= 5,
  ).length;
  const earlyChargeConfidence =
    earlyChargeElasticity !== undefined
      ? Math.min(
          1,
          0.3 +
            Math.min(earlyEvidence.length, 6) * 0.08 +
            Math.min(earlyStrongMatches, 3) * 0.08,
        ) * positionPenalty
      : undefined;

  return {
    version: CHARGING_POWER_RESPONSE_VERSION,
    status: 'resolved',
    elasticity,
    earlyChargeElasticity,
    earlyChargeConfidence,
    earlyEvidence: earlyWeighted
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 6)
      .map((row) => row.item),
    confidence,
    targetPosition,
    evidenceRangeWatts: {
      min: evidenceMinWatts,
      max: evidenceMaxWatts,
    },
    evidence: weighted
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 6)
      .map((row) => row.item),
    note:
      targetPosition === 'interpolation'
        ? 'Elasticity is learned from same-device charging tests at different charger powers. The target wattage sits inside the observed evidence range.'
        : targetPosition === 'near-extrapolation'
          ? 'Elasticity is learned from same-device charging tests, but the target wattage sits slightly outside the observed range. Confidence is reduced.'
          : 'The target wattage sits well outside the observed evidence range. The learned elasticity is retained only as a low-confidence extrapolation aid.',
  };
}

export function chargingTimePowerScale(
  referenceWatts: number | undefined,
  targetWatts: number,
  elasticity: number | undefined,
) {
  if (
    referenceWatts === undefined ||
    referenceWatts <= 0 ||
    targetWatts <= 0 ||
    elasticity === undefined
  ) {
    return 1;
  }

  return (targetWatts / referenceWatts) ** -elasticity;
}
