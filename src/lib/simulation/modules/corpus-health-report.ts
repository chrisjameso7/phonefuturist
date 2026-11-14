import type {
  DeviceCorpus,
} from './device-corpus';

export const CORPUS_HEALTH_REPORT_VERSION =
  'corpus-health-report-0.1.0';

export interface CorpusHealthReport {
  version: string;
  corpusVersion: string;
  deviceCount: number;
  measurementCount: number;
  sourceCount: number;
  measuredDeviceCount: number;
  specOnlyDeviceCount: number;
  measuredDevicePercent: number;
  deviceCountsByManufacturer: Array<{
    manufacturer: string;
    count: number;
  }>;
  measurementCountsByPublisher: Array<{
    publisher: string;
    count: number;
  }>;
  measurementCountsByWorkload: Array<{
    workload: string;
    count: number;
  }>;
  notes: string[];
}

export function buildCorpusHealthReport(
  corpus: DeviceCorpus,
): CorpusHealthReport {
  const measuredVariantIds =
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

  const sourceById =
    new Map(
      corpus.sources.map(
        (source) => [
          source.id,
          source,
        ],
      ),
    );

  const manufacturerCounts =
    new Map<string, number>();

  for (const device of corpus.devices) {
    const manufacturer =
      device.variant.identity
        .manufacturer;
    manufacturerCounts.set(
      manufacturer,
      (manufacturerCounts.get(
        manufacturer,
      ) ?? 0) + 1,
    );
  }

  const publisherCounts =
    new Map<string, number>();

  const workloadCounts =
    new Map<string, number>();

  for (
    const measurement of
    corpus.measurements
  ) {
    if (
      measurement.evidenceKind !==
      'measured'
    ) {
      continue;
    }

    const publisher =
      sourceById.get(
        measurement.sourceId,
      )?.publisher ??
      measurement.sourceId;

    publisherCounts.set(
      publisher,
      (publisherCounts.get(
        publisher,
      ) ?? 0) + 1,
    );

    workloadCounts.set(
      measurement.workload,
      (workloadCounts.get(
        measurement.workload,
      ) ?? 0) + 1,
    );
  }

  const measuredDeviceCount =
    measuredVariantIds.size;

  const specOnlyDeviceCount =
    corpus.devices.filter(
      (device) =>
        !measuredVariantIds.has(
          device.variant.id,
        ),
    ).length;

  return {
    version:
      CORPUS_HEALTH_REPORT_VERSION,
    corpusVersion:
      corpus.version,
    deviceCount:
      corpus.devices.length,
    measurementCount:
      corpus.measurements.length,
    sourceCount:
      corpus.sources.length,
    measuredDeviceCount,
    specOnlyDeviceCount,
    measuredDevicePercent:
      corpus.devices.length
        ? measuredDeviceCount /
          corpus.devices.length *
          100
        : 0,
    deviceCountsByManufacturer:
      [...manufacturerCounts.entries()]
        .map(
          ([manufacturer, count]) => ({
            manufacturer,
            count,
          }),
        )
        .sort(
          (a, b) =>
            b.count - a.count,
        ),
    measurementCountsByPublisher:
      [...publisherCounts.entries()]
        .map(
          ([publisher, count]) => ({
            publisher,
            count,
          }),
        )
        .sort(
          (a, b) =>
            b.count - a.count,
        ),
    measurementCountsByWorkload:
      [...workloadCounts.entries()]
        .map(
          ([workload, count]) => ({
            workload,
            count,
          }),
        )
        .sort(
          (a, b) =>
            b.count - a.count,
        ),
    notes: [
      'Spec-only catalog devices are intentionally counted separately from devices with measured evidence.',
      'A larger catalog must not increase measurement confidence unless measurement-bearing references are also added.',
      'Publisher and workload counts include measured rows only.',
    ],
  };
}
