import type { DeviceCorpus } from './device-corpus';

export const WIRELESS_CHARGING_ESTIMATOR_VERSION =
  'wireless-charging-estimator-0.1.0';

export interface WirelessChargingQuery {
  batteryMah: number;
  wirelessChargingWatts: number;
  manufacturer?: string;
  batteryChemistry?: string;
  chargingStandard?: string;
}

export interface WirelessChargingEstimate {
  version: string;
  status: 'resolved' | 'unresolved';
  confidence?: number;
  confidenceGrade?: 'high' | 'moderate' | 'low';
  expectedFullChargeMinutes?: number;
  minFullChargeMinutes?: number;
  maxFullChargeMinutes?: number;
  referenceCount?: number;
  neighborIds?: string[];
  note?: string;
  unresolvedReason?: string;
}

function normalize(value?: string) {
  return value?.trim().toLowerCase();
}

function capacityOf(device: DeviceCorpus['devices'][number]) {
  return (
    device.variant.battery?.capacityMah ??
    device.variant.battery?.typicalCapacityMah
  );
}

function closeness(a: number, b: number, tolerance: number) {
  const relative = Math.abs(a - b) / Math.max(Math.abs(b), 1);
  return Math.max(0, 1 - relative / tolerance);
}

export function estimateWirelessChargingFromCorpus(
  corpus: DeviceCorpus,
  query: WirelessChargingQuery,
): WirelessChargingEstimate {
  if (
    !Number.isFinite(query.batteryMah) ||
    query.batteryMah <= 0 ||
    !Number.isFinite(query.wirelessChargingWatts) ||
    query.wirelessChargingWatts <= 0
  ) {
    return {
      version: WIRELESS_CHARGING_ESTIMATOR_VERSION,
      status: 'unresolved',
      unresolvedReason:
        'Battery capacity and wireless charging power must be positive finite values.',
    };
  }

  const references = corpus.devices.flatMap((device) => {
    const capacity = capacityOf(device);
    const advertisedWirelessWatts =
      device.charging?.advertisedWirelessWatts;

    if (!capacity || !advertisedWirelessWatts) return [];

    const measurements = corpus.measurements.filter(
      (measurement) =>
        measurement.deviceVariantId === device.variant.id &&
        measurement.workload === 'charging' &&
        [
          'wirelessfullchargeminutes',
          'wirelesstimetofullminutes',
          'wirelesstimeto100minutes',
        ].includes(measurement.metric.toLowerCase()) &&
        measurement.value > 0,
    );

    if (!measurements.length) return [];

    let score = 0;
    let weight = 0;

    const capacityScore = closeness(capacity, query.batteryMah, 0.35);
    score += capacityScore * 4;
    weight += 4;

    const measuredModeWatts =
      measurements[0]?.testChargerWatts ??
      advertisedWirelessWatts;

    const powerScore = closeness(
      measuredModeWatts,
      query.wirelessChargingWatts,
      0.7,
    );
    score += powerScore * 3;
    weight += 3;

    if (
      query.manufacturer &&
      normalize(device.variant.identity.manufacturer) ===
        normalize(query.manufacturer)
    ) {
      score += 1.5;
      weight += 1.5;
    } else if (query.manufacturer) {
      weight += 1.5;
    }

    if (query.chargingStandard) {
      const standardMatches = measurements.some(
        (measurement) =>
          measurement.chargingStandard &&
          (
            measurement.chargingStandard
              .toLowerCase()
              .includes(query.chargingStandard!.toLowerCase()) ||
            query.chargingStandard!
              .toLowerCase()
              .includes(measurement.chargingStandard.toLowerCase())
          ),
      );

      score += (standardMatches ? 1 : 0) * 2;
      weight += 2;
    }

    if (
      query.batteryChemistry &&
      device.variant.battery?.chemistry
    ) {
      const same =
        normalize(device.variant.battery.chemistry) ===
        normalize(query.batteryChemistry);
      score += (same ? 1 : 0) * 1.5;
      weight += 1.5;
    }

    const similarity = weight > 0 ? score / weight : 0;
    const capacityScale = query.batteryMah / capacity;

    return measurements.map((measurement) => ({
      deviceVariantId: device.variant.id,
      value: measurement.value * capacityScale,
      score: similarity,
      testChargerWatts:
        measurement.testChargerWatts ??
        advertisedWirelessWatts,
      chargingStandard: measurement.chargingStandard,
    }));
  });

  if (!references.length) {
    return {
      version: WIRELESS_CHARGING_ESTIMATOR_VERSION,
      status: 'unresolved',
      unresolvedReason:
        'No comparable devices with measured wireless full-charge evidence were found.',
    };
  }

  const weighted = references.map((reference) => ({
    ...reference,
    weight: Math.max(reference.score, 0.05) ** 2,
  }));

  const totalWeight = weighted.reduce(
    (sum, reference) => sum + reference.weight,
    0,
  );

  const expected =
    weighted.reduce(
      (sum, reference) =>
        sum + reference.value * reference.weight,
      0,
    ) / Math.max(totalWeight, Number.EPSILON);

  const values = weighted.map((reference) => reference.value);
  const confidence =
    weighted.reduce(
      (sum, reference) => sum + reference.score,
      0,
    ) / weighted.length;

  const boundedConfidence = Math.max(0, Math.min(1, confidence));

  return {
    version: WIRELESS_CHARGING_ESTIMATOR_VERSION,
    status: 'resolved',
    confidence: boundedConfidence,
    confidenceGrade:
      boundedConfidence >= 0.72
        ? 'high'
        : boundedConfidence >= 0.48
          ? 'moderate'
          : 'low',
    expectedFullChargeMinutes: expected,
    minFullChargeMinutes: Math.min(...values),
    maxFullChargeMinutes: Math.max(...values),
    referenceCount: weighted.length,
    neighborIds: [
      ...new Set(weighted.map((reference) => reference.deviceVariantId)),
    ],
    note:
      'Wireless charging is estimated only from measured wireless full-charge evidence and is kept separate from wired charging curves.',
  };
}
