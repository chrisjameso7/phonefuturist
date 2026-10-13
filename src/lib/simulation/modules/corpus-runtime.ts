import type { DeviceCorpus } from './device-corpus';
import {
  findComparableDevices,
  normalizeSocFamily,
} from './comparable-devices';
import type { SimulationInput } from '../types';

export const CORPUS_RUNTIME_MODEL_VERSION = 'corpus-runtime-0.3.0';

export type RuntimeWorkload = 'web_browsing' | 'video_playback' | 'gaming';

export interface RuntimeProtocolSelector {
  protocol?: string;
  protocolVersion?: string;
}

export interface RuntimeComparableContext {
  manufacturer?: string;
  socVendor?: string;
  socName?: string;
  batteryChemistry?: string;
  coolingClass?:
    | 'passive-graphite'
    | 'vapor-chamber'
    | 'large-vapor-chamber'
    | 'active-fan'
    | 'other';
}

export interface CorpusRuntimeBand {
  version: string;
  status: 'resolved' | 'unresolved';
  workload: RuntimeWorkload;
  unresolvedReason?: string;
  estimate?: {
    minMahPerHour: number;
    expectedMahPerHour: number;
    maxMahPerHour: number;
    energyBasis: 'wh' | 'mah';
    targetEnergyWh?: number;
    minWhPerHour?: number;
    expectedWhPerHour?: number;
    maxWhPerHour?: number;
    energyReferenceCount: number;
    referenceCount: number;
    confidence: number;
    averageSimilarity: number;
    averageCoverage: number;
    neighborIds: string[];
    protocol?: string;
    protocolVersion?: string;
    sourceIds: string[];
    sourceRecordCount: number;
    publisherCount: number;
    protocolFamilyCount: number;
    evidenceScope:
      | 'same-soc-family'
      | 'same-soc-vendor'
      | 'protocol-cohort';
    sameSocFamilyReferences: number;
    sameSocVendorReferences: number;
    note: string;
  };
}

function positive(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function inputCapacityMah(input: SimulationInput) {
  const cells = input.battery?.cells ?? [];
  if (!cells.length || !cells.every((cell) => positive(cell.capacityMah))) {
    return undefined;
  }
  return cells.reduce((sum, cell) => sum + cell.capacityMah!, 0);
}

function weightedMean(values: Array<{ value: number; weight: number }>) {
  const total = values.reduce((sum, item) => sum + item.weight, 0);
  return values.reduce((sum, item) => sum + item.value * item.weight, 0) /
    Math.max(total, Number.EPSILON);
}
function inputEnergyWh(input: SimulationInput) {
  const cells = input.battery?.cells ?? [];
  if (
    !cells.length ||
    !cells.every(
      (cell) =>
        positive(cell.capacityMah) &&
        positive(cell.nominalVoltageV),
    )
  ) {
    return undefined;
  }

  return cells.reduce(
    (sum, cell) =>
      sum +
      (cell.capacityMah! * cell.nominalVoltageV!) /
        1000,
    0,
  );
}

function referenceEnergyWh(
  device: DeviceCorpus['devices'][number],
) {
  const battery = device.variant.battery;
  if (!battery) return undefined;

  if (positive(battery.typicalEnergyWh)) {
    return battery.typicalEnergyWh;
  }

  if (positive(battery.ratedEnergyWh)) {
    return battery.ratedEnergyWh;
  }

  const capacity =
    battery.capacityMah ??
    battery.typicalCapacityMah;

  if (
    positive(capacity) &&
    positive(battery.nominalVoltageV)
  ) {
    return (
      capacity *
      battery.nominalVoltageV
    ) / 1000;
  }

  return undefined;
}


export function resolveCorpusRuntimeBand(
  corpus: DeviceCorpus,
  input: SimulationInput,
  workload: RuntimeWorkload,
  protocolSelector: RuntimeProtocolSelector = {},
  context: RuntimeComparableContext = {},
): CorpusRuntimeBand {
  const capacityMah = inputCapacityMah(input);
  const targetEnergyWh = inputEnergyWh(input);

  if (!capacityMah) {
    return {
      version: CORPUS_RUNTIME_MODEL_VERSION,
      status: 'unresolved',
      workload,
      unresolvedReason: 'Battery capacity is required.',
    };
  }

  const sourceById = new Map(
    corpus.sources.map((source) => [source.id, source]),
  );

  const eligibleVariantIds = new Set(
    corpus.measurements
      .filter((measurement) => {
        if (
          measurement.workload !== workload ||
          measurement.evidenceKind !== 'measured' ||
          measurement.unit.toLowerCase() !== 'hours' ||
          !positive(measurement.value)
        ) {
          return false;
        }

        const source = sourceById.get(
          measurement.sourceId,
        );

        if (
          protocolSelector.protocol &&
          source?.protocol !== protocolSelector.protocol
        ) {
          return false;
        }

        if (
          protocolSelector.protocolVersion &&
          source?.protocolVersion !==
            protocolSelector.protocolVersion
        ) {
          return false;
        }

        return true;
      })
      .map(
        (measurement) =>
          measurement.deviceVariantId,
      ),
  );

  const evidenceCorpus: DeviceCorpus = {
    ...corpus,
    devices: corpus.devices.filter((device) =>
      eligibleVariantIds.has(device.variant.id),
    ),
  };

  const comparables = findComparableDevices(
    evidenceCorpus,
    {
      batteryMah: capacityMah,
      manufacturer: context.manufacturer,
      socVendor: context.socVendor,
      socName: context.socName,
      batteryChemistry:
        context.batteryChemistry,
      coolingClass: context.coolingClass,
      displayDiagonalInches:
        input.displays.primary.diagonalInches,
      resolutionWidthPx:
        input.displays.primary.resolutionWidthPx,
      resolutionHeightPx:
        input.displays.primary.resolutionHeightPx,
      refreshRateHz:
        input.displays.primary.refreshRateHz,
      thicknessMm: input.dimensions?.thicknessMm,
      weightG: input.dimensions?.weightG,
      // Evidence scope selection happens after protocol grouping.
      // Keep the full eligible evidence set here so a large generic cohort
      // cannot crowd same-SoC-vendor references out before that decision.
      limit: Math.max(
        20,
        evidenceCorpus.devices.length,
      ),
    },
  );

  // Index eligible measurements once: avoid rescanning the full calibration
  // corpus for every comparable phone during holdout validation.
  const measurementsByVariant = new Map<string, typeof corpus.measurements>();
  for (const measurement of corpus.measurements) {
    if (measurement.workload !== workload ||
        measurement.evidenceKind !== 'measured' ||
        measurement.unit.toLowerCase() !== 'hours' ||
        !positive(measurement.value)) continue;
    const rows = measurementsByVariant.get(measurement.deviceVariantId) ?? [];
    rows.push(measurement);
    measurementsByVariant.set(measurement.deviceVariantId, rows);
  }

  const rawValues = comparables.flatMap((match) => {
    const measurements = measurementsByVariant.get(match.device.variant.id) ?? [];

    const refCapacity =
      match.device.variant.battery?.capacityMah ??
      match.device.variant.battery?.typicalCapacityMah;

    if (!refCapacity || !measurements.length) return [];

    return measurements.flatMap((measurement) => {
      const source = sourceById.get(
        measurement.sourceId,
      );

      if (protocolSelector.protocol) {
        if (!source || source.protocol !== protocolSelector.protocol) {
          return [];
        }
      }

      if (protocolSelector.protocolVersion) {
        if (
          !source ||
          source.protocolVersion !== protocolSelector.protocolVersion
        ) {
          return [];
        }
      }

      const protocolKey = source?.protocol
        ? [
            source.protocol,
            source.protocolVersion ?? 'unversioned',
          ].join('|')
        : `source:${measurement.sourceId}`;

      const refEnergyWh =
        referenceEnergyWh(match.device);

      return [{
        value: refCapacity / measurement.value,
        valueWh:
          refEnergyWh !== undefined
            ? refEnergyWh / measurement.value
            : undefined,
        weight: Math.max(match.score, 0.05) ** 2,
        deviceVariantId: match.device.variant.id,
        score: match.score,
        similarityScore: match.similarityScore,
        coverageScore: match.coverageScore,
        sourceId: measurement.sourceId,
        protocol: source?.protocol,
        protocolVersion: source?.protocolVersion,
        protocolKey,
        publisher:
          source?.publisher ??
          measurement.sourceId,
        socVendor:
          match.device.variant.soc?.vendor,
        socName:
          match.device.variant.soc?.name,
      }];
    });
  });

  const grouped = new Map<string, typeof rawValues>();

  for (const value of rawValues) {
    const group = grouped.get(value.protocolKey) ?? [];
    group.push(value);
    grouped.set(value.protocolKey, group);
  }

  const rankedGroups = [...grouped.values()].sort((a, b) => {
    const weightA = a.reduce((sum, row) => sum + row.weight, 0);
    const weightB = b.reduce((sum, row) => sum + row.weight, 0);
    if (weightB !== weightA) return weightB - weightA;
    return b.length - a.length;
  });

  const sameFamilyRows = (group: typeof rawValues) =>
    context.socName
      ? group.filter(
          (item) =>
            item.socName &&
            normalizeSocFamily(item.socName) ===
              normalizeSocFamily(context.socName!),
        )
      : [];

  const sameVendorRows = (group: typeof rawValues) =>
    context.socVendor
      ? group.filter(
          (item) =>
            item.socVendor === context.socVendor,
        )
      : [];

  // Keep protocol isolation, but do not let a larger generic protocol cohort
  // erase a materially better SoC prior. For future chips, prefer a protocol
  // group that contains at least two same-family references, then at least
  // two same-vendor references, and only then fall back to the strongest
  // generic protocol cohort.
  const familyProtocolGroup = rankedGroups.find(
    (group) => sameFamilyRows(group).length >= 2,
  );
  // Vendor-only battery evidence is not an SoC efficiency calibration.
  // When a chip family has no matching measurements, use the protocol cohort.
  const protocolValues =
    familyProtocolGroup ??
    rankedGroups[0] ??
    [];

  if (!protocolValues.length) {
    return {
      version: CORPUS_RUNTIME_MODEL_VERSION,
      status: 'unresolved',
      workload,
      unresolvedReason:
        'No comparable devices with protocol-compatible runtime evidence were found.',
    };
  }

  const sameFamily = sameFamilyRows(protocolValues);
  const sameVendor = sameVendorRows(protocolValues);

  const values = sameFamily.length >= 2 ? sameFamily
    : sameVendor.length >= 2 ? sameVendor : protocolValues;

  const evidenceScope:
    | 'same-soc-family'
    | 'same-soc-vendor'
    | 'protocol-cohort' =
    values === sameFamily ? 'same-soc-family'
    : values === sameVendor ? 'same-soc-vendor' : 'protocol-cohort';

  const drains = values.map((item) => item.value);
  const whValues = values.filter(
    (
      item,
    ): item is typeof item & { valueWh: number } =>
      positive(item.valueWh),
  );

  const useWh =
    targetEnergyWh !== undefined &&
    whValues.length === values.length &&
    values.length > 0;

  const whDrains = whValues.map(
    (item) => item.valueWh,
  );

  const confidence =
    values.reduce((sum, item) => sum + item.score, 0) / values.length;
  const averageSimilarity =
    values.reduce(
      (sum, item) => sum + item.similarityScore,
      0,
    ) / values.length;
  const averageCoverage =
    values.reduce(
      (sum, item) => sum + item.coverageScore,
      0,
    ) / values.length;

  return {
    version: CORPUS_RUNTIME_MODEL_VERSION,
    status: 'resolved',
    workload,
    estimate: {
      minMahPerHour: Math.min(...drains),
      expectedMahPerHour: weightedMean(
        values.map((item) => ({ value: item.value, weight: item.weight })),
      ),
      maxMahPerHour: Math.max(...drains),
      energyBasis: useWh ? 'wh' : 'mah',
      ...(useWh
        ? {
            targetEnergyWh,
            minWhPerHour: Math.min(...whDrains),
            expectedWhPerHour: weightedMean(
              whValues.map((item) => ({
                value: item.valueWh,
                weight: item.weight,
              })),
            ),
            maxWhPerHour: Math.max(...whDrains),
          }
        : {}),
      energyReferenceCount: whValues.length,
      referenceCount: values.length,
      confidence: Math.min(1, Math.max(0, confidence)),
      averageSimilarity: Math.min(
        1,
        Math.max(0, averageSimilarity),
      ),
      averageCoverage: Math.min(
        1,
        Math.max(0, averageCoverage),
      ),
      neighborIds: [...new Set(values.map((item) => item.deviceVariantId))],
      protocol: values[0]?.protocol,
      protocolVersion: values[0]?.protocolVersion,
      sourceIds: [...new Set(values.map((item) => item.sourceId))],
      sourceRecordCount:
        new Set(
          values.map(
            (item) => item.sourceId,
          ),
        ).size,
      publisherCount:
        new Set(
          values.map(
            (item) => item.publisher,
          ),
        ).size,
      protocolFamilyCount:
        new Set(
          values.map(
            (item) => item.protocolKey,
          ),
        ).size,
      evidenceScope,
      sameSocFamilyReferences: sameFamily.length,
      sameSocVendorReferences: sameVendor.length,
      note:
        useWh
          ? `Runtime drain is energy-normalized in Wh/h from measured comparable released devices using ${evidenceScope.replaceAll('-', ' ')} evidence. Every selected reference and the target have evidence-backed battery energy or nominal voltage. Only one protocol group is used per estimate.`
          : `Runtime drain is capacity-normalized in mAh/h from measured comparable released devices using ${evidenceScope.replaceAll('-', ' ')} evidence. Wh normalization was not used because the target or at least one selected reference lacks accepted energy/voltage evidence. Only one protocol group is used per estimate.`,
    },
  };
}
