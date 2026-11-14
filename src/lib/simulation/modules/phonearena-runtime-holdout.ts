import type {
  DeviceCorpus,
} from './device-corpus';
import {
  resolveCorpusRuntimeBand,
  type RuntimeWorkload,
} from './corpus-runtime';
import type {
  SimulationInput,
} from '../types';

export const PHONEARENA_RUNTIME_HOLDOUT_VERSION =
  'phonearena-runtime-holdout-0.1.0';

const PHONEARENA_SOURCE_ID =
  'phonearena-battery-current-2026-10';

export interface PhoneArenaRuntimeHoldoutRow {
  deviceVariantId: string;
  manufacturer: string;
  model: string;
  workload: RuntimeWorkload;
  batteryMah: number;
  energyBasis: 'wh' | 'mah';
  actualHours: number;
  predictedHours: number;
  signedErrorHours: number;
  absoluteErrorHours: number;
  absolutePercentageError: number;
  evidenceScope:
    | 'same-soc-family'
    | 'same-soc-vendor'
    | 'protocol-cohort';
  referenceCount: number;
  publisherCount: number;
  /** Whether the prediction and held-out measurement use the exact same test protocol. */
  protocolMatched: boolean;
  referenceProtocol?: string;
  observedProtocol?: string;
}

export interface PhoneArenaRuntimeHoldoutAggregate {
  key: string;
  count: number;
  maeHours: number;
  mapePercent: number;
  meanSignedErrorHours: number;
}

export interface PhoneArenaRuntimeHoldoutResult {
  version: string;
  status: 'resolved' | 'unresolved';
  evaluatedRows: number;
  evaluatedDevices: number;
  skippedRows: number;
  protocolMatchedRows: number;
  crossProtocolRows: number;
  maeHours?: number;
  mapePercent?: number;
  meanSignedErrorHours?: number;
  byWorkload: PhoneArenaRuntimeHoldoutAggregate[];
  byManufacturer: PhoneArenaRuntimeHoldoutAggregate[];
  rows: PhoneArenaRuntimeHoldoutRow[];
  worstMisses: PhoneArenaRuntimeHoldoutRow[];
  unresolvedReason?: string;
  note: string;
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

function aggregate(
  rows: PhoneArenaRuntimeHoldoutRow[],
  keyOf: (
    row: PhoneArenaRuntimeHoldoutRow,
  ) => string,
): PhoneArenaRuntimeHoldoutAggregate[] {
  const groups =
    new Map<
      string,
      PhoneArenaRuntimeHoldoutRow[]
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
      maeHours:
        group.reduce(
          (sum, row) =>
            sum +
            row.absoluteErrorHours,
          0,
        ) / group.length,
      mapePercent:
        group.reduce(
          (sum, row) =>
            sum +
            row.absolutePercentageError,
          0,
        ) / group.length,
      meanSignedErrorHours:
        group.reduce(
          (sum, row) =>
            sum +
            row.signedErrorHours,
          0,
        ) / group.length,
    }))
    .sort(
      (a, b) =>
        b.count - a.count,
    );
}

export function backtestAgainstPhoneArenaRuntime(
  corpus: DeviceCorpus,
  mode: 'sparse' | 'spec-enriched' = 'sparse',
): PhoneArenaRuntimeHoldoutResult {
  const phoneArenaMeasurements =
    corpus.measurements.filter(
      (measurement) =>
        measurement.sourceId ===
          PHONEARENA_SOURCE_ID &&
        (
          measurement.workload ===
            'web_browsing' ||
          measurement.workload ===
            'video_playback' ||
          measurement.workload ===
            'gaming'
        ) &&
        measurement.unit.toLowerCase() ===
          'hours' &&
        positive(
          measurement.value,
        ),
    );

  const sourceDeviceIds =
    new Set(
      phoneArenaMeasurements.map(
        (measurement) =>
          measurement.deviceVariantId,
      ),
    );

  const deviceById =
    new Map(
      corpus.devices
        .filter(
          (device) =>
            sourceDeviceIds.has(
              device.variant.id,
            ),
        )
        .map(
          (device) => [
            device.variant.id,
            device,
          ],
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
    PhoneArenaRuntimeHoldoutRow[] =
    [];
  const observedSource = corpus.sources.find(source => source.id === PHONEARENA_SOURCE_ID);
  let skippedRows = 0;

  for (
    const actual of
    phoneArenaMeasurements
  ) {
    const device =
      deviceById.get(
        actual.deviceVariantId,
      );

    const batteryMah =
      device?.variant.battery
        ?.capacityMah ??
      device?.variant.battery
        ?.typicalCapacityMah;

    if (
      !device ||
      !positive(batteryMah)
    ) {
      skippedRows += 1;
      continue;
    }

    const input:
      SimulationInput = {
      formFactor: 'phone',
      displays: {
        primary: mode === 'spec-enriched' ? {
          diagonalInches: device.display?.diagonalInches,
          resolutionWidthPx: device.display?.resolutionWidthPx,
          resolutionHeightPx: device.display?.resolutionHeightPx,
          refreshRateHz: device.display?.refreshRateHz,
        } : {},
      },
      battery: {
        cells: [
          {
            capacityMah:
              batteryMah,
            ...(mode === 'spec-enriched' && device.variant.battery?.nominalVoltageV ? { nominalVoltageV: device.variant.battery.nominalVoltageV } : {}),
          },
        ],
      },
    };

    const estimate =
      resolveCorpusRuntimeBand(
        nonPhoneArenaCorpus,
        input,
        actual.workload as RuntimeWorkload,
        {},
        {
          manufacturer:
            device.variant.identity
              .manufacturer,
          ...(mode === 'spec-enriched' ? {
            socVendor: device.variant.soc?.vendor,
            socName: device.variant.soc?.name,
          } : {}),
        },
      );

    const drain =
      estimate.estimate
        ?.expectedMahPerHour;

    if (
      estimate.status !==
        'resolved' ||
      !positive(drain) ||
      !estimate.estimate
    ) {
      skippedRows += 1;
      continue;
    }

    const energyHours = estimate.estimate.energyBasis === 'wh' &&
      positive(estimate.estimate.targetEnergyWh) &&
      positive(estimate.estimate.expectedWhPerHour)
      ? estimate.estimate.targetEnergyWh / estimate.estimate.expectedWhPerHour
      : undefined;
    const predictedHours = energyHours ?? batteryMah / drain;

    const signedErrorHours =
      predictedHours -
      actual.value;

    const absoluteErrorHours =
      Math.abs(
        signedErrorHours,
      );

    rows.push({
      deviceVariantId:
        device.variant.id,
      manufacturer:
        device.variant.identity
          .manufacturer,
      model:
        device.variant.identity
          .modelName,
      workload:
        actual.workload as RuntimeWorkload,
      batteryMah,
      energyBasis: energyHours !== undefined ? 'wh' : 'mah',
      actualHours:
        actual.value,
      predictedHours,
      signedErrorHours,
      absoluteErrorHours,
      absolutePercentageError:
        absoluteErrorHours /
        actual.value *
        100,
      evidenceScope:
        estimate.estimate
          .evidenceScope,
      referenceCount:
        estimate.estimate
          .referenceCount,
      publisherCount:
        estimate.estimate
          .publisherCount,
      observedProtocol: observedSource?.protocol,
      referenceProtocol: estimate.estimate.protocol,
      protocolMatched: Boolean(observedSource?.protocol && estimate.estimate.protocol &&
        observedSource.protocol === estimate.estimate.protocol &&
        (observedSource.protocolVersion ?? '') === (estimate.estimate.protocolVersion ?? '')),
    });
  }

  if (!rows.length) {
    return {
      version:
        PHONEARENA_RUNTIME_HOLDOUT_VERSION,
      status: 'unresolved',
      evaluatedRows: 0,
      evaluatedDevices: 0,
      skippedRows,
      protocolMatchedRows: 0,
      crossProtocolRows: 0,
      byWorkload: [],
      byManufacturer: [],
      rows: [],
      worstMisses: [],
      unresolvedReason:
        'No PhoneArena runtime rows could be independently predicted from the non-PhoneArena runtime corpus.',
      note:
        'PhoneArena runtime measurements are fully held out from this validation.',
    };
  }

  return {
    version:
      PHONEARENA_RUNTIME_HOLDOUT_VERSION,
    status: 'resolved',
    evaluatedRows:
      rows.length,
    evaluatedDevices:
      new Set(
        rows.map(
          (row) =>
            row.deviceVariantId,
        ),
      ).size,
    skippedRows,
    protocolMatchedRows: rows.filter(row => row.protocolMatched).length,
    crossProtocolRows: rows.filter(row => !row.protocolMatched).length,
    maeHours:
      rows.reduce(
        (sum, row) =>
          sum +
          row.absoluteErrorHours,
        0,
      ) /
      rows.length,
    mapePercent:
      rows.reduce(
        (sum, row) =>
          sum +
          row.absolutePercentageError,
        0,
      ) /
      rows.length,
    meanSignedErrorHours:
      rows.reduce(
        (sum, row) =>
          sum +
          row.signedErrorHours,
        0,
      ) /
      rows.length,
    byWorkload:
      aggregate(
        rows,
        (row) =>
          row.workload,
      ),
    byManufacturer:
      aggregate(
        rows,
        (row) =>
          row.manufacturer,
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
      mode === 'sparse'
        ? 'Protocol compatibility is reported per row; cross-protocol error is diagnostic, not a validated like-for-like accuracy claim. PhoneArena browsing, video and gaming runtime measurements are removed from the estimator before prediction. This first holdout intentionally uses only battery capacity plus manufacturer context, measuring the simulator fallback path when richer leaked device specifications are absent.'
        : 'Protocol compatibility is reported per row; cross-protocol error is diagnostic, not a validated like-for-like accuracy claim. PhoneArena runtime measurements remain fully excluded from calibration. This diagnostic adds the held-out device display and processor specifications to compare accuracy against the sparse-spec fallback; it is not an independent laboratory protocol match.',
  };
}
