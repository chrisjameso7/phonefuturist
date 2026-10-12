import catalogJson from '../../../../data/catalog/bulk-device-catalog-2026-10-12-0.1.json';
import {
  buildBulkDeviceCatalogCorpus,
  type BulkCatalogDevice,
  type BulkCatalogFile,
  type BulkCatalogSource,
} from './bulk-device-catalog';
import type {
  DeviceCorpus,
} from './device-corpus';
import type {
  SocVendor,
} from './device-variant';
import {
  findDeviceByName,
  type DeviceLookupMatch,
} from './device-lookup';

export const SOURCED_DEVICE_CATALOG_VERSION =
  'sourced-device-catalog-0.1.0';

type SourceKey =
  | 'gsmarena'
  | 'phonearena'
  | 'smartprix'
  | 'nanoreview';

type RawCatalogRow = {
  id: string;
  manufacturer: string;
  model: string;
  releaseYear?: number;
  releaseDateText?: string;
  batteryMah?: number;
  displayInches?: number;
  chipset?: string;
  source: SourceKey;
  sourceUrl: string;
};

type RawCatalogFile = {
  version: string;
  catalogOnly: boolean;
  generatedFromPublicCatalogIndexes: boolean;
  publishers: Record<
    SourceKey,
    string
  >;
  devices: RawCatalogRow[];
};

const sourceUrls: Record<
  SourceKey,
  string
> = {
  gsmarena:
    'https://www.gsmarena.com/',
  phonearena:
    'https://www.phonearena.com/',
  smartprix:
    'https://www.smartprix.com/',
  nanoreview:
    'https://nanoreview.net/',
};

function sourceId(
  key: SourceKey,
) {
  return `bulk-${key}-catalog`;
}

function socVendorFromChipset(
  chipset?: string,
): SocVendor | undefined {
  if (!chipset) return undefined;

  const value =
    chipset.toLowerCase();

  if (
    value.includes('apple a') ||
    value.includes('apple m')
  ) {
    return 'Apple';
  }

  if (
    value.includes('snapdragon') ||
    value.includes('qualcomm')
  ) {
    return 'Qualcomm';
  }

  if (
    value.includes('exynos')
  ) {
    return 'Samsung';
  }

  if (
    value.includes('dimensity') ||
    value.includes('helio') ||
    value.includes('mediatek')
  ) {
    return 'MediaTek';
  }

  if (
    value.includes('tensor')
  ) {
    return 'Google';
  }

  if (
    value.includes('kirin') ||
    value.includes('hisilicon')
  ) {
    return 'Huawei';
  }

  if (
    value.includes('unisoc') ||
    value.includes('spreadtrum')
  ) {
    return 'Unisoc';
  }

  return 'other';
}

function isoReleaseDate(
  row: RawCatalogRow,
) {
  if (
    row.releaseYear === undefined
  ) {
    return undefined;
  }

  return `${row.releaseYear}-01-01`;
}

function buildSources(
  raw: RawCatalogFile,
): BulkCatalogSource[] {
  return (
    Object.keys(
      raw.publishers,
    ) as SourceKey[]
  ).map((key) => ({
    id: sourceId(key),
    publisher:
      raw.publishers[key],
    url: sourceUrls[key],
    role: 'specification',
    accessedDate: '2026-10-12',
    protocol:
      'Public device catalog/index metadata used for identity and specification coverage only.',
  }));
}

function buildDevice(
  row: RawCatalogRow,
): BulkCatalogDevice {
  const socVendor =
    socVendorFromChipset(
      row.chipset,
    );

  return {
    id: row.id,
    manufacturer:
      row.manufacturer,
    model: row.model,
    family: row.model,
    sourceIds: [
      sourceId(row.source),
    ],
    ...(isoReleaseDate(row)
      ? {
          releaseDate:
            isoReleaseDate(row),
        }
      : {}),
    ...(row.batteryMah !==
    undefined
      ? {
          batteryMah:
            row.batteryMah,
        }
      : {}),
    ...(row.chipset &&
    socVendor
      ? {
          socVendor,
          socName:
            row.chipset,
        }
      : {}),
    ...(row.displayInches !==
    undefined
      ? {
          display: {
            diagonalInches:
              row.displayInches,
          },
        }
      : {}),
    notes: [
      'Catalog-only source-backed metadata; not measurement evidence.',
      `Source URL: ${row.sourceUrl}`,
      ...(row.releaseDateText
        ? [
            `Source release text: ${row.releaseDateText}`,
          ]
        : []),
    ],
  };
}

let cached:
  | DeviceCorpus
  | undefined;

export function buildSourcedDeviceCatalog(): DeviceCorpus {
  if (cached) return cached;

  const raw =
    catalogJson as unknown as RawCatalogFile;

  const file: BulkCatalogFile = {
    version:
      raw.version,
    sources:
      buildSources(raw),
    devices:
      raw.devices.map(
        buildDevice,
      ),
  };

  const corpus =
    buildBulkDeviceCatalogCorpus(
      file,
    );

  corpus.devices.forEach(
    (device) => {
      device.catalogTrust =
        'source-backed-unverified';
    },
  );

  cached = corpus;
  return corpus;
}

export function getSourcedDeviceCatalogCount() {
  return (
    catalogJson as unknown as RawCatalogFile
  ).devices.length;
}

export function searchSourcedDeviceCatalog(
  query: string,
  limit = 10,
): DeviceLookupMatch[] {
  return findDeviceByName(
    buildSourcedDeviceCatalog(),
    query,
    limit,
  );
}

export function clearSourcedDeviceCatalogCache() {
  cached = undefined;
}
