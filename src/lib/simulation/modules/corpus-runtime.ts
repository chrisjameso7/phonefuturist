import type { DeviceCorpus } from './device-corpus';
import { findComparableDevices } from './comparable-devices';
import type { SimulationInput } from '../types';

export const CORPUS_RUNTIME_MODEL_VERSION = 'corpus-runtime-0.1.0';

export type RuntimeWorkload = 'web_browsing' | 'video_playback' | 'gaming';

export interface RuntimeProtocolSelector {
  protocol?: string;
  protocolVersion?: string;
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
    referenceCount: number;
    confidence: number;
    averageSimilarity: number;
    averageCoverage: number;
    neighborIds: string[];
    protocol?: string;
    protocolVersion?: string;
    sourceIds: string[];
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

export function resolveCorpusRuntimeBand(
  corpus: DeviceCorpus,
  input: SimulationInput,
  workload: RuntimeWorkload,
  protocolSelector: RuntimeProtocolSelector = {},
): CorpusRuntimeBand {
  const capacityMah = inputCapacityMah(input);

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
      limit: 20,
    },
  );

  const rawValues = comparables.flatMap((match) => {
    const measurements = corpus.measurements.filter(
      (measurement) =>
        measurement.deviceVariantId === match.device.variant.id &&
        measurement.workload === workload &&
        measurement.evidenceKind === 'measured' &&
        measurement.unit.toLowerCase() === 'hours' &&
        positive(measurement.value),
    );

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

      return [{
        value: refCapacity / measurement.value,
        weight: Math.max(match.score, 0.05) ** 2,
        deviceVariantId: match.device.variant.id,
        score: match.score,
        similarityScore: match.similarityScore,
        coverageScore: match.coverageScore,
        sourceId: measurement.sourceId,
        protocol: source?.protocol,
        protocolVersion: source?.protocolVersion,
        protocolKey,
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

  const values = rankedGroups[0] ?? [];

  if (!values.length) {
    return {
      version: CORPUS_RUNTIME_MODEL_VERSION,
      status: 'unresolved',
      workload,
      unresolvedReason:
        'No comparable devices with protocol-compatible runtime evidence were found.',
    };
  }

  const drains = values.map((item) => item.value);
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
      note:
        'Runtime drain is capacity-normalized from measured comparable released devices. Only one protocol group is used per estimate; reported or inferred rows and incompatible test protocols are never averaged into the calibration.',
    },
  };
}
