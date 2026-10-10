import type { DeviceCorpus, DeviceCorpusRecord, CorpusMeasurement } from './device-corpus';
import { findComparableDevices } from './comparable-devices';

export const CHARGING_COMPARABLE_MODEL_VERSION = 'charging-comparable-0.1.0';

export interface ChargingComparableQuery {
  deviceVariantId?: string;
  batteryMah: number;
  batteryChemistry?: string;
  wiredChargingWatts: number;
  wirelessChargingWatts?: number;
  cellArchitecture?: 'single-cell' | 'dual-cell' | 'unknown';
  manufacturer?: string;
  socVendor?: string;
  region?: string;
  displayDiagonalInches?: number;
  refreshRateHz?: number;
  thicknessMm?: number;
  weightG?: number;
  bodyVolumeMm3?: number;
  coolingClass?: NonNullable<DeviceCorpusRecord['cooling']>['class'];
  limit?: number;
  protocol?: string;
  protocolVersion?: string;
  chargingStandard?: string;
  ambientTemperatureC?: number;
}

export interface ChargingComparableEvidence {
  deviceVariantId: string;
  score: number;
  reasons: string[];
  fullChargeMinutes?: number;
  thirtyMinutePercent?: number;
  timeTo50Minutes?: number;
  timeTo80Minutes?: number;
  advertisedWiredWatts?: number;
  batteryMah?: number;
  sourceId?: string;
  sourcePublisher?: string;
  testChargerWatts?: number;
  chargingStandard?: string;
  measuredPeakWatts?: number;
}

export interface ChargingComparableResult {
  version: string;
  status: 'resolved' | 'unresolved';
  references: ChargingComparableEvidence[];
  unresolvedReason?: string;
}

function groupedChargingEvidence(
  corpus: DeviceCorpus,
  deviceVariantId: string,
  protocol?: string,
  protocolVersion?: string,
) {
  const measurements = corpus.measurements.filter((measurement) => {
    if (
      measurement.deviceVariantId !== deviceVariantId ||
      measurement.workload !== 'charging' ||
      measurement.evidenceKind !== 'measured'
    ) {
      return false;
    }

    if (!protocol && !protocolVersion) return true;

    const source = corpus.sources.find(
      (candidate) => candidate.id === measurement.sourceId,
    );

    if (!source) return false;
    if (protocol && source.protocol !== protocol) return false;
    if (
      protocolVersion &&
      source.protocolVersion !== protocolVersion
    ) {
      return false;
    }

    return true;
  });

  const grouped = new Map<string, typeof measurements>();

  for (const measurement of measurements) {
    const key = [
      measurement.sourceId,
      measurement.testChargerWatts ?? 'unknown-w',
      measurement.chargingStandard ?? 'unknown-standard',
    ].join('|');

    const list = grouped.get(key) ?? [];
    list.push(measurement);
    grouped.set(key, list);
  }

  return [...grouped.values()];
}

function metricFromGroup(
  group: CorpusMeasurement[],
  candidates: string[],
) {
  const candidateSet = new Set(
    candidates.map((value) => value.toLowerCase()),
  );

  return group.find((measurement) =>
    candidateSet.has(measurement.metric.toLowerCase()),
  )?.value;
}

function modeAdjustedScore(
  baseScore: number,
  query: ChargingComparableQuery,
  testChargerWatts?: number,
  chargingStandard?: string,
) {
  let score = baseScore;
  let weight = 1;

  if (
    testChargerWatts !== undefined &&
    testChargerWatts > 0 &&
    query.wiredChargingWatts > 0
  ) {
    const ratio =
      Math.min(testChargerWatts, query.wiredChargingWatts) /
      Math.max(testChargerWatts, query.wiredChargingWatts);
    score += ratio * 0.75;
    weight += 0.75;
  }

  if (query.chargingStandard && chargingStandard) {
    const same =
      chargingStandard.toLowerCase().includes(
        query.chargingStandard.toLowerCase(),
      ) ||
      query.chargingStandard.toLowerCase().includes(
        chargingStandard.toLowerCase(),
      );
    score += (same ? 1 : 0) * 1.25;
    weight += 1.25;
  }

  return Math.max(0, Math.min(1, score / weight));
}

export function selectChargingComparables(
  corpus: DeviceCorpus,
  query: ChargingComparableQuery,
): ChargingComparableResult {
  if (
    !Number.isFinite(query.batteryMah) ||
    query.batteryMah <= 0 ||
    !Number.isFinite(query.wiredChargingWatts) ||
    query.wiredChargingWatts <= 0
  ) {
    return {
      version: CHARGING_COMPARABLE_MODEL_VERSION,
      status: 'unresolved',
      references: [],
      unresolvedReason:
        'Battery capacity and wired charging power must be positive finite values.',
    };
  }

  const sourceById = new Map(
    corpus.sources.map(
      (source) => [source.id, source],
    ),
  );

  const candidates = findComparableDevices(corpus, {
    batteryMah: query.batteryMah,
    batteryChemistry: query.batteryChemistry,
    wiredChargingWatts: query.wiredChargingWatts,
    wirelessChargingWatts: query.wirelessChargingWatts,
    cellArchitecture: query.cellArchitecture,
    manufacturer: query.manufacturer,
    socVendor: query.socVendor,
    region: query.region,
    displayDiagonalInches: query.displayDiagonalInches,
    refreshRateHz: query.refreshRateHz,
    thicknessMm: query.thicknessMm,
    weightG: query.weightG,
    bodyVolumeMm3: query.bodyVolumeMm3,
    coolingClass: query.coolingClass,
    limit: Math.max(query.limit ?? 8, 8),
  });

  const references = candidates.flatMap((candidate) => {
    const device = candidate.device;
    const groups = groupedChargingEvidence(
      corpus,
      device.variant.id,
      query.protocol,
      query.protocolVersion,
    );

    return groups.flatMap((group) => {
      const fullChargeMinutes = metricFromGroup(group, [
        'wiredFullChargeMinutes',
        'fullChargeMinutes',
        'timeTo100Minutes',
      ]);
      const thirtyMinutePercent = metricFromGroup(group, [
        'wiredThirtyMinutePercent',
        'charge30mPercent',
        'thirtyMinutePercent',
      ]);
      const timeTo50Minutes = metricFromGroup(group, [
        'wiredTimeTo50Minutes',
        'timeTo50Minutes',
        'charge50Minutes',
      ]);
      const timeTo80Minutes = metricFromGroup(group, [
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
        return [];
      }

      const first = group[0];
      const adjustedScore = modeAdjustedScore(
        candidate.score,
        query,
        first.testChargerWatts,
        first.chargingStandard,
      );

      return [{
        deviceVariantId: device.variant.id,
        score: adjustedScore,
        reasons: candidate.reasons,
        sourceId: first.sourceId,
        ...(sourceById.get(first.sourceId)?.publisher
          ? {
              sourcePublisher:
                sourceById.get(first.sourceId)!
                  .publisher,
            }
          : {}),
        ...(first.testChargerWatts !== undefined
          ? { testChargerWatts: first.testChargerWatts }
          : {}),
        ...(first.chargingStandard
          ? { chargingStandard: first.chargingStandard }
          : {}),
        ...(first.measuredPeakWatts !== undefined
          ? { measuredPeakWatts: first.measuredPeakWatts }
          : {}),
        ...(fullChargeMinutes !== undefined ? { fullChargeMinutes } : {}),
        ...(thirtyMinutePercent !== undefined
          ? { thirtyMinutePercent }
          : {}),
        ...(timeTo50Minutes !== undefined
          ? { timeTo50Minutes }
          : {}),
        ...(timeTo80Minutes !== undefined
          ? { timeTo80Minutes }
          : {}),
        ...(device.charging?.advertisedWiredWatts !== undefined
          ? {
              advertisedWiredWatts:
                device.charging.advertisedWiredWatts,
            }
          : {}),
        ...((device.variant.battery?.capacityMah ??
          device.variant.battery?.typicalCapacityMah) !== undefined
          ? {
              batteryMah:
                device.variant.battery?.capacityMah ??
                device.variant.battery?.typicalCapacityMah,
            }
          : {}),
      }];
    });
  });

  if (!references.length) {
    return {
      version: CHARGING_COMPARABLE_MODEL_VERSION,
      status: 'unresolved',
      references: [],
      unresolvedReason:
        'No comparable devices with measured charging evidence were found.',
    };
  }

  const ranked = references.sort(
    (a, b) => b.score - a.score,
  );

  return {
    version: CHARGING_COMPARABLE_MODEL_VERSION,
    status: 'resolved',
    // A physical device may expose materially different measured charger
    // modes (for example proprietary fast charging vs USB PD/PPS). Keep
    // those modes distinct so the estimator can learn taper and full-charge
    // behavior instead of silently collapsing them into one phone row.
    references: ranked.slice(
      0,
      query.limit ?? 5,
    ),
  };
}
