import type { DeviceCorpus } from './device-corpus';
import { estimateChargingFromCorpus } from './charging-corpus-estimator';

export const CHARGING_BACKTEST_VERSION = 'charging-backtest-0.1.0';

export interface ChargingBacktestRow {
  deviceVariantId: string;
  sourceId: string;
  testChargerWatts: number;
  chargingStandard?: string;
  actualFullChargeMinutes: number;
  predictedFullChargeMinutes: number;
  absoluteErrorMinutes: number;
  absolutePercentageError: number;
}

export interface ChargingBacktestSummary {
  version: string;
  evaluatedModes: number;
  skippedModes: number;
  maeMinutes?: number;
  mapePercent?: number;
  rows: ChargingBacktestRow[];
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
      sourceId: heldOut.sourceId,
      testChargerWatts: heldOut.testChargerWatts,
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

  return {
    version: CHARGING_BACKTEST_VERSION,
    evaluatedModes: rows.length,
    skippedModes,
    maeMinutes,
    mapePercent,
    rows,
  };
}
