import type {
  CorpusEvidenceKind,
  DeviceCorpus,
} from './device-corpus';

export const EVIDENCE_INVENTORY_VERSION =
  'evidence-inventory-0.1.0';

export interface EvidenceInventoryRow {
  publisher: string;
  sourceCount: number;
  deviceRecordCount: number;
  measurementCount: number;
  measuredCount: number;
  inferredCount: number;
  officialCount: number;
  reportedCount: number;
  protocols: string[];
  workloads: string[];
  metrics: string[];
}

export interface EvidenceInventoryResult {
  version: string;
  totalSources: number;
  totalDeviceRecords: number;
  totalMeasurements: number;
  publishers: EvidenceInventoryRow[];
  evidenceKindCounts: Record<
    CorpusEvidenceKind,
    number
  >;
  note: string;
}

function normalize(
  value?: string,
) {
  return value
    ?.trim()
    .toLowerCase()
    .replace(/\s+/g, ' ') ??
    '';
}

export function buildEvidenceInventory(
  corpus: DeviceCorpus,
): EvidenceInventoryResult {
  const sourceById =
    new Map(
      corpus.sources.map(
        (source) => [
          source.id,
          source,
        ],
      ),
    );

  const publisherSources =
    new Map<
      string,
      Set<string>
    >();

  const publisherDevices =
    new Map<
      string,
      Set<string>
    >();

  const publisherMeasurements =
    new Map<
      string,
      typeof corpus.measurements
    >();

  const publisherProtocols =
    new Map<
      string,
      Set<string>
    >();

  for (const source of corpus.sources) {
    const publisher =
      source.publisher.trim() ||
      'Unknown';

    const sources =
      publisherSources.get(
        publisher,
      ) ?? new Set<string>();

    sources.add(source.id);
    publisherSources.set(
      publisher,
      sources,
    );

    const protocols =
      publisherProtocols.get(
        publisher,
      ) ?? new Set<string>();

    const protocol = [
      source.protocol,
      source.protocolVersion,
    ]
      .filter(Boolean)
      .join(' · ');

    if (protocol) {
      protocols.add(protocol);
    }

    publisherProtocols.set(
      publisher,
      protocols,
    );
  }

  for (const device of corpus.devices) {
    for (
      const sourceId of
      device.sourceIds ?? []
    ) {
      const source =
        sourceById.get(
          sourceId,
        );

      if (!source) continue;

      const publisher =
        source.publisher.trim() ||
        'Unknown';

      const devices =
        publisherDevices.get(
          publisher,
        ) ?? new Set<string>();

      devices.add(
        device.variant.id,
      );

      publisherDevices.set(
        publisher,
        devices,
      );
    }
  }

  for (
    const measurement of
    corpus.measurements
  ) {
    const source =
      sourceById.get(
        measurement.sourceId,
      );

    if (!source) continue;

    const publisher =
      source.publisher.trim() ||
      'Unknown';

    const rows =
      publisherMeasurements.get(
        publisher,
      ) ?? [];

    rows.push(measurement);

    publisherMeasurements.set(
      publisher,
      rows,
    );
  }

  const publishers =
    [...publisherSources.keys()]
      .map(
        (
          publisher,
        ): EvidenceInventoryRow => {
          const measurements =
            publisherMeasurements.get(
              publisher,
            ) ?? [];

          const countKind = (
            kind: CorpusEvidenceKind,
          ) =>
            measurements.filter(
              (measurement) =>
                measurement.evidenceKind ===
                kind,
            ).length;

          return {
            publisher,
            sourceCount:
              publisherSources.get(
                publisher,
              )?.size ?? 0,
            deviceRecordCount:
              publisherDevices.get(
                publisher,
              )?.size ?? 0,
            measurementCount:
              measurements.length,
            measuredCount:
              countKind(
                'measured',
              ),
            inferredCount:
              countKind(
                'inferred',
              ),
            officialCount:
              countKind(
                'official',
              ),
            reportedCount:
              countKind(
                'reported',
              ),
            protocols: [
              ...(
                publisherProtocols.get(
                  publisher,
                ) ?? new Set()
              ),
            ].sort(),
            workloads: [
              ...new Set(
                measurements.map(
                  (measurement) =>
                    measurement.workload,
                ),
              ),
            ].sort(),
            metrics: [
              ...new Set(
                measurements.map(
                  (measurement) =>
                    normalize(
                      measurement.metric,
                    ),
                ),
              ),
            ]
              .filter(Boolean)
              .sort(),
          };
        },
      )
      .sort(
        (a, b) =>
          b.measurementCount -
            a.measurementCount ||
          b.deviceRecordCount -
            a.deviceRecordCount ||
          a.publisher.localeCompare(
            b.publisher,
          ),
      );

  const evidenceKindCounts: Record<
    CorpusEvidenceKind,
    number
  > = {
    measured: 0,
    inferred: 0,
    official: 0,
    reported: 0,
  };

  for (
    const measurement of
    corpus.measurements
  ) {
    evidenceKindCounts[
      measurement.evidenceKind
    ] += 1;
  }

  return {
    version:
      EVIDENCE_INVENTORY_VERSION,
    totalSources:
      corpus.sources.length,
    totalDeviceRecords:
      corpus.devices.length,
    totalMeasurements:
      corpus.measurements.length,
    publishers,
    evidenceKindCounts,
    note:
      'Inventory reports source breadth and evidence depth separately. Catalog-only device records can increase device coverage without increasing measurement count, while fitted/inferred curve evidence remains distinguishable from raw measured rows.',
  };
}
