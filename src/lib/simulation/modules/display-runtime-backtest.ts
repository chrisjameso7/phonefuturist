import type { DeviceCorpus } from './device-corpus';
import type { SimulationInput } from '../types';
import {
  resolveCorpusRuntimeBand,
  type RuntimeWorkload,
} from './corpus-runtime';

export const DISPLAY_RUNTIME_BACKTEST_VERSION =
  'display-runtime-backtest-0.1.0';

export interface DisplayRuntimeBacktestRow {
  deviceVariantId: string;
  workload: RuntimeWorkload;
  actualMahPerHour: number;
  blindPredictedMahPerHour: number;
  awarePredictedMahPerHour: number;
  blindAbsolutePercentError: number;
  awareAbsolutePercentError: number;
  awareReferenceCount: number;
  awareSimilarity: number;
  awareCoverage: number;
}

export interface DisplayRuntimeBacktestAggregate {
  rows: number;
  blindMapePercent?: number;
  awareMapePercent?: number;
  improvementPercent?: number;
}

export interface DisplayRuntimeBacktestSummary {
  version: string;
  evaluatedRows: number;
  skippedRows: number;
  displayEnrichedDevices: number;
  overall: DisplayRuntimeBacktestAggregate;
  byWorkload: Record<
    RuntimeWorkload,
    DisplayRuntimeBacktestAggregate
  >;
  worstAwareMisses: DisplayRuntimeBacktestRow[];
  rows: DisplayRuntimeBacktestRow[];
}

const WORKLOADS: RuntimeWorkload[] = [
  'web_browsing',
  'video_playback',
  'gaming',
];

function positive(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value > 0
  );
}

function deviceCapacityMah(
  corpus: DeviceCorpus,
  deviceVariantId: string,
) {
  const device = corpus.devices.find(
    (row) => row.variant.id === deviceVariantId,
  );

  return (
    device?.variant.battery?.capacityMah ??
    device?.variant.battery?.typicalCapacityMah
  );
}

function mape(
  rows: DisplayRuntimeBacktestRow[],
  key:
    | 'blindAbsolutePercentError'
    | 'awareAbsolutePercentError',
) {
  if (!rows.length) return undefined;
  return (
    rows.reduce((sum, row) => sum + row[key], 0) /
    rows.length
  );
}

function aggregate(
  rows: DisplayRuntimeBacktestRow[],
): DisplayRuntimeBacktestAggregate {
  const blind = mape(rows, 'blindAbsolutePercentError');
  const aware = mape(rows, 'awareAbsolutePercentError');

  return {
    rows: rows.length,
    blindMapePercent: blind,
    awareMapePercent: aware,
    improvementPercent:
      blind !== undefined &&
      aware !== undefined &&
      blind > 0
        ? ((blind - aware) / blind) * 100
        : undefined,
  };
}

function buildInput(
  device: DeviceCorpus['devices'][number],
  capacityMah: number,
  includeDisplayLoad: boolean,
): SimulationInput {
  return {
    formFactor: 'phone',
    displays: {
      primary: {
        diagonalInches: device.display?.diagonalInches,
        ...(includeDisplayLoad
          ? {
              resolutionWidthPx:
                device.display?.resolutionWidthPx,
              resolutionHeightPx:
                device.display?.resolutionHeightPx,
              refreshRateHz:
                device.display?.refreshRateHz,
            }
          : {}),
      },
    },
    battery: {
      cells: [{ capacityMah }],
    },
  };
}

export function backtestDisplayAwareRuntime(
  corpus: DeviceCorpus,
): DisplayRuntimeBacktestSummary {
  const eligibleDevices = corpus.devices.filter(
    (device) =>
      positive(
        device.variant.battery?.capacityMah ??
          device.variant.battery?.typicalCapacityMah,
      ) &&
      positive(device.display?.diagonalInches) &&
      positive(device.display?.resolutionWidthPx) &&
      positive(device.display?.resolutionHeightPx) &&
      positive(device.display?.refreshRateHz),
  );

  const rows: DisplayRuntimeBacktestRow[] = [];
  let skippedRows = 0;

  for (const device of eligibleDevices) {
    const capacityMah = deviceCapacityMah(
      corpus,
      device.variant.id,
    );

    if (!capacityMah) continue;

    for (const workload of WORKLOADS) {
      const measurement = corpus.measurements.find(
        (row) =>
          row.deviceVariantId === device.variant.id &&
          row.workload === workload &&
          row.evidenceKind === 'measured' &&
          row.unit.toLowerCase() === 'hours' &&
          positive(row.value),
      );

      if (!measurement) {
        skippedRows += 1;
        continue;
      }

      const measurementSource =
        corpus.sources.find(
          (source) =>
            source.id === measurement.sourceId,
        );

      const protocolSelector = {
        ...(measurementSource?.protocol
          ? {
              protocol:
                measurementSource.protocol,
            }
          : {}),
        ...(measurementSource?.protocolVersion
          ? {
              protocolVersion:
                measurementSource.protocolVersion,
            }
          : {}),
      };

      const holdout: DeviceCorpus = {
        version:
          `${corpus.version}-display-holdout-${device.variant.id}`,
        sources: corpus.sources,
        devices: corpus.devices.filter(
          (row) => row.variant.id !== device.variant.id,
        ),
        measurements: corpus.measurements.filter(
          (row) =>
            row.deviceVariantId !== device.variant.id,
        ),
      };

      const blind = resolveCorpusRuntimeBand(
        holdout,
        buildInput(device, capacityMah, false),
        workload,
        protocolSelector,
      );
      const aware = resolveCorpusRuntimeBand(
        holdout,
        buildInput(device, capacityMah, true),
        workload,
        protocolSelector,
      );

      if (
        blind.status !== 'resolved' ||
        !blind.estimate ||
        aware.status !== 'resolved' ||
        !aware.estimate
      ) {
        skippedRows += 1;
        continue;
      }

      const actualMahPerHour =
        capacityMah / measurement.value;

      const blindError =
        Math.abs(
          blind.estimate.expectedMahPerHour -
            actualMahPerHour,
        ) / actualMahPerHour;

      const awareError =
        Math.abs(
          aware.estimate.expectedMahPerHour -
            actualMahPerHour,
        ) / actualMahPerHour;

      rows.push({
        deviceVariantId: device.variant.id,
        workload,
        actualMahPerHour,
        blindPredictedMahPerHour:
          blind.estimate.expectedMahPerHour,
        awarePredictedMahPerHour:
          aware.estimate.expectedMahPerHour,
        blindAbsolutePercentError:
          blindError * 100,
        awareAbsolutePercentError:
          awareError * 100,
        awareReferenceCount:
          aware.estimate.referenceCount,
        awareSimilarity:
          aware.estimate.averageSimilarity,
        awareCoverage:
          aware.estimate.averageCoverage,
      });
    }
  }

  return {
    version: DISPLAY_RUNTIME_BACKTEST_VERSION,
    evaluatedRows: rows.length,
    skippedRows,
    displayEnrichedDevices: eligibleDevices.length,
    overall: aggregate(rows),
    byWorkload: {
      web_browsing: aggregate(
        rows.filter(
          (row) => row.workload === 'web_browsing',
        ),
      ),
      video_playback: aggregate(
        rows.filter(
          (row) => row.workload === 'video_playback',
        ),
      ),
      gaming: aggregate(
        rows.filter((row) => row.workload === 'gaming'),
      ),
    },
    worstAwareMisses: [...rows]
      .sort(
        (a, b) =>
          b.awareAbsolutePercentError -
          a.awareAbsolutePercentError,
      )
      .slice(0, 5),
    rows,
  };
}
