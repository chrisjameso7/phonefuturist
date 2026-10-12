import type { DeviceCorpus, DeviceCorpusRecord, CorpusMeasurement } from './device-corpus';
import { findComparableDevices } from './comparable-devices';

export const CHARGING_COMPARABLE_MODEL_VERSION = 'charging-comparable-0.2.0';

export interface ChargingComparableQuery {
  deviceVariantId?: string;
  batteryMah: number;
  batteryEnergyWh?: number;
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
  physicalDeviceKey: string;
  score: number;
  reasons: string[];
  fullChargeMinutes?: number;
  thirtyMinutePercent?: number;
  timeTo50Minutes?: number;
  timeTo80Minutes?: number;
  advertisedWiredWatts?: number;
  batteryMah?: number;
  batteryEnergyWh?: number;
  sourceId?: string;
  sourcePublisher?: string;
  testChargerWatts?: number;
  chargingStandard?: string;
  measuredPeakWatts?: number;
  ambientTemperatureC?: number;
}

export interface ChargingComparableResult {
  version: string;
  status: 'resolved' | 'unresolved';
  references: ChargingComparableEvidence[];
  unresolvedReason?: string;
}

function normalizeIdentity(value?: string) {
  return value
    ?.trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function physicalDeviceKey(
  device: DeviceCorpusRecord,
) {
  const identity =
    device.variant.identity;

  const batteryMah =
    device.variant.battery?.capacityMah ??
    device.variant.battery?.typicalCapacityMah;

  return [
    normalizeIdentity(
      identity.manufacturer,
    ),
    normalizeIdentity(
      identity.modelName ??
        identity.family,
    ),
    normalizeIdentity(
      identity.region,
    ) ?? 'any-region',
    batteryMah !== undefined &&
    Number.isFinite(batteryMah)
      ? Math.round(batteryMah)
      : 'unknown-battery',
  ].join('|');
}

function deviceBatteryEnergyWh(
  device: DeviceCorpusRecord,
) {
  const battery = device.variant.battery;
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

  // Catalog/spec-only devices must never crowd measured charging
  // references out of the comparable ranking. Restrict the candidate device
  // pool to variants that actually have measured charging evidence before
  // applying similarity limits.
  const measuredChargingDeviceIds =
    new Set(
      corpus.measurements
        .filter(
          (measurement) =>
            measurement.workload ===
              'charging' &&
            measurement.evidenceKind ===
              'measured',
        )
        .map(
          (measurement) =>
            measurement.deviceVariantId,
        ),
    );

  const measuredChargingCorpus: DeviceCorpus = {
    ...corpus,
    devices:
      corpus.devices.filter(
        (device) =>
          measuredChargingDeviceIds.has(
            device.variant.id,
          ),
      ),
  };

  const candidates = findComparableDevices(measuredChargingCorpus, {
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
        physicalDeviceKey:
          physicalDeviceKey(device),
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
        ...(first.ambientTemperatureC !== undefined &&
        Number.isFinite(first.ambientTemperatureC)
          ? {
              ambientTemperatureC:
                first.ambientTemperatureC,
            }
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
        ...(deviceBatteryEnergyWh(device) !== undefined
          ? {
              batteryEnergyWh:
                deviceBatteryEnergyWh(device),
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

  // Collapse duplicate corpus records of the same physical phone and charger
  // mode. This prevents a device imported from multiple calibration files
  // from receiving multiple votes. Distinct measured modes remain separate.
  const dedupedByPhysicalMode =
    ranked.filter(
      (reference, index, rows) => {
        const signature = [
          reference.physicalDeviceKey,
          reference.testChargerWatts ??
            'unknown-w',
          reference.chargingStandard
            ?.trim()
            .toLowerCase() ??
            'unknown-standard',
          reference.sourcePublisher
            ?.trim()
            .toLowerCase() ??
            reference.sourceId ??
            'unknown-source',
        ].join('|');

        return (
          rows.findIndex(
            (candidate) =>
              [
                candidate.physicalDeviceKey,
                candidate.testChargerWatts ??
                  'unknown-w',
                candidate.chargingStandard
                  ?.trim()
                  .toLowerCase() ??
                  'unknown-standard',
                candidate.sourcePublisher
                  ?.trim()
                  .toLowerCase() ??
                  candidate.sourceId ??
                  'unknown-source',
              ].join('|') ===
              signature,
          ) === index
        );
      },
    );

  const selected =
    query.chargingStandard
      ? dedupedByPhysicalMode.filter(
          (reference, index, rows) =>
            rows.findIndex(
              (candidate) =>
                candidate.physicalDeviceKey ===
                reference.physicalDeviceKey,
            ) === index,
        )
      : dedupedByPhysicalMode;

  const limit =
    query.limit ?? 5;

  const limitedReferences =
    query.chargingStandard
      ? selected.slice(0, limit)
      : (() => {
          // Without an explicitly requested charging standard, the limit is
          // a physical-device limit, not a charger-mode limit. Select the
          // highest-ranked unique devices first, then retain every measured
          // wired mode for those devices so SuperVOOC / USB PD / PPS modes
          // cannot disappear simply because another phone ranked between
          // them.
          const selectedPhysicalKeys: string[] = [];

          for (const reference of selected) {
            if (
              !selectedPhysicalKeys.includes(
                reference.physicalDeviceKey,
              )
            ) {
              selectedPhysicalKeys.push(
                reference.physicalDeviceKey,
              );
            }

            if (
              selectedPhysicalKeys.length >=
              limit
            ) {
              break;
            }
          }

          const allowed =
            new Set(
              selectedPhysicalKeys,
            );

          return selected.filter(
            (reference) =>
              allowed.has(
                reference.physicalDeviceKey,
              ),
          );
        })();

  return {
    version: CHARGING_COMPARABLE_MODEL_VERSION,
    status: 'resolved',
    // With an explicit charging standard, one best mode per device is enough.
    // Without one, preserve all measured modes for the selected physical
    // devices because they are distinct real charging behaviours.
    references: limitedReferences,
  };
}
