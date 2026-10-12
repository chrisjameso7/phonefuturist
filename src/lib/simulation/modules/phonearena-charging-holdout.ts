import type {
  DeviceCorpus,
} from './device-corpus';
import {
  estimateChargingFromCorpus,
} from './charging-corpus-estimator';

export const PHONEARENA_CHARGING_HOLDOUT_VERSION =
  'phonearena-charging-holdout-0.1.0';

export interface PhoneArenaChargingHoldoutRow {
  deviceVariantId: string;
  manufacturer: string;
  model: string;
  batteryMah: number;
  chargerWatts: number;
  actualFullChargeMinutes: number;
  predictedFullChargeMinutes: number;
  signedFullChargeErrorMinutes: number;
  absoluteFullChargeErrorMinutes: number;
  fullChargeAbsolutePercentageError: number;
  actualThirtyMinutePercent?: number;
  predictedThirtyMinutePercent?: number;
  signedThirtyMinuteErrorPoints?: number;
  absoluteThirtyMinuteErrorPoints?: number;
  wattageBand:
    | '<=30W'
    | '31-60W'
    | '61-90W'
    | '91-120W'
    | '>120W';
}

export interface PhoneArenaChargingHoldoutAggregate {
  key: string;
  count: number;
  maeMinutes: number;
  mapePercent: number;
  meanSignedErrorMinutes: number;
  thirtyMinuteCount: number;
  thirtyMinuteMaePoints?: number;
  thirtyMinuteMeanSignedErrorPoints?: number;
}

export interface PhoneArenaChargingHoldoutResult {
  version: string;
  status: 'resolved' | 'unresolved';
  evaluatedDevices: number;
  skippedDevices: number;
  maeMinutes?: number;
  mapePercent?: number;
  meanSignedErrorMinutes?: number;
  thirtyMinuteEvaluatedDevices: number;
  thirtyMinuteMaePoints?: number;
  thirtyMinuteMeanSignedErrorPoints?: number;
  byManufacturer: PhoneArenaChargingHoldoutAggregate[];
  byWattageBand: PhoneArenaChargingHoldoutAggregate[];
  rows: PhoneArenaChargingHoldoutRow[];
  worstFullChargeMisses: PhoneArenaChargingHoldoutRow[];
  worstThirtyMinuteMisses: PhoneArenaChargingHoldoutRow[];
  unresolvedReason?: string;
  note: string;
}

const PHONEARENA_SOURCE_ID =
  'phonearena-charging-2025-2026';

function positive(
  value: unknown,
): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value > 0
  );
}

function wattageBand(
  watts: number,
): PhoneArenaChargingHoldoutRow['wattageBand'] {
  if (watts <= 30) return '<=30W';
  if (watts <= 60) return '31-60W';
  if (watts <= 90) return '61-90W';
  if (watts <= 120) return '91-120W';
  return '>120W';
}

function aggregate(
  rows: PhoneArenaChargingHoldoutRow[],
  keyOf: (
    row: PhoneArenaChargingHoldoutRow,
  ) => string,
): PhoneArenaChargingHoldoutAggregate[] {
  const groups =
    new Map<
      string,
      PhoneArenaChargingHoldoutRow[]
    >();

  for (const row of rows) {
    const key = keyOf(row);
    const group =
      groups.get(key) ?? [];
    group.push(row);
    groups.set(key, group);
  }

  return [...groups.entries()]
    .map(([key, group]) => {
      const p30Rows =
        group.filter(
          (
            row,
          ): row is PhoneArenaChargingHoldoutRow & {
            absoluteThirtyMinuteErrorPoints: number;
            signedThirtyMinuteErrorPoints: number;
          } =>
            row.absoluteThirtyMinuteErrorPoints !==
              undefined &&
            row.signedThirtyMinuteErrorPoints !==
              undefined,
        );

      return {
        key,
        count: group.length,
        maeMinutes:
          group.reduce(
            (sum, row) =>
              sum +
              row.absoluteFullChargeErrorMinutes,
            0,
          ) / group.length,
        mapePercent:
          group.reduce(
            (sum, row) =>
              sum +
              row.fullChargeAbsolutePercentageError,
            0,
          ) / group.length,
        meanSignedErrorMinutes:
          group.reduce(
            (sum, row) =>
              sum +
              row.signedFullChargeErrorMinutes,
            0,
          ) / group.length,
        thirtyMinuteCount:
          p30Rows.length,
        ...(p30Rows.length
          ? {
              thirtyMinuteMaePoints:
                p30Rows.reduce(
                  (sum, row) =>
                    sum +
                    row.absoluteThirtyMinuteErrorPoints,
                  0,
                ) /
                p30Rows.length,
              thirtyMinuteMeanSignedErrorPoints:
                p30Rows.reduce(
                  (sum, row) =>
                    sum +
                    row.signedThirtyMinuteErrorPoints,
                  0,
                ) /
                p30Rows.length,
            }
          : {}),
      };
    })
    .sort(
      (a, b) =>
        b.count - a.count,
    );
}

export function backtestAgainstPhoneArenaCharging(
  corpus: DeviceCorpus,
): PhoneArenaChargingHoldoutResult {
  const sourceDeviceIds =
    new Set(
      corpus.measurements
        .filter(
          (measurement) =>
            measurement.sourceId ===
              PHONEARENA_SOURCE_ID &&
            measurement.workload ===
              'charging',
        )
        .map(
          (measurement) =>
            measurement.deviceVariantId,
        ),
    );

  const phoneArenaDevices =
    corpus.devices.filter(
      (device) =>
        sourceDeviceIds.has(
          device.variant.id,
        ),
    );

  const deviceById =
    new Map(
      phoneArenaDevices.map(
        (device) => [
          device.variant.id,
          device,
        ],
      ),
    );

  const phoneArenaMeasurements =
    corpus.measurements.filter(
      (measurement) =>
        measurement.sourceId ===
          PHONEARENA_SOURCE_ID &&
        sourceDeviceIds.has(
          measurement.deviceVariantId,
        ),
    );

  const nonPhoneArenaCorpus:
    DeviceCorpus = {
      ...corpus,
      sources:
        corpus.sources.filter(
          (source) =>
            source.id !==
            PHONEARENA_SOURCE_ID,
        ),
      measurements:
        corpus.measurements.filter(
          (measurement) =>
            measurement.sourceId !==
            PHONEARENA_SOURCE_ID,
        ),
    };

  const rows:
    PhoneArenaChargingHoldoutRow[] =
    [];
  let skippedDevices = 0;

  for (
    const device of
    phoneArenaDevices
  ) {
    const batteryMah =
      device.variant.battery
        ?.capacityMah ??
      device.variant.battery
        ?.typicalCapacityMah;

    const actualFull =
      phoneArenaMeasurements.find(
        (measurement) =>
          measurement.deviceVariantId ===
            device.variant.id &&
          measurement.metric ===
            'wiredFullChargeMinutes' &&
          measurement.unit ===
            'minutes' &&
          positive(
            measurement.value,
          ),
      );

    if (
      !positive(batteryMah) ||
      !actualFull ||
      !positive(
        actualFull.testChargerWatts,
      )
    ) {
      skippedDevices += 1;
      continue;
    }

    const estimate =
      estimateChargingFromCorpus(
        nonPhoneArenaCorpus,
        {
          batteryMah,
          wiredChargingWatts:
            actualFull.testChargerWatts,
          manufacturer:
            device.variant.identity
              .manufacturer,
          region:
            device.variant.identity
              .region,
          batteryChemistry:
            device.variant.battery
              ?.chemistry,
          cellArchitecture:
            device.charging
              ?.cellArchitecture,
        },
      );

    const predictedFull =
      estimate.estimate
        ?.timeTo100Minutes
        ?.expected;

    if (
      estimate.status !==
        'resolved' ||
      !positive(
        predictedFull,
      )
    ) {
      skippedDevices += 1;
      continue;
    }

    const actualP30 =
      phoneArenaMeasurements.find(
        (measurement) =>
          measurement.deviceVariantId ===
            device.variant.id &&
          measurement.metric ===
            'charge30mPercent' &&
          measurement.unit ===
            'percent' &&
          positive(
            measurement.value,
          ),
      );

    const predictedP30 =
      estimate.estimate
        ?.charge30mPercent
        ?.expected;

    const signedFullChargeErrorMinutes =
      predictedFull -
      actualFull.value;

    const absoluteFullChargeErrorMinutes =
      Math.abs(
        signedFullChargeErrorMinutes,
      );

    const hasP30 =
      actualP30 !== undefined &&
      positive(
        actualP30.value,
      ) &&
      predictedP30 !== undefined &&
      Number.isFinite(
        predictedP30,
      );

    const signedThirtyMinuteErrorPoints =
      hasP30
        ? predictedP30 -
          actualP30.value
        : undefined;

    rows.push({
      deviceVariantId:
        device.variant.id,
      manufacturer:
        device.variant.identity
          .manufacturer,
      model:
        device.variant.identity
          .modelName,
      batteryMah,
      chargerWatts:
        actualFull.testChargerWatts,
      actualFullChargeMinutes:
        actualFull.value,
      predictedFullChargeMinutes:
        predictedFull,
      signedFullChargeErrorMinutes,
      absoluteFullChargeErrorMinutes,
      fullChargeAbsolutePercentageError:
        absoluteFullChargeErrorMinutes /
        actualFull.value *
        100,
      ...(hasP30
        ? {
            actualThirtyMinutePercent:
              actualP30.value,
            predictedThirtyMinutePercent:
              predictedP30,
            signedThirtyMinuteErrorPoints,
            absoluteThirtyMinuteErrorPoints:
              Math.abs(
                signedThirtyMinuteErrorPoints!,
              ),
          }
        : {}),
      wattageBand:
        wattageBand(
          actualFull.testChargerWatts,
        ),
    });
  }

  if (!rows.length) {
    return {
      version:
        PHONEARENA_CHARGING_HOLDOUT_VERSION,
      status: 'unresolved',
      evaluatedDevices: 0,
      skippedDevices,
      thirtyMinuteEvaluatedDevices: 0,
      byManufacturer: [],
      byWattageBand: [],
      rows: [],
      worstFullChargeMisses: [],
      worstThirtyMinuteMisses: [],
      unresolvedReason:
        'No PhoneArena charging rows could be independently predicted from the non-PhoneArena evidence corpus.',
      note:
        'PhoneArena measurements are fully held out from this validation.',
    };
  }

  const p30Rows =
    rows.filter(
      (
        row,
      ): row is PhoneArenaChargingHoldoutRow & {
        absoluteThirtyMinuteErrorPoints: number;
        signedThirtyMinuteErrorPoints: number;
      } =>
        row.absoluteThirtyMinuteErrorPoints !==
          undefined &&
        row.signedThirtyMinuteErrorPoints !==
          undefined,
    );

  return {
    version:
      PHONEARENA_CHARGING_HOLDOUT_VERSION,
    status: 'resolved',
    evaluatedDevices:
      rows.length,
    skippedDevices,
    maeMinutes:
      rows.reduce(
        (sum, row) =>
          sum +
          row.absoluteFullChargeErrorMinutes,
        0,
      ) /
      rows.length,
    mapePercent:
      rows.reduce(
        (sum, row) =>
          sum +
          row.fullChargeAbsolutePercentageError,
        0,
      ) /
      rows.length,
    meanSignedErrorMinutes:
      rows.reduce(
        (sum, row) =>
          sum +
          row.signedFullChargeErrorMinutes,
        0,
      ) /
      rows.length,
    thirtyMinuteEvaluatedDevices:
      p30Rows.length,
    ...(p30Rows.length
      ? {
          thirtyMinuteMaePoints:
            p30Rows.reduce(
              (sum, row) =>
                sum +
                row.absoluteThirtyMinuteErrorPoints,
              0,
            ) /
            p30Rows.length,
          thirtyMinuteMeanSignedErrorPoints:
            p30Rows.reduce(
              (sum, row) =>
                sum +
                row.signedThirtyMinuteErrorPoints,
              0,
            ) /
            p30Rows.length,
        }
      : {}),
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
    worstFullChargeMisses:
      [...rows]
        .sort(
          (a, b) =>
            b.fullChargeAbsolutePercentageError -
            a.fullChargeAbsolutePercentageError,
        )
        .slice(0, 10),
    worstThirtyMinuteMisses:
      [...p30Rows]
        .sort(
          (a, b) =>
            b.absoluteThirtyMinuteErrorPoints -
            a.absoluteThirtyMinuteErrorPoints,
        )
        .slice(0, 10),
    note:
      'PhoneArena charging measurements are removed from the estimator before prediction. Full-charge time and 30-minute percentage are then compared against the held-out PhoneArena results, making this an independent cross-protocol validation rather than self-fit accuracy.',
  };
}
