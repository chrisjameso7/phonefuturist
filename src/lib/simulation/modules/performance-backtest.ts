import type { DeviceCorpus } from './device-corpus';
import { selectThermalCalibrationReferences } from './thermal-calibration';

export const PERFORMANCE_BACKTEST_VERSION =
  'performance-backtest-0.1.0';

export interface PerformanceBacktestRow {
  deviceVariantId: string;
  actualPercent: number;
  predictedPercent: number;
  absoluteErrorPoints: number;
  referenceCount: number;
  averageSimilarity: number;
  averageCoverage: number;
  sameSocVendorReferences: number;
}

export interface PerformanceBacktestSummary {
  version: string;
  evaluatedDevices: number;
  skippedDevices: number;
  maePoints?: number;
  worstMisses: PerformanceBacktestRow[];
  rows: PerformanceBacktestRow[];
}

function bodyVolume(
  device: DeviceCorpus['devices'][number],
) {
  const d = device.dimensions;
  if (
    !d?.widthMm ||
    !d.heightMm ||
    !d.thicknessMm
  ) {
    return undefined;
  }
  return d.widthMm * d.heightMm * d.thicknessMm;
}

function weightedPrediction(
  references: ReturnType<
    typeof selectThermalCalibrationReferences
  >['references'],
  targetSocVendor?: string,
) {
  const usable = references.filter(
    (reference) =>
      Number.isFinite(reference.value) &&
      reference.value > 0 &&
      (
        reference.unit.toLowerCase() === 'percent' ||
        reference.unit === '%'
      ),
  );

  if (!usable.length) return undefined;

  const totalWeight = usable.reduce(
    (sum, reference) =>
      sum + Math.max(reference.score, 0.05) ** 2,
    0,
  );

  return {
    predictedPercent:
      usable.reduce(
        (sum, reference) =>
          sum +
          reference.value *
            Math.max(reference.score, 0.05) ** 2,
        0,
      ) / Math.max(totalWeight, Number.EPSILON),
    referenceCount: usable.length,
    averageSimilarity:
      usable.reduce(
        (sum, reference) =>
          sum + reference.similarityScore,
        0,
      ) / usable.length,
    averageCoverage:
      usable.reduce(
        (sum, reference) =>
          sum + reference.coverageScore,
        0,
      ) / usable.length,
    sameSocVendorReferences:
      targetSocVendor
        ? usable.filter(
            (reference) =>
              reference.socVendor ===
              targetSocVendor,
          ).length
        : 0,
  };
}

export function backtestGpuStability(
  corpus: DeviceCorpus,
): PerformanceBacktestSummary {
  const candidates = corpus.measurements.filter(
    (measurement) =>
      measurement.workload === 'benchmark' &&
      measurement.metric === 'gpu_stability_percent' &&
      measurement.unit.toLowerCase() === 'percent' &&
      Number.isFinite(measurement.value),
  );

  const rows: PerformanceBacktestRow[] = [];
  let skippedDevices = 0;

  for (const measurement of candidates) {
    const device = corpus.devices.find(
      (row) =>
        row.variant.id === measurement.deviceVariantId,
    );

    if (!device) {
      skippedDevices += 1;
      continue;
    }

    const holdout: DeviceCorpus = {
      version:
        `${corpus.version}-gpu-holdout-${device.variant.id}`,
      sources: corpus.sources,
      devices: corpus.devices.filter(
        (row) => row.variant.id !== device.variant.id,
      ),
      measurements: corpus.measurements.filter(
        (row) =>
          row.deviceVariantId !== device.variant.id,
      ),
    };

    const capacity =
      device.variant.battery?.capacityMah ??
      device.variant.battery?.typicalCapacityMah;

    const result = selectThermalCalibrationReferences(
      holdout,
      {
        domain: 'gpu_sustained',
        batteryMah: capacity,
        manufacturer:
          device.variant.identity.manufacturer,
        socVendor: device.variant.soc?.vendor,
        socName: device.variant.soc?.name,
        displayDiagonalInches:
          device.display?.diagonalInches,
        refreshRateHz:
          device.display?.refreshRateHz,
        thicknessMm:
          device.dimensions?.thicknessMm,
        weightG:
          device.dimensions?.weightG,
        bodyVolumeMm3: bodyVolume(device),
        coolingClass: device.cooling?.class,
      },
    );

    if (result.status !== 'resolved') {
      skippedDevices += 1;
      continue;
    }

    const prediction = weightedPrediction(
      result.references,
      device.variant.soc?.vendor,
    );

    if (!prediction) {
      skippedDevices += 1;
      continue;
    }

    rows.push({
      deviceVariantId: device.variant.id,
      actualPercent: measurement.value,
      predictedPercent:
        prediction.predictedPercent,
      absoluteErrorPoints: Math.abs(
        prediction.predictedPercent -
          measurement.value,
      ),
      referenceCount:
        prediction.referenceCount,
      averageSimilarity:
        prediction.averageSimilarity,
      averageCoverage:
        prediction.averageCoverage,
      sameSocVendorReferences:
        prediction.sameSocVendorReferences,
    });
  }

  const maePoints = rows.length
    ? rows.reduce(
        (sum, row) => sum + row.absoluteErrorPoints,
        0,
      ) / rows.length
    : undefined;

  return {
    version: PERFORMANCE_BACKTEST_VERSION,
    evaluatedDevices: rows.length,
    skippedDevices,
    maePoints,
    worstMisses: [...rows]
      .sort(
        (a, b) =>
          b.absoluteErrorPoints -
          a.absoluteErrorPoints,
      )
      .slice(0, 4),
    rows,
  };
}
