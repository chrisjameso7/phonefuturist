import type {
  DeviceCorpus,
} from './device-corpus';

export const CHARGING_INPUT_POWER_ESTIMATOR_VERSION =
  'charging-input-power-estimator-0.1.0';

export interface ChargingInputPowerQuery {
  advertisedWatts: number;
  manufacturer?: string;
  chargingStandard?: string;
  limit?: number;
}

export interface ChargingInputPowerReference {
  deviceVariantId: string;
  manufacturer: string;
  advertisedWatts: number;
  observedPeakWatts: number;
  observedToAdvertisedRatio: number;
  chargingStandard?: string;
  sourceId: string;
  weight: number;
}

export interface ChargingInputPowerEstimate {
  version: string;
  status: 'resolved' | 'unresolved';
  advertisedWatts: number;
  expectedObservedPeakWatts?: number;
  minObservedPeakWatts?: number;
  maxObservedPeakWatts?: number;
  expectedUtilizationPercent?: number;
  referenceCount: number;
  references: ChargingInputPowerReference[];
  unresolvedReason?: string;
  note: string;
}

function normalize(
  value?: string,
) {
  return value
    ?.trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function sameProtocol(
  actual?: string,
  requested?: string,
) {
  if (!requested) return true;
  if (!actual) return false;

  const a = normalize(actual) ?? '';
  const b = normalize(requested) ?? '';

  return (
    a.includes(b) ||
    b.includes(a)
  );
}

function closeness(
  a: number,
  b: number,
) {
  const relative =
    Math.abs(a - b) /
    Math.max(
      Math.abs(b),
      1,
    );

  return Math.max(
    0,
    1 - relative / 0.65,
  );
}

export function estimateObservedChargingInputPower(
  corpus: DeviceCorpus,
  query: ChargingInputPowerQuery,
): ChargingInputPowerEstimate {
  if (
    !Number.isFinite(
      query.advertisedWatts,
    ) ||
    query.advertisedWatts <= 0
  ) {
    return {
      version:
        CHARGING_INPUT_POWER_ESTIMATOR_VERSION,
      status: 'unresolved',
      advertisedWatts:
        query.advertisedWatts,
      referenceCount: 0,
      references: [],
      unresolvedReason:
        'Advertised charging wattage must be a positive finite value.',
      note:
        'No observed input power is inferred from an invalid advertised wattage.',
    };
  }

  const deviceById =
    new Map(
      corpus.devices.map(
        (device) => [
          device.variant.id,
          device,
        ],
      ),
    );

  const candidates:
    ChargingInputPowerReference[] =
    [];

  const seen =
    new Set<string>();

  for (
    const measurement of
    corpus.measurements
  ) {
    if (
      measurement.workload !==
        'charging' ||
      measurement.evidenceKind !==
        'measured'
    ) {
      continue;
    }

    const observed =
      measurement.measuredPeakWatts ??
      (
        measurement.metric ===
          'observedChargingPowerW' &&
        Number.isFinite(
          measurement.value,
        )
          ? measurement.value
          : undefined
      );

    if (
      observed === undefined ||
      !Number.isFinite(observed) ||
      observed <= 0
    ) {
      continue;
    }

    const device =
      deviceById.get(
        measurement.deviceVariantId,
      );

    const advertised =
      device?.charging
        ?.advertisedWiredWatts;

    if (
      !device ||
      advertised === undefined ||
      !Number.isFinite(advertised) ||
      advertised <= 0
    ) {
      continue;
    }

    if (
      !sameProtocol(
        measurement.chargingStandard,
        query.chargingStandard,
      )
    ) {
      continue;
    }

    const ratio =
      observed /
      advertised;

    if (
      !Number.isFinite(ratio) ||
      ratio <= 0 ||
      ratio > 1.25
    ) {
      continue;
    }

    const signature = [
      measurement.deviceVariantId,
      Math.round(observed * 10) /
        10,
      normalize(
        measurement.chargingStandard,
      ) ?? 'unknown',
    ].join('|');

    if (seen.has(signature)) {
      continue;
    }
    seen.add(signature);

    let weight =
      1 +
      3 *
        closeness(
          advertised,
          query.advertisedWatts,
        );

    if (
      query.manufacturer &&
      normalize(
        device.variant.identity
          .manufacturer,
      ) ===
        normalize(
          query.manufacturer,
        )
    ) {
      weight += 4;
    }

    if (
      query.chargingStandard &&
      sameProtocol(
        measurement.chargingStandard,
        query.chargingStandard,
      )
    ) {
      weight += 2;
    }

    candidates.push({
      deviceVariantId:
        measurement.deviceVariantId,
      manufacturer:
        device.variant.identity
          .manufacturer,
      advertisedWatts:
        advertised,
      observedPeakWatts:
        observed,
      observedToAdvertisedRatio:
        ratio,
      ...(measurement.chargingStandard
        ? {
            chargingStandard:
              measurement.chargingStandard,
          }
        : {}),
      sourceId:
        measurement.sourceId,
      weight,
    });
  }

  if (!candidates.length) {
    return {
      version:
        CHARGING_INPUT_POWER_ESTIMATOR_VERSION,
      status: 'unresolved',
      advertisedWatts:
        query.advertisedWatts,
      referenceCount: 0,
      references: [],
      unresolvedReason:
        'No measured phone-side charging input references matched the requested context.',
      note:
        'Advertised charger wattage is not treated as observed phone input power.',
    };
  }

  const selected =
    candidates
      .sort(
        (a, b) =>
          b.weight -
          a.weight,
      )
      .slice(
        0,
        Math.max(
          1,
          query.limit ?? 8,
        ),
      );

  const totalWeight =
    selected.reduce(
      (sum, row) =>
        sum +
        row.weight,
      0,
    );

  const expectedRatio =
    selected.reduce(
      (sum, row) =>
        sum +
        row.observedToAdvertisedRatio *
          row.weight,
      0,
    ) /
    totalWeight;

  const expectedObservedPeakWatts =
    query.advertisedWatts *
    expectedRatio;

  const projected =
    selected.map(
      (row) =>
        query.advertisedWatts *
        row.observedToAdvertisedRatio,
    );

  return {
    version:
      CHARGING_INPUT_POWER_ESTIMATOR_VERSION,
    status: 'resolved',
    advertisedWatts:
      query.advertisedWatts,
    expectedObservedPeakWatts,
    minObservedPeakWatts:
      Math.min(...projected),
    maxObservedPeakWatts:
      Math.max(...projected),
    expectedUtilizationPercent:
      expectedRatio * 100,
    referenceCount:
      selected.length,
    references: selected,
    note:
      'Observed phone input is estimated from measured peak-power utilization of comparable devices. Advertised adapter wattage is never assumed to equal sustained or phone-side charging power.',
  };
}
