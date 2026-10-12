import snapshotJson from '../../../../data/calibration/chargerlab-current-charging-2026-10-12-0.1.json';

export const CHARGERLAB_CHARGING_EVIDENCE_VERSION =
  'chargerlab-charging-evidence-0.1.0';

export interface ChargerLabChargingResult {
  manufacturer: string;
  model: string;
  batteryMah?: number;
  advertisedWiredWatts?: number;
  observedInputPowerW?: number;
  compatibilityOriginalChargerPowerW?: number;
  compatibilityObservedMaxPowerW?: number;
  fullChargeTestPeakPowerW?: number;
  fullChargeTestPeakDurationSeconds?: number;
  fiftyPercentMinutes?: number;
  seventyPercentMinutes?: number;
  eightyPercentMinutes?: number;
  fullChargeMinutes?: number;
  ambientTemperatureC?: number;
  maximumObservedTemperatureC?: number;
  observationKind?: string;
  sourceUrl: string;
  notes: string[];
}

type RawSnapshot = {
  version: string;
  accessedDate: string;
  source: {
    publisher: string;
    homepage: string;
    sourceRole: string;
    protocol: string;
  };
  devices: ChargerLabChargingResult[];
};

const snapshot =
  snapshotJson as unknown as RawSnapshot;

function normalizeModel(
  manufacturer: string,
  model: string,
) {
  const maker =
    manufacturer
      .trim()
      .toLowerCase();

  let value =
    model
      .trim()
      .toLowerCase();

  if (
    maker &&
    value.startsWith(
      `${maker} `,
    )
  ) {
    value =
      value.slice(
        maker.length + 1,
      );
  }

  if (
    maker === 'samsung' &&
    value.startsWith('galaxy ')
  ) {
    value =
      value.slice(7);
  }

  return value
    .replace(/\b5g\b/g, '')
    .replace(/\+/g, ' plus ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function listChargerLabChargingResults() {
  return snapshot.devices.map(
    (row) => ({
      ...row,
      notes: [...row.notes],
    }),
  );
}

export function findChargerLabChargingResult(
  manufacturer: string,
  model: string,
) {
  const maker =
    manufacturer
      .trim()
      .toLowerCase();

  const target =
    normalizeModel(
      manufacturer,
      model,
    );

  return snapshot.devices.find(
    (row) =>
      row.manufacturer
        .trim()
        .toLowerCase() === maker &&
      normalizeModel(
        row.manufacturer,
        row.model,
      ) === target,
  );
}

export function chargerLabPeakPowerContext(
  result: ChargerLabChargingResult,
) {
  const observedPeakCandidates = [
    result.observedInputPowerW,
    result.compatibilityObservedMaxPowerW,
    result.compatibilityOriginalChargerPowerW,
    result.fullChargeTestPeakPowerW,
  ].filter(
    (value): value is number =>
      typeof value === 'number' &&
      Number.isFinite(value) &&
      value > 0,
  );

  const observedPeakPowerW =
    observedPeakCandidates.length
      ? Math.max(
          ...observedPeakCandidates,
        )
      : undefined;

  const advertisedUtilizationFraction =
    observedPeakPowerW !== undefined &&
    result.advertisedWiredWatts !==
      undefined &&
    result.advertisedWiredWatts > 0
      ? observedPeakPowerW /
        result.advertisedWiredWatts
      : undefined;

  return {
    observedPeakPowerW,
    ...(advertisedUtilizationFraction !==
    undefined
      ? {
          advertisedUtilizationFraction,
          advertisedUtilizationPercent:
            advertisedUtilizationFraction *
            100,
        }
      : {}),
    note:
      'Observed peak/input power is a compatibility and curve sanity check only. It is not assumed to be sustained throughout the charge and is not converted directly into full-charge time.',
  };
}

export function findChargerLabManufacturerClass(
  manufacturer: string,
  advertisedWiredWatts: number,
  toleranceWatts = 20,
) {
  const maker =
    manufacturer
      .trim()
      .toLowerCase();

  return snapshot.devices
    .filter(
      (row) =>
        row.manufacturer
          .trim()
          .toLowerCase() === maker &&
        row.advertisedWiredWatts !==
          undefined &&
        Math.abs(
          row.advertisedWiredWatts -
            advertisedWiredWatts,
        ) <= toleranceWatts,
    )
    .map((row) => ({
      result: {
        ...row,
        notes: [...row.notes],
      },
      context:
        chargerLabPeakPowerContext(
          row,
        ),
    }));
}

export function getChargerLabEvidenceMetadata() {
  return {
    version: snapshot.version,
    accessedDate:
      snapshot.accessedDate,
    publisher:
      snapshot.source.publisher,
    protocol:
      snapshot.source.protocol,
    deviceCount:
      snapshot.devices.length,
  };
}
