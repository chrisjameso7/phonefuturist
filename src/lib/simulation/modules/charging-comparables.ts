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
  protocol?: string;
  protocolVersion?: string;
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
  protocol?: string,
  protocolVersion?: string,
) {
  const candidateSet = new Set(candidates.map((value) => value.toLowerCase()));

  return corpus.measurements
    .filter(
      (measurement) => {
        if (
          measurement.deviceVariantId !== deviceVariantId ||
          measurement.workload !== 'charging' ||
          !candidateSet.has(measurement.metric.toLowerCase())
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
      },
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
    const timeTo50Minutes = latestMetric(corpus, device.variant.id, [
      'wiredTimeTo50Minutes',
      'timeTo50Minutes',
      'charge50Minutes',
    ]);
    const timeTo80Minutes = latestMetric(corpus, device.variant.id, [
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

    return [{
      deviceVariantId: device.variant.id,
      score: candidate.score,
      reasons: candidate.reasons,
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
