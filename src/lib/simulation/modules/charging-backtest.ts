import type { DeviceCorpus } from './device-corpus';
import { estimateChargingFromCorpus } from './charging-corpus-estimator';

export const CHARGING_BACKTEST_VERSION = 'charging-backtest-0.1.0';

export interface ChargingBacktestRow {
  deviceVariantId: string;
  manufacturer?: string;
  sourceId: string;
  testChargerWatts: number;
  wattageBand: '<=45W' | '46-80W' | '81-120W' | '>120W';
  chargingStandard?: string;
  actualFullChargeMinutes: number;
  predictedFullChargeMinutes: number;
  absoluteErrorMinutes: number;
  absolutePercentageError: number;
}

export interface ChargingBacktestAggregate {
  key: string;
  count: number;
  maeMinutes: number;
  mapePercent: number;
}

export interface ChargingBacktestSummary {
  version: string;
  health: 'healthy' | 'borderline' | 'poor' | 'insufficient';
  evaluatedModes: number;
  skippedModes: number;
  coveragePercent: number;
  maeMinutes?: number;
  mapePercent?: number;
  byManufacturer: ChargingBacktestAggregate[];
  byChargingStandard: ChargingBacktestAggregate[];
  byWattageBand: ChargingBacktestAggregate[];
  worstMisses: ChargingBacktestRow[];
  rows: ChargingBacktestRow[];
}

function wattageBand(
  watts: number,
): ChargingBacktestRow['wattageBand'] {
  if (watts <= 45) return '<=45W';
  if (watts <= 80) return '46-80W';
  if (watts <= 120) return '81-120W';
  return '>120W';
}

function aggregate(
  rows: ChargingBacktestRow[],
  keyOf: (row: ChargingBacktestRow) => string,
): ChargingBacktestAggregate[] {
  const groups = new Map<string, ChargingBacktestRow[]>();

  for (const row of rows) {
    const key = keyOf(row);
    const current = groups.get(key) ?? [];
    current.push(row);
    groups.set(key, current);
  }

  return [...groups.entries()]
    .map(([key, group]) => ({
      key,
      count: group.length,
      maeMinutes:
        group.reduce(
          (sum, row) => sum + row.absoluteErrorMinutes,
          0,
        ) / group.length,
      mapePercent:
        group.reduce(
          (sum, row) => sum + row.absolutePercentageError,
          0,
        ) / group.length,
    }))
    .sort((a, b) => b.mapePercent - a.mapePercent);
}

function fullChargeMetric(metric: string) {
  const value = metric.toLowerCase();
  return (
    value === 'wiredfullchargeminutes' ||
    value === 'fullchargeminutes' ||
    value === 'timeto100minutes'
  );
}

function capacityOf(
  corpus: DeviceCorpus,
  deviceVariantId: string,
) {
  const device = corpus.devices.find(
    (candidate) =>
      candidate.variant.id === deviceVariantId,
  );

  return (
    device?.variant.battery?.capacityMah ??
    device?.variant.battery?.typicalCapacityMah
  );
}

export function backtestChargingCorpus(
  corpus: DeviceCorpus,
): ChargingBacktestSummary {
  const candidates = corpus.measurements.filter(
    (measurement) =>
      measurement.workload === 'charging' &&
      fullChargeMetric(measurement.metric) &&
      measurement.value > 0 &&
      measurement.testChargerWatts !== undefined &&
      measurement.testChargerWatts > 0,
  );

  const rows: ChargingBacktestRow[] = [];
  let skippedModes = 0;

  for (const heldOut of candidates) {
    const batteryMah = capacityOf(
      corpus,
      heldOut.deviceVariantId,
    );

    if (!batteryMah || heldOut.testChargerWatts === undefined) {
      skippedModes += 1;
      continue;
    }

    const device = corpus.devices.find(
      (candidate) =>
        candidate.variant.id === heldOut.deviceVariantId,
    );

    const reducedCorpus: DeviceCorpus = {
      ...corpus,
      measurements: corpus.measurements.filter(
        (measurement) =>
          measurement.id !== heldOut.id,
      ),
    };

    const estimate = estimateChargingFromCorpus(
      reducedCorpus,
      {
        batteryMah,
        wiredChargingWatts: heldOut.testChargerWatts,
        manufacturer:
          device?.variant.identity.manufacturer,
        region: device?.variant.identity.region,
        batteryChemistry:
          device?.variant.battery?.chemistry,
        cellArchitecture:
          device?.charging?.cellArchitecture,
        chargingStandard:
          heldOut.chargingStandard,
      },
    );

    const predicted =
      estimate.estimate?.timeTo100Minutes?.expected;

    if (
      estimate.status !== 'resolved' ||
      predicted === undefined ||
      !Number.isFinite(predicted)
    ) {
      skippedModes += 1;
      continue;
    }

    const absoluteErrorMinutes = Math.abs(
      predicted - heldOut.value,
    );

    rows.push({
      deviceVariantId: heldOut.deviceVariantId,
      manufacturer: device?.variant.identity.manufacturer,
      sourceId: heldOut.sourceId,
      testChargerWatts: heldOut.testChargerWatts,
      wattageBand: wattageBand(heldOut.testChargerWatts),
      chargingStandard: heldOut.chargingStandard,
      actualFullChargeMinutes: heldOut.value,
      predictedFullChargeMinutes: predicted,
      absoluteErrorMinutes,
      absolutePercentageError:
        (absoluteErrorMinutes / heldOut.value) * 100,
    });
  }

  const maeMinutes =
    rows.length > 0
      ? rows.reduce(
          (sum, row) =>
            sum + row.absoluteErrorMinutes,
          0,
        ) / rows.length
      : undefined;

  const mapePercent =
    rows.length > 0
      ? rows.reduce(
          (sum, row) =>
            sum + row.absolutePercentageError,
          0,
        ) / rows.length
      : undefined;

  const totalModes = candidates.length;

  const health: ChargingBacktestSummary['health'] =
    rows.length < 3 || maeMinutes === undefined || mapePercent === undefined
      ? 'insufficient'
      : maeMinutes <= 10 && mapePercent <= 15
        ? 'healthy'
        : maeMinutes <= 18 && mapePercent <= 25
          ? 'borderline'
          : 'poor';

  return {
    version: CHARGING_BACKTEST_VERSION,
    health,
    evaluatedModes: rows.length,
    skippedModes,
    coveragePercent:
      totalModes > 0 ? (rows.length / totalModes) * 100 : 0,
    maeMinutes,
    mapePercent,
    byManufacturer: aggregate(
      rows,
      (row) => row.manufacturer ?? 'unknown',
    ),
    byChargingStandard: aggregate(
      rows,
      (row) => row.chargingStandard ?? 'unknown',
    ),
    byWattageBand: aggregate(
      rows,
      (row) => row.wattageBand,
    ),
    worstMisses: [...rows]
      .sort(
        (a, b) =>
          b.absolutePercentageError -
          a.absolutePercentageError,
      )
      .slice(0, 5),
    rows,
  };
}
