import type {
  DeviceCorpus,
  CorpusSourceRole,
} from './device-corpus';
import {
  linkDeviceIdentities,
} from './device-identity-linker';

export const CORPUS_COVERAGE_REPORT_VERSION =
  'corpus-coverage-report-0.1.0';

export interface CorpusCoverageReport {
  version: string;
  catalogDeviceCount: number;
  totalDeviceRecordCount: number;
  totalMeasurementCount: number;
  publisherCount: number;
  sourceRoleCounts: Record<string, number>;
  brandCount: number;
  catalogBrands: Array<{
    manufacturer: string;
    devices: number;
  }>;
  measurementBackedCanonicalDevices: number;
  multiSourceCanonicalDevices: number;
  batteryRuntimeCanonicalDevices: number;
  chargingCanonicalDevices: number;
  performanceCanonicalDevices: number;
  cameraCanonicalDevices: number;
  displayCanonicalDevices: number;
  thermalCanonicalDevices: number;
  unresolvedLabRecords: number;
  note: string;
}

function manufacturerKey(
  value: string,
) {
  return value
    .trim()
    .toLowerCase();
}

function workloadGroup(
  metric: string,
  workload: string,
) {
  const text =
    (metric + ' ' + workload)
      .toLowerCase();

  if (
    workload === 'charging' ||
    text.includes('charge')
  ) return 'charging';

  if (
    workload === 'camera'
  ) return 'camera';

  if (
    workload === 'display'
  ) return 'display';

  if (
    workload === 'thermal'
  ) return 'thermal';

  if (
    workload === 'benchmark'
  ) return 'performance';

  if (
    workload ===
      'web_browsing' ||
    workload ===
      'video_playback' ||
    workload ===
      'gaming'
  ) return 'battery-runtime';

  return 'other';
}

export function buildCorpusCoverageReport(
  corpus: DeviceCorpus,
): CorpusCoverageReport {
  const sourceById =
    new Map(
      corpus.sources.map(
        (source) => [
          source.id,
          source,
        ],
      ),
    );

  const catalogSourceIds =
    new Set(
      corpus.sources
        .filter(
          (source) =>
            source.sourceRole ===
            'catalog',
        )
        .map(
          (source) =>
            source.id,
        ),
    );

  const catalogDevices =
    corpus.devices.filter(
      (device) =>
        (device.sourceIds ?? []).some(
          (sourceId) =>
            catalogSourceIds.has(
              sourceId,
            ),
        ),
    );

  const brandCounts =
    new Map<string, {
      display: string;
      count: number;
    }>();

  for (
    const device of catalogDevices
  ) {
    const manufacturer =
      device.variant.identity
        .manufacturer;

    const key =
      manufacturerKey(
        manufacturer,
      );

    const existing =
      brandCounts.get(key);

    brandCounts.set(key, {
      display:
        existing?.display ??
        manufacturer,
      count:
        (existing?.count ?? 0) + 1,
    });
  }

  const links =
    linkDeviceIdentities(corpus);

  const canonicalByDevice =
    new Map<string, string>();

  for (const link of links) {
    for (
      const deviceId of
      link.linkedDeviceIds
    ) {
      canonicalByDevice.set(
        deviceId,
        link.canonicalDeviceId,
      );
    }
  }

  const canonical = (
    deviceId: string,
  ) =>
    canonicalByDevice.get(
      deviceId,
    ) ??
    deviceId;

  const measuredCanonical =
    new Set<string>();
  const batteryRuntime =
    new Set<string>();
  const charging =
    new Set<string>();
  const performance =
    new Set<string>();
  const camera =
    new Set<string>();
  const display =
    new Set<string>();
  const thermal =
    new Set<string>();

  let unresolvedLabRecords = 0;

  for (
    const measurement of
    corpus.measurements
  ) {
    const source =
      sourceById.get(
        measurement.sourceId,
      );

    const sourceRole:
      CorpusSourceRole | undefined =
      source?.sourceRole;

    if (
      sourceRole !==
        'measurement-lab' &&
      sourceRole !==
        'aggregated-benchmark' &&
      sourceRole !==
        'reference'
    ) {
      continue;
    }

    const id =
      canonical(
        measurement.deviceVariantId,
      );

    measuredCanonical.add(id);

    const group =
      workloadGroup(
        measurement.metric,
        measurement.workload,
      );

    switch (group) {
      case 'battery-runtime':
        batteryRuntime.add(id);
        break;
      case 'charging':
        charging.add(id);
        break;
      case 'performance':
        performance.add(id);
        break;
      case 'camera':
        camera.add(id);
        break;
      case 'display':
        display.add(id);
        break;
      case 'thermal':
        thermal.add(id);
        break;
    }

    if (
      !corpus.devices.some(
        (device) =>
          device.variant.id ===
          measurement.deviceVariantId,
      )
    ) {
      unresolvedLabRecords += 1;
    }
  }

  const multiSourceCanonical =
    links.filter(
      (link) => {
        const sourceIds =
          new Set<string>();

        for (
          const deviceId of
          link.linkedDeviceIds
        ) {
          const device =
            corpus.devices.find(
              (candidate) =>
                candidate.variant.id ===
                deviceId,
            );

          for (
            const sourceId of
            device?.sourceIds ?? []
          ) {
            sourceIds.add(
              sourceId,
            );
          }
        }

        return sourceIds.size > 1;
      },
    ).length;

  const sourceRoleCounts:
    Record<string, number> = {};

  for (
    const source of
    corpus.sources
  ) {
    const role =
      source.sourceRole ??
      'unclassified';

    sourceRoleCounts[role] =
      (sourceRoleCounts[role] ??
        0) + 1;
  }

  return {
    version:
      CORPUS_COVERAGE_REPORT_VERSION,
    catalogDeviceCount:
      catalogDevices.length,
    totalDeviceRecordCount:
      corpus.devices.length,
    totalMeasurementCount:
      corpus.measurements.length,
    publisherCount:
      new Set(
        corpus.sources.map(
          (source) =>
            source.publisher,
        ),
      ).size,
    sourceRoleCounts,
    brandCount:
      brandCounts.size,
    catalogBrands:
      [...brandCounts.values()]
        .map(
          (row) => ({
            manufacturer:
              row.display,
            devices:
              row.count,
          }),
        )
        .sort(
          (a, b) =>
            b.devices -
            a.devices,
        ),
    measurementBackedCanonicalDevices:
      measuredCanonical.size,
    multiSourceCanonicalDevices:
      multiSourceCanonical,
    batteryRuntimeCanonicalDevices:
      batteryRuntime.size,
    chargingCanonicalDevices:
      charging.size,
    performanceCanonicalDevices:
      performance.size,
    cameraCanonicalDevices:
      camera.size,
    displayCanonicalDevices:
      display.size,
    thermalCanonicalDevices:
      thermal.size,
    unresolvedLabRecords,
    note:
      'Catalog breadth and laboratory calibration depth are reported separately. Source-specific device records are linked to canonical retail identities where manufacturer/model normalization is sufficiently strong; SoC-only reference records remain separate.',
  };
}
