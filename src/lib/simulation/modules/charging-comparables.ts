import type { DeviceCorpus, DeviceCorpusRecord } from './device-corpus';
import { findComparableDevices } from './comparable-devices';

export const CHARGING_COMPARABLE_MODEL_VERSION = 'charging-comparable-0.1.0';

export interface ChargingComparableQuery {
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
}

export interface ChargingComparableEvidence {
  deviceVariantId: string;
  score: number;
  reasons: string[];
  fullChargeMinutes?: number;
  thirtyMinutePercent?: number;
  advertisedWiredWatts?: number;
}

export interface ChargingComparableResult {
  version: string;
  status: 'resolved' | 'unresolved';
  references: ChargingComparableEvidence[];
  unresolvedReason?: string;
}

function latestMetric(
  corpus: DeviceCorpus,
  deviceVariantId: string,
  candidates: string[],
) {
  const candidateSet = new Set(candidates.map((value) => value.toLowerCase()));

  return corpus.measurements
    .filter(
      (measurement) =>
        measurement.deviceVariantId === deviceVariantId &&
        measurement.workload === 'charging' &&
        candidateSet.has(measurement.metric.toLowerCase()),
    )
    .at(-1)?.value;
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
    const fullChargeMinutes = latestMetric(corpus, device.variant.id, [
      'wiredFullChargeMinutes',
      'fullChargeMinutes',
      'timeTo100Minutes',
    ]);
    const thirtyMinutePercent = latestMetric(corpus, device.variant.id, [
      'wiredThirtyMinutePercent',
      'charge30mPercent',
      'thirtyMinutePercent',
    ]);

    if (
      fullChargeMinutes === undefined &&
      thirtyMinutePercent === undefined
    ) {
      return [];
    }

    return [{
      deviceVariantId: device.variant.id,
      score: candidate.score,
      reasons: candidate.reasons,
      ...(fullChargeMinutes !== undefined ? { fullChargeMinutes } : {}),
      ...(thirtyMinutePercent !== undefined
        ? { thirtyMinutePercent }
        : {}),
      ...(device.charging?.advertisedWiredWatts !== undefined
        ? {
            advertisedWiredWatts:
              device.charging.advertisedWiredWatts,
          }
        : {}),
    }];
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

  return {
    version: CHARGING_COMPARABLE_MODEL_VERSION,
    status: 'resolved',
    references: references.slice(0, query.limit ?? 5),
  };
}
