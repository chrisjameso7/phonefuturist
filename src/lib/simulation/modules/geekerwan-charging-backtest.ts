import type {
  DeviceCorpus,
} from './device-corpus';
import {
  estimateChargingFromCorpus,
} from './charging-corpus-estimator';
import {
  linkDeviceIdentities,
} from './device-identity-linker';

export const GEEKERWAN_CHARGING_BACKTEST_VERSION =
  'geekerwan-charging-backtest-0.1.0';

export interface GeekerwanChargingBacktestRow {
  deviceVariantId: string;
  canonicalDeviceId: string;
  manufacturer: string;
  model: string;
  batteryMah: number;
  chargerWatts: number;
  actualFullChargeMinutes: number;
  predictedFullChargeMinutes: number;
  signedErrorMinutes: number;
  absoluteErrorMinutes: number;
  absolutePercentageError: number;
  wattageBand:
    | '<=45W'
    | '46-80W'
    | '81-120W'
    | '>120W';
}

export interface GeekerwanChargingBacktestAggregate {
  key: string;
  count: number;
  maeMinutes: number;
  mapePercent: number;
  meanSignedErrorMinutes: number;
}

export interface GeekerwanChargingBacktestResult {
  version: string;
  status: 'resolved' | 'unresolved';
  evaluatedDevices: number;
  skippedDevices: number;
  maeMinutes?: number;
  mapePercent?: number;
  meanSignedErrorMinutes?: number;
  byManufacturer: GeekerwanChargingBacktestAggregate[];
  byWattageBand: GeekerwanChargingBacktestAggregate[];
  rows: GeekerwanChargingBacktestRow[];
  worstMisses: GeekerwanChargingBacktestRow[];
  unresolvedReason?: string;
  note: string;
}

function wattageBand(
  watts: number,
): GeekerwanChargingBacktestRow['wattageBand'] {
  if (watts <= 45) return '<=45W';
  if (watts <= 80) return '46-80W';
  if (watts <= 120) return '81-120W';
  return '>120W';
}

function aggregate(
  rows: GeekerwanChargingBacktestRow[],
  keyOf: (
    row: GeekerwanChargingBacktestRow,
  ) => string,
): GeekerwanChargingBacktestAggregate[] {
  const groups =
    new Map<
      string,
      GeekerwanChargingBacktestRow[]
    >();

  for (const row of rows) {
    const key = keyOf(row);
    const group =
      groups.get(key) ?? [];
    group.push(row);
    groups.set(key, group);
  }

  return [...groups.entries()]
    .map(([key, group]) => ({
      key,
      count: group.length,
      maeMinutes:
        group.reduce(
          (sum, row) =>
            sum +
            row.absoluteErrorMinutes,
          0,
        ) / group.length,
      mapePercent:
        group.reduce(
          (sum, row) =>
            sum +
            row.absolutePercentageError,
          0,
        ) / group.length,
      meanSignedErrorMinutes:
        group.reduce(
          (sum, row) =>
            sum +
            row.signedErrorMinutes,
          0,
        ) / group.length,
    }))
    .sort(
      (a, b) =>
        b.count - a.count,
    );
}

function positive(
  value: unknown,
): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value > 0
  );
}

export function backtestAgainstGeekerwanCharging(
  corpus: DeviceCorpus,
): GeekerwanChargingBacktestResult {
  const deviceById =
    new Map(
      corpus.devices.map(
        (device) => [
          device.variant.id,
          device,
        ],
      ),
    );

  const canonicalById =
    new Map<string, string>();

  for (
    const link of
    linkDeviceIdentities(corpus)
  ) {
    for (
      const id of
      link.linkedDeviceIds
    ) {
      canonicalById.set(
        id,
        link.canonicalDeviceId,
      );
    }
  }

  const geekerwanRows =
    corpus.measurements.filter(
      (measurement) =>
        measurement.metric ===
        'geekerwan_wall_input_curve_end_minutes' &&
        measurement.value > 0 &&
        positive(
          measurement.testChargerWatts,
        ),
    );

  const rows:
    GeekerwanChargingBacktestRow[] =
    [];
  let skippedDevices = 0;

  const nonGeekerwanCorpus:
    DeviceCorpus = {
      ...corpus,
      measurements:
        corpus.measurements.filter(
          (measurement) =>
            !measurement.metric.startsWith(
              'geekerwan_wall_input_',
            ) &&
            measurement.metric !==
              'geekerwan_average_wall_input_power_w',
        ),
    };

  for (
    const actual of geekerwanRows
  ) {
    const sourceDevice =
      deviceById.get(
        actual.deviceVariantId,
      );

    if (!sourceDevice) {
      skippedDevices += 1;
      continue;
    }

    const canonicalDeviceId =
      canonicalById.get(
        actual.deviceVariantId,
      ) ??
      actual.deviceVariantId;

    const canonicalDevice =
      deviceById.get(
        canonicalDeviceId,
      );

    const batteryMah =
      canonicalDevice?.variant
        .battery?.capacityMah ??
      canonicalDevice?.variant
        .battery?.typicalCapacityMah ??
      sourceDevice.variant
        .battery?.capacityMah ??
      sourceDevice.variant
        .battery?.typicalCapacityMah;

    if (
      !positive(batteryMah) ||
      !positive(
        actual.testChargerWatts,
      )
    ) {
      skippedDevices += 1;
      continue;
    }

    const manufacturer =
      canonicalDevice?.variant
        .identity.manufacturer ??
      sourceDevice.variant
        .identity.manufacturer;

    const model =
      canonicalDevice?.variant
        .identity.modelName ??
      sourceDevice.variant
        .identity.modelName;

    const estimate =
      estimateChargingFromCorpus(
        nonGeekerwanCorpus,
        {
          batteryMah,
          wiredChargingWatts:
            actual.testChargerWatts,
          manufacturer,
          region:
            canonicalDevice?.variant
              .identity.region,
          batteryChemistry:
            canonicalDevice?.variant
              .battery?.chemistry,
          cellArchitecture:
            canonicalDevice?.charging
              ?.cellArchitecture,
        },
      );

    const predicted =
      estimate.estimate
        ?.timeTo100Minutes
        ?.expected;

    if (
      estimate.status !==
        'resolved' ||
      !positive(predicted)
    ) {
      skippedDevices += 1;
      continue;
    }

    const signedErrorMinutes =
      predicted -
      actual.value;

    const absoluteErrorMinutes =
      Math.abs(
        signedErrorMinutes,
      );

    rows.push({
      deviceVariantId:
        actual.deviceVariantId,
      canonicalDeviceId,
      manufacturer,
      model,
      batteryMah,
      chargerWatts:
        actual.testChargerWatts,
      actualFullChargeMinutes:
        actual.value,
      predictedFullChargeMinutes:
        predicted,
      signedErrorMinutes,
      absoluteErrorMinutes,
      absolutePercentageError:
        absoluteErrorMinutes /
        actual.value *
        100,
      wattageBand:
        wattageBand(
          actual.testChargerWatts,
        ),
    });
  }

  if (!rows.length) {
    return {
      version:
        GEEKERWAN_CHARGING_BACKTEST_VERSION,
      status: 'unresolved',
      evaluatedDevices: 0,
      skippedDevices,
      byManufacturer: [],
      byWattageBand: [],
      rows: [],
      worstMisses: [],
      unresolvedReason:
        'No Geekerwan charging rows had enough canonical battery-capacity context for an independent prediction.',
      note:
        'External Geekerwan measurements are held out from the charging estimator during this validation.',
    };
  }

  const maeMinutes =
    rows.reduce(
      (sum, row) =>
        sum +
        row.absoluteErrorMinutes,
      0,
    ) /
    rows.length;

  const mapePercent =
    rows.reduce(
      (sum, row) =>
        sum +
        row.absolutePercentageError,
      0,
    ) /
    rows.length;

  const meanSignedErrorMinutes =
    rows.reduce(
      (sum, row) =>
        sum +
        row.signedErrorMinutes,
      0,
    ) /
    rows.length;

  return {
    version:
      GEEKERWAN_CHARGING_BACKTEST_VERSION,
    status: 'resolved',
    evaluatedDevices:
      rows.length,
    skippedDevices,
    maeMinutes,
    mapePercent,
    meanSignedErrorMinutes,
    byManufacturer:
      aggregate(
        rows,
        (row) =>
          row.manufacturer,
      ),
    byWattageBand:
      aggregate(
        rows,
        (row) =>
          row.wattageBand,
      ),
    rows,
    worstMisses:
      [...rows]
        .sort(
          (a, b) =>
            b.absolutePercentageError -
            a.absolutePercentageError,
        )
        .slice(0, 10),
    note:
      'PhoneFuturist predicts each Geekerwan-tested phone using the non-Geekerwan charging corpus, then compares that prediction against Geekerwan/SOCPK full charging-curve duration. This is an independent cross-protocol validation rather than self-fit accuracy.',
  };
}
