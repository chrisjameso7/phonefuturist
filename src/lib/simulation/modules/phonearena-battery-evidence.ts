import snapshotJson from '../../../../data/calibration/phonearena-battery-benchmark-2026-10-12-0.1.json';

export const PHONEARENA_BATTERY_EVIDENCE_VERSION =
  'phonearena-battery-evidence-0.1.0';

export interface PhoneArenaBatteryResult {
  manufacturer: string;
  model: string;
  url: string;
  batteryMah: number;
  estimatedMinutes: number;
  browsingMinutes: number;
  videoMinutes: number;
  gamingMinutes: number;
  releaseDate: string;
}

export interface PhoneArenaChargingResult {
  manufacturer: string;
  model: string;
  url: string;
  batteryMah: number;
  wiredFullMinutes?: number;
  wirelessFullMinutes?: number;
  wiredChargerWatts?: number;
  wirelessChargerWatts?: number;
  wired30MinutePercent?: number;
  wireless30MinutePercent?: number;
  releaseDate: string;
}

type RawSnapshot = {
  version: string;
  accessedDate: string;
  source: {
    publisher: string;
    url: string;
    methodologyUrl: string;
    conditionsUrl: string;
    sourceRole: string;
    protocol: string;
  };
  battery: PhoneArenaBatteryResult[];
  charging: PhoneArenaChargingResult[];
};

const snapshot =
  snapshotJson as unknown as RawSnapshot;

function normalize(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\b5g\b/g, '')
    .replace(/\bpro\+\b/g, 'pro plus')
    .replace(/\+/g, ' plus ')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function canonicalManufacturer(
  manufacturer: string,
) {
  const value =
    normalize(manufacturer);

  if (value === 'oppo') return 'oppo';
  if (value === 'nubia') return 'nubia';
  if (value === 'redmagic') return 'redmagic';
  if (value === 'realme') return 'realme';
  if (value === 'vivo') return 'vivo';
  return value;
}

function exactRow<T extends {
  manufacturer: string;
  model: string;
}>(
  rows: T[],
  manufacturer: string,
  model: string,
): T | undefined {
  const maker =
    canonicalManufacturer(
      manufacturer,
    );
  const target =
    normalize(model);

  const exact =
    rows.find(
      (row) =>
        canonicalManufacturer(
          row.manufacturer,
        ) === maker &&
        normalize(row.model) ===
          target,
    );

  if (exact) return exact;

  const manufacturerRows =
    rows.filter(
      (row) =>
        canonicalManufacturer(
          row.manufacturer,
        ) === maker,
    );

  const partial =
    manufacturerRows.filter(
      (row) => {
        const candidate =
          normalize(row.model);

        return (
          candidate.includes(target) ||
          target.includes(candidate)
        );
      },
    );

  return partial.length === 1
    ? partial[0]
    : undefined;
}

export function listPhoneArenaBatteryResults() {
  return snapshot.battery.map(
    (row) => ({ ...row }),
  );
}

export function listPhoneArenaChargingResults() {
  return snapshot.charging.map(
    (row) => ({ ...row }),
  );
}

export function findPhoneArenaBatteryResult(
  manufacturer: string,
  model: string,
) {
  return exactRow(
    snapshot.battery,
    manufacturer,
    model,
  );
}

export function findPhoneArenaChargingResult(
  manufacturer: string,
  model: string,
) {
  return exactRow(
    snapshot.charging,
    manufacturer,
    model,
  );
}

export function phoneArenaBatteryEfficiency(
  result: PhoneArenaBatteryResult,
) {
  return {
    browsingMinutesPer1000Mah:
      result.browsingMinutes /
      (result.batteryMah / 1000),
    videoMinutesPer1000Mah:
      result.videoMinutes /
      (result.batteryMah / 1000),
    gamingMinutesPer1000Mah:
      result.gamingMinutes /
      (result.batteryMah / 1000),
    estimatedMinutesPer1000Mah:
      result.estimatedMinutes /
      (result.batteryMah / 1000),
  };
}

export function phoneArenaChargingEfficiency(
  result: PhoneArenaChargingResult,
) {
  return {
    ...(result.wiredFullMinutes !==
      undefined
      ? {
          wiredMinutesPer1000Mah:
            result.wiredFullMinutes /
            (result.batteryMah /
              1000),
        }
      : {}),
    ...(result.wirelessFullMinutes !==
      undefined
      ? {
          wirelessMinutesPer1000Mah:
            result.wirelessFullMinutes /
            (result.batteryMah /
              1000),
        }
      : {}),
    ...(result.wired30MinutePercent !==
      undefined
      ? {
          wiredMahAddedIn30Minutes:
            result.batteryMah *
            result.wired30MinutePercent /
            100,
        }
      : {}),
    ...(result.wireless30MinutePercent !==
      undefined
      ? {
          wirelessMahAddedIn30Minutes:
            result.batteryMah *
            result.wireless30MinutePercent /
            100,
        }
      : {}),
  };
}

export function getPhoneArenaEvidenceMetadata() {
  return {
    version: snapshot.version,
    accessedDate:
      snapshot.accessedDate,
    source: {
      ...snapshot.source,
    },
    batteryRows:
      snapshot.battery.length,
    chargingRows:
      snapshot.charging.length,
  };
}
