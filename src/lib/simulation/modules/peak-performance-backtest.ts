import type { DeviceCorpus } from './device-corpus';
import {
  estimatePeakPerformance,
  PEAK_METRIC_BY_DOMAIN,
  type PeakBenchmarkDomain,
} from './peak-performance-estimator';

export const PEAK_PERFORMANCE_BACKTEST_VERSION =
  'peak-performance-backtest-0.1.0';

export interface PeakPerformanceBacktestRow {
  domain: PeakBenchmarkDomain;
  deviceVariantId: string;
  actual: number;
  predicted: number;
  absoluteError: number;
  absolutePercentError: number;
  evidenceScope?:
    | 'same-soc-family'
    | 'same-soc-vendor'
    | 'protocol-cohort';
  referenceCount: number;
  neighborIds: string[];
}

export interface PeakPerformanceBacktestResult {
  version: string;
  evaluatedMeasurements: number;
  maePoints?: number;
  mapePercent?: number;
  medianAbsolutePercentError?: number;
  rows: PeakPerformanceBacktestRow[];
}

const domains: PeakBenchmarkDomain[] = [
  'geekbench6_single',
  'geekbench6_multi',
  '3dmark_wle',
  '3dmark_solar_bay',
];

function median(values: number[]) {
  if (!values.length) return undefined;

  const sorted = [...values].sort(
    (a, b) => a - b,
  );

  const middle =
    Math.floor(sorted.length / 2);

  return sorted.length % 2
    ? sorted[middle]
    : (
        sorted[middle - 1] +
        sorted[middle]
      ) /
        2;
}

export function backtestPeakPerformance(
  corpus: DeviceCorpus,
): PeakPerformanceBacktestResult {
  const rows: PeakPerformanceBacktestRow[] = [];

  for (const domain of domains) {
    const metric =
      PEAK_METRIC_BY_DOMAIN[domain];

    const measurements =
      corpus.measurements.filter(
        (measurement) =>
          measurement.workload ===
            'benchmark' &&
          measurement.evidenceKind ===
            'measured' &&
          measurement.metric === metric &&
          Number.isFinite(
            measurement.value,
          ) &&
          measurement.value > 0,
      );

    for (const measurement of measurements) {
      const device =
        corpus.devices.find(
          (candidate) =>
            candidate.variant.id ===
            measurement.deviceVariantId,
        );

      if (!device) continue;

      const holdout: DeviceCorpus = {
        ...corpus,
        measurements:
          corpus.measurements.filter(
            (candidate) =>
              !(
                candidate.deviceVariantId ===
                  measurement.deviceVariantId &&
                candidate.metric === metric
              ),
          ),
      };

      const battery =
        device.variant.battery;

      const estimate =
        estimatePeakPerformance(
          holdout,
          {
            domain,
            manufacturer:
              device.variant.identity
                .manufacturer,
            socVendor:
              device.variant.soc?.vendor,
            socName:
              device.variant.soc?.name,
            batteryMah:
              battery?.capacityMah ??
              battery?.typicalCapacityMah,
            displayDiagonalInches:
              device.display?.diagonalInches,
            refreshRateHz:
              device.display?.refreshRateHz,
            thicknessMm:
              device.dimensions
                ?.thicknessMm,
            weightG:
              device.dimensions?.weightG,
            bodyVolumeMm3:
              device.dimensions?.widthMm &&
              device.dimensions?.heightMm &&
              device.dimensions?.thicknessMm
                ? device.dimensions
                    .widthMm *
                  device.dimensions
                    .heightMm *
                  device.dimensions
                    .thicknessMm
                : undefined,
            coolingClass:
              device.cooling?.class,
          },
        );

      if (
        estimate.status !== 'resolved' ||
        estimate.baselineExpected ===
          undefined
      ) {
        continue;
      }

      const actual =
        measurement.value;
      const predicted =
        estimate.baselineExpected;

      const absoluteError =
        Math.abs(
          predicted - actual,
        );

      const absolutePercentError =
        (
          absoluteError /
          Math.max(
            Math.abs(actual),
            Number.EPSILON,
          )
        ) *
        100;

      rows.push({
        domain,
        deviceVariantId:
          measurement.deviceVariantId,
        actual,
        predicted,
        absoluteError,
        absolutePercentError,
        evidenceScope:
          estimate.evidenceScope,
        referenceCount:
          estimate.referenceCount,
        neighborIds:
          estimate.neighborIds,
      });
    }
  }

  if (!rows.length) {
    return {
      version:
        PEAK_PERFORMANCE_BACKTEST_VERSION,
      evaluatedMeasurements: 0,
      rows: [],
    };
  }

  return {
    version:
      PEAK_PERFORMANCE_BACKTEST_VERSION,
    evaluatedMeasurements:
      rows.length,
    maePoints:
      rows.reduce(
        (sum, row) =>
          sum +
          row.absoluteError,
        0,
      ) /
      rows.length,
    mapePercent:
      rows.reduce(
        (sum, row) =>
          sum +
          row.absolutePercentError,
        0,
      ) /
      rows.length,
    medianAbsolutePercentError:
      median(
        rows.map(
          (row) =>
            row.absolutePercentError,
        ),
      ),
    rows,
  };
}
