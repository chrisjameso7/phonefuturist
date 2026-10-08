import type { DeviceCorpus } from './device-corpus';
import { findComparableDevices } from './comparable-devices';
import type { SimulationInput } from '../types';

export const CORPUS_RUNTIME_MODEL_VERSION = 'corpus-runtime-0.1.0';

export type RuntimeWorkload = 'web_browsing' | 'video_playback' | 'gaming';

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
    neighborIds: string[];
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

  const comparables = findComparableDevices(corpus, {
    batteryMah: capacityMah,
    displayDiagonalInches: input.displays.primary.diagonalInches,
    thicknessMm: input.dimensions?.thicknessMm,
    weightG: input.dimensions?.weightG,
    limit: 20,
  });

  const values = comparables.flatMap((match) => {
    const measurements = corpus.measurements.filter(
      (measurement) =>
        measurement.deviceVariantId === match.device.variant.id &&
        measurement.workload === workload &&
        measurement.metric.toLowerCase().includes('runtime') &&
        measurement.unit.toLowerCase() === 'hours' &&
        positive(measurement.value),
    );

    const refCapacity =
      match.device.variant.battery?.capacityMah ??
      match.device.variant.battery?.typicalCapacityMah;

    if (!refCapacity || !measurements.length) return [];

    return measurements.map((measurement) => ({
      value: refCapacity / measurement.value,
      weight: Math.max(match.score, 0.05) ** 2,
      deviceVariantId: match.device.variant.id,
      score: match.score,
    }));
  });

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
      neighborIds: [...new Set(values.map((item) => item.deviceVariantId))],
      note:
        'Runtime drain is capacity-normalized from comparable released devices. Comparable selection is variant-aware; protocol mixing remains disallowed and should be separated further as protocol metadata coverage improves.',
    },
  };
}
