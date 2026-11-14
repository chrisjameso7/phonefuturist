import type {
  DeviceCorpus,
  DeviceCorpusRecord,
  CorpusSource,
} from './device-corpus';

export const BULK_DEVICE_IDENTITY_CORPUS_VERSION =
  'bulk-device-identity-corpus-0.1.0';

export type BulkIdentityEvidenceTier =
  | 'catalog'
  | 'official'
  | 'reviewed';

export interface BulkDeviceIdentityRow {
  id: string;
  manufacturer: string;
  model: string;
  sourceId: string;
  sourceUrl: string;
  sourceTier: BulkIdentityEvidenceTier;
  releaseDate?: string;
  region?: string;
  announcedYear?: number;
  formFactor?: string;
  notes?: string[];
}

export interface BulkDeviceIdentityFile {
  version: string;
  generatedAt?: string;
  source: {
    id: string;
    publisher: string;
    url: string;
    protocol?: string;
    accessedDate?: string;
  };
  devices: BulkDeviceIdentityRow[];
}

export interface BulkDeviceIdentityValidationIssue {
  code:
    | 'DUPLICATE_ID'
    | 'MISSING_SOURCE'
    | 'INVALID_YEAR'
    | 'INVALID_IDENTITY'
    | 'OUTSIDE_TARGET_WINDOW';
  rowId?: string;
  message: string;
}

function normalize(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function makeBulkDeviceIdentityId(
  manufacturer: string,
  model: string,
  suffix?: string,
) {
  return [
    normalize(manufacturer),
    normalize(model),
    suffix ? normalize(suffix) : undefined,
  ]
    .filter(Boolean)
    .join('-');
}

export function validateBulkDeviceIdentityFile(
  file: BulkDeviceIdentityFile,
  targetYearMin = 2025,
  targetYearMax = 2026,
): BulkDeviceIdentityValidationIssue[] {
  const issues:
    BulkDeviceIdentityValidationIssue[] = [];
  const ids = new Set<string>();

  for (const row of file.devices) {
    if (
      !row.id.trim() ||
      !row.manufacturer.trim() ||
      !row.model.trim() ||
      !row.sourceUrl.trim()
    ) {
      issues.push({
        code: 'INVALID_IDENTITY',
        rowId: row.id,
        message:
          'Bulk identity rows require id, manufacturer, model and source URL.',
      });
    }

    if (ids.has(row.id)) {
      issues.push({
        code: 'DUPLICATE_ID',
        rowId: row.id,
        message: `Duplicate bulk device id: ${row.id}`,
      });
    }
    ids.add(row.id);

    if (
      row.sourceId !== file.source.id
    ) {
      issues.push({
        code: 'MISSING_SOURCE',
        rowId: row.id,
        message:
          `Row ${row.id} references source ${row.sourceId}, but this file declares ${file.source.id}.`,
      });
    }

    if (
      row.announcedYear !== undefined &&
      (
        !Number.isInteger(
          row.announcedYear,
        ) ||
        row.announcedYear < 1900 ||
        row.announcedYear > 2200
      )
    ) {
      issues.push({
        code: 'INVALID_YEAR',
        rowId: row.id,
        message:
          `Invalid announced year for ${row.id}: ${row.announcedYear}`,
      });
    }

    if (
      row.announcedYear !== undefined &&
      (
        row.announcedYear <
          targetYearMin ||
        row.announcedYear >
          targetYearMax
      )
    ) {
      issues.push({
        code:
          'OUTSIDE_TARGET_WINDOW',
        rowId: row.id,
        message:
          `Device ${row.id} is outside target window ${targetYearMin}-${targetYearMax}.`,
      });
    }
  }

  return issues;
}

export function buildBulkDeviceIdentityCorpus(
  file: BulkDeviceIdentityFile,
): DeviceCorpus {
  const source: CorpusSource = {
    id: file.source.id,
    publisher:
      file.source.publisher,
    url: file.source.url,
    sourceRole: 'catalog',
    ...(file.source.protocol
      ? {
          protocol:
            file.source.protocol,
        }
      : {}),
    ...(file.source.accessedDate
      ? {
          accessedDate:
            file.source.accessedDate,
        }
      : {}),
  };

  const devices:
    DeviceCorpusRecord[] =
    file.devices.map((row) => ({
      variant: {
        id: row.id,
        identity: {
          manufacturer:
            row.manufacturer,
          family: row.model,
          modelName: row.model,
          ...(row.region
            ? {
                region: row.region,
              }
            : {}),
        },
        ...(row.notes
          ? { notes: row.notes }
          : {}),
      },
      ...(row.releaseDate
        ? {
            releaseDate:
              row.releaseDate,
          }
        : {}),
      sourceIds: [
        row.sourceId,
      ],
    }));

  return {
    version: file.version,
    sources: [source],
    devices,
    measurements: [],
  };
}
