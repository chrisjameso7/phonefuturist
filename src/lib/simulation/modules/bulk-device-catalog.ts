import type {
  DeviceCorpus,
  DeviceCorpusRecord,
  CorpusSource,
} from './device-corpus';

export const BULK_DEVICE_CATALOG_VERSION =
  'bulk-device-catalog-0.1.0';

export type BulkCatalogEvidenceRole =
  | 'identity'
  | 'specification'
  | 'measurement'
  | 'official';

export interface BulkCatalogSource {
  id: string;
  publisher: string;
  url: string;
  role: BulkCatalogEvidenceRole;
  protocol?: string;
  accessedDate?: string;
}

export interface BulkCatalogDevice {
  id: string;
  manufacturer: string;
  model: string;
  family?: string;
  region?: string;
  releaseDate?: string;
  sourceIds: string[];
  batteryMah?: number;
  batteryVoltageV?: number;
  batteryChemistry?: string;
  socVendor?:
    | 'Qualcomm'
    | 'MediaTek'
    | 'Apple'
    | 'Samsung'
    | 'Google'
    | 'Huawei'
    | 'Unisoc'
    | 'Other';
  socName?: string;
  display?: {
    diagonalInches?: number;
    resolutionWidthPx?: number;
    resolutionHeightPx?: number;
    refreshRateHz?: number;
    panelTechnology?: string;
  };
  dimensions?: {
    widthMm?: number;
    heightMm?: number;
    thicknessMm?: number;
    weightG?: number;
  };
  charging?: {
    advertisedWiredWatts?: number;
    advertisedWirelessWatts?: number;
  };
  notes?: string[];
}

export interface BulkCatalogFile {
  version: string;
  sources: BulkCatalogSource[];
  devices: BulkCatalogDevice[];
}

function normalizedIdPart(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function makeBulkDeviceId(
  manufacturer: string,
  model: string,
  region?: string,
) {
  return [
    normalizedIdPart(manufacturer),
    normalizedIdPart(model),
    region
      ? normalizedIdPart(region)
      : undefined,
  ]
    .filter(Boolean)
    .join('-');
}

function dedupeSources(
  sources: BulkCatalogSource[],
) {
  const byId =
    new Map<
      string,
      BulkCatalogSource
    >();

  for (const source of sources) {
    if (!byId.has(source.id)) {
      byId.set(
        source.id,
        source,
      );
    }
  }

  return [...byId.values()];
}

function dedupeDevices(
  devices: BulkCatalogDevice[],
) {
  const byId =
    new Map<
      string,
      BulkCatalogDevice
    >();

  for (const device of devices) {
    if (!byId.has(device.id)) {
      byId.set(
        device.id,
        device,
      );
      continue;
    }

    const existing =
      byId.get(device.id)!;

    byId.set(
      device.id,
      {
        ...existing,
        ...device,
        sourceIds: [
          ...new Set([
            ...existing.sourceIds,
            ...device.sourceIds,
          ]),
        ],
        display: {
          ...existing.display,
          ...device.display,
        },
        dimensions: {
          ...existing.dimensions,
          ...device.dimensions,
        },
        charging: {
          ...existing.charging,
          ...device.charging,
        },
        notes: [
          ...new Set([
            ...(existing.notes ?? []),
            ...(device.notes ?? []),
          ]),
        ],
      },
    );
  }

  return [...byId.values()];
}

export function buildBulkDeviceCatalogCorpus(
  file: BulkCatalogFile,
): DeviceCorpus {
  const sources: CorpusSource[] =
    dedupeSources(
      file.sources,
    ).map(
      ({
        role: _role,
        ...source
      }) => source,
    );

  const knownSourceIds =
    new Set(
      sources.map(
        (source) => source.id,
      ),
    );

  const devices:
    DeviceCorpusRecord[] =
    dedupeDevices(
      file.devices,
    ).map((row) => ({
      variant: {
        id: row.id,
        identity: {
          manufacturer:
            row.manufacturer,
          family:
            row.family ??
            row.model,
          modelName:
            row.model,
          ...(row.region
            ? {
                region:
                  row.region,
              }
            : {}),
        },
        ...(row.batteryMah !==
          undefined ||
        row.batteryVoltageV !==
          undefined ||
        row.batteryChemistry
          ? {
              battery: {
                ...(row.batteryMah !==
                undefined
                  ? {
                      capacityMah:
                        row.batteryMah,
                    }
                  : {}),
                ...(row.batteryVoltageV !==
                undefined
                  ? {
                      nominalVoltageV:
                        row.batteryVoltageV,
                    }
                  : {}),
                ...(row.batteryChemistry
                  ? {
                      chemistry:
                        row.batteryChemistry,
                    }
                  : {}),
              },
            }
          : {}),
        ...(row.socVendor &&
        row.socName
          ? {
              soc: {
                vendor:
                  row.socVendor,
                name: row.socName,
              },
            }
          : {}),
        ...(row.notes?.length
          ? {
              notes:
                row.notes,
            }
          : {}),
      },
      ...(row.releaseDate
        ? {
            releaseDate:
              row.releaseDate,
          }
        : {}),
      ...(row.display
        ? {
            display: {
              ...row.display,
            },
          }
        : {}),
      ...(row.dimensions
        ? {
            dimensions: {
              ...row.dimensions,
            },
          }
        : {}),
      ...(row.charging
        ? {
            charging: {
              ...row.charging,
            },
          }
        : {}),
      sourceIds:
        row.sourceIds.filter(
          (sourceId) =>
            knownSourceIds.has(
              sourceId,
            ),
        ),
    }));

  return {
    version: file.version,
    sources,
    devices,
    measurements: [],
  };
}
