import type {
  DeviceCorpus,
} from './device-corpus';

export const CORPUS_AUDIT_VERSION =
  'corpus-audit-0.1.0';

export interface CorpusAuditResult {
  version: string;
  totalRecords: number;
  semanticIdentityCount: number;
  semanticDuplicateRecords: number;
  measuredDeviceCount: number;
  catalogOnlyDeviceCount: number;
  measurementCount: number;
  sourceCount: number;
  publisherCount: number;
  protocolFamilyCount: number;
  brandCount: number;
  devicesByBrand: Record<
    string,
    number
  >;
  measurementsByPublisher: Record<
    string,
    number
  >;
  measurementsByWorkload: Record<
    string,
    number
  >;
  measuredDevicesByPublisher: Record<
    string,
    number
  >;
}

function normalize(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function increment(
  record: Record<string, number>,
  key: string,
  amount = 1,
) {
  record[key] =
    (record[key] ?? 0) +
    amount;
}

export function auditDeviceCorpus(
  corpus: DeviceCorpus,
): CorpusAuditResult {
  const sourceById =
    new Map(
      corpus.sources.map(
        (source) => [
          source.id,
          source,
        ],
      ),
    );

  const semanticIdentities =
    new Set<string>();

  const measuredDeviceIds =
    new Set(
      corpus.measurements
        .filter(
          (measurement) =>
            measurement.evidenceKind ===
            'measured',
        )
        .map(
          (measurement) =>
            measurement.deviceVariantId,
        ),
    );

  const devicesByBrand:
    Record<string, number> = {};

  for (const device of corpus.devices) {
    const manufacturer =
      device.variant.identity
        .manufacturer;

    increment(
      devicesByBrand,
      manufacturer,
    );

    semanticIdentities.add(
      [
        normalize(manufacturer),
        normalize(
          device.variant.identity
            .modelName,
        ),
        normalize(
          device.variant.identity
            .region ?? '',
        ),
      ].join('|'),
    );
  }

  const measurementsByPublisher:
    Record<string, number> = {};
  const measurementsByWorkload:
    Record<string, number> = {};
  const publisherDeviceSets =
    new Map<string, Set<string>>();

  for (
    const measurement of
    corpus.measurements
  ) {
    const source =
      sourceById.get(
        measurement.sourceId,
      );

    const publisher =
      source?.publisher ??
      measurement.sourceId;

    increment(
      measurementsByPublisher,
      publisher,
    );

    increment(
      measurementsByWorkload,
      measurement.workload,
    );

    if (
      measurement.evidenceKind ===
      'measured'
    ) {
      const set =
        publisherDeviceSets.get(
          publisher,
        ) ??
        new Set<string>();

      set.add(
        measurement.deviceVariantId,
      );

      publisherDeviceSets.set(
        publisher,
        set,
      );
    }
  }

  const measuredDevicesByPublisher:
    Record<string, number> = {};

  for (
    const [
      publisher,
      devices,
    ] of publisherDeviceSets
  ) {
    measuredDevicesByPublisher[
      publisher
    ] = devices.size;
  }

  const protocolFamilies =
    new Set(
      corpus.sources.map(
        (source) =>
          [
            source.protocol ??
              `source:${source.id}`,
            source.protocolVersion ??
              'unversioned',
          ].join('|'),
      ),
    );

  return {
    version:
      CORPUS_AUDIT_VERSION,
    totalRecords:
      corpus.devices.length,
    semanticIdentityCount:
      semanticIdentities.size,
    semanticDuplicateRecords:
      corpus.devices.length -
      semanticIdentities.size,
    measuredDeviceCount:
      measuredDeviceIds.size,
    catalogOnlyDeviceCount:
      corpus.devices.length -
      measuredDeviceIds.size,
    measurementCount:
      corpus.measurements.length,
    sourceCount:
      corpus.sources.length,
    publisherCount:
      new Set(
        corpus.sources.map(
          (source) =>
            source.publisher,
        ),
      ).size,
    protocolFamilyCount:
      protocolFamilies.size,
    brandCount:
      Object.keys(
        devicesByBrand,
      ).length,
    devicesByBrand,
    measurementsByPublisher,
    measurementsByWorkload,
    measuredDevicesByPublisher,
  };
}
