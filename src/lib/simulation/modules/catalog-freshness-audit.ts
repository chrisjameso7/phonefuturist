import type {
  DeviceCorpus,
  DeviceCorpusRecord,
} from './device-corpus';
import {
  buildTechApiDeviceCatalog,
} from './techapi-device-catalog';
import {
  buildGsmArenaCurrentIdentityCorpus,
} from './gsmarena-current-identity-corpus';

export const CATALOG_FRESHNESS_AUDIT_VERSION =
  'catalog-freshness-audit-0.1.0';

export type CatalogFreshnessStatus =
  | 'verified-2025-2026'
  | 'cross-source-verified-2025-2026'
  | 'current-catalog-year-unverified'
  | 'outside-target-window';

export interface CatalogFreshnessRow {
  deviceId: string;
  manufacturer: string;
  model: string;
  releaseDate?: string;
  status: CatalogFreshnessStatus;
  matchedDeviceId?: string;
}

export interface CatalogFreshnessAudit {
  version: string;
  totalGsmArenaRecords: number;
  verified2025To2026: number;
  crossSourceVerified2025To2026: number;
  yearUnverified: number;
  outsideTargetWindow: number;
  rows: CatalogFreshnessRow[];
  note: string;
}

function normalize(
  value: string,
) {
  return value
    .trim()
    .toLowerCase()
    .replace(
      /(global|china|india|eu|us|usa|5g|4g|lte)/g,
      ' ',
    )
    .replace(
      /([^)]*)/g,
      ' ',
    )
    .replace(/[^a-z0-9+]+/g, ' ')
    .replace(/s+/g, ' ')
    .trim();
}

function key(
  device: DeviceCorpusRecord,
) {
  return [
    normalize(
      device.variant.identity
        .manufacturer,
    ),
    normalize(
      device.variant.identity
        .modelName,
    ),
  ].join('::');
}

function yearOf(
  value?: string,
) {
  if (!value) return undefined;

  const match =
    value.match(
      /(20d{2})/,
    );

  if (!match) {
    return undefined;
  }

  const year =
    Number(match[1]);

  return Number.isFinite(year)
    ? year
    : undefined;
}

function isTargetYear(
  year?: number,
) {
  return (
    year !== undefined &&
    year >= 2025 &&
    year <= 2026
  );
}

export function auditCurrentCatalogFreshness(
  gsmArena:
    DeviceCorpus =
      buildGsmArenaCurrentIdentityCorpus(),
  techApi:
    DeviceCorpus =
      buildTechApiDeviceCatalog(),
): CatalogFreshnessAudit {
  const techByKey =
    new Map<
      string,
      DeviceCorpusRecord
    >();

  for (
    const device of
    techApi.devices
  ) {
    techByKey.set(
      key(device),
      device,
    );
  }

  const rows:
    CatalogFreshnessRow[] =
    gsmArena.devices.map(
      (device) => {
        const ownYear =
          yearOf(
            device.releaseDate,
          );

        if (
          ownYear !== undefined
        ) {
          return {
            deviceId:
              device.variant.id,
            manufacturer:
              device.variant.identity
                .manufacturer,
            model:
              device.variant.identity
                .modelName,
            releaseDate:
              device.releaseDate,
            status:
              isTargetYear(
                ownYear,
              )
                ? 'verified-2025-2026'
                : 'outside-target-window',
          };
        }

        const match =
          techByKey.get(
            key(device),
          );

        const matchedYear =
          yearOf(
            match?.releaseDate,
          );

        if (
          match &&
          isTargetYear(
            matchedYear,
          )
        ) {
          return {
            deviceId:
              device.variant.id,
            manufacturer:
              device.variant.identity
                .manufacturer,
            model:
              device.variant.identity
                .modelName,
            releaseDate:
              match.releaseDate,
            status:
              'cross-source-verified-2025-2026',
            matchedDeviceId:
              match.variant.id,
          };
        }

        return {
          deviceId:
            device.variant.id,
          manufacturer:
            device.variant.identity
              .manufacturer,
          model:
            device.variant.identity
              .modelName,
          status:
            'current-catalog-year-unverified',
        };
      },
    );

  const count = (
    status:
      CatalogFreshnessStatus,
  ) =>
    rows.filter(
      (row) =>
        row.status === status,
    ).length;

  return {
    version:
      CATALOG_FRESHNESS_AUDIT_VERSION,
    totalGsmArenaRecords:
      rows.length,
    verified2025To2026:
      count(
        'verified-2025-2026',
      ),
    crossSourceVerified2025To2026:
      count(
        'cross-source-verified-2025-2026',
      ),
    yearUnverified:
      count(
        'current-catalog-year-unverified',
      ),
    outsideTargetWindow:
      count(
        'outside-target-window',
      ),
    rows,
    note:
      'GSMArena manufacturer catalog ordering is useful for current-device discovery but does not prove release year by itself. A row is marked 2025-2026 only when its own release date or a normalized TechAPI cross-source match supplies that year.',
  };
}
