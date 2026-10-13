import { beforeAll, describe, expect, it } from 'vitest';
import {
  buildExpandedEvidenceCoverage,
} from '../src/lib/simulation/modules/expanded-evidence-coverage';

describe('expanded evidence coverage', () => {
  let report: ReturnType<typeof buildExpandedEvidenceCoverage>;
  beforeAll(() => { report = buildExpandedEvidenceCoverage(); }, 30_000);
  it('keeps catalog breadth above two thousand records while preserving measurement depth separately', () => {
    expect(
      report.rawExpandedCatalogRecords,
    ).toBeGreaterThanOrEqual(3000);

    expect(
      report.calibrationMeasurements,
    ).toBeGreaterThan(0);

    console.info(
      'EXPANDED_CATALOG_COVERAGE',
      JSON.stringify({
        catalogDeviceCount:
          report.coverage.catalogDeviceCount,
        canonicalCatalogDeviceCount:
          report.coverage.canonicalCatalogDeviceCount,
        totalDeviceRecordCount:
          report.coverage.totalDeviceRecordCount,
        measurementBackedCanonicalDevices:
          report.coverage.measurementBackedCanonicalDevices,
        totalMeasurementCount:
          report.coverage.totalMeasurementCount,
      }),
    );

    expect(
      report.coverage.catalogDeviceCount,
    ).toBeGreaterThanOrEqual(3000);

    expect(
      report.coverage.canonicalCatalogDeviceCount,
    ).toBeGreaterThan(1000);

    expect(
      report.coverage.canonicalCatalogDeviceCount,
    ).toBeLessThanOrEqual(
      report.coverage.catalogDeviceCount,
    );

    expect(
      report.coverage.measurementBackedCanonicalDevices,
    ).toBeGreaterThan(0);

    expect(
      report.coverage.multiPublisherCanonicalDevices,
    ).toBeGreaterThan(0);
  });

  it('reports multiple evidence publishers without converting catalog rows into measurements', () => {
    expect(
      report.coverage.publisherCount,
    ).toBeGreaterThanOrEqual(5);

    expect(report.note).toContain(
      'Catalog-only records remain measurement-free',
    );
  });
});
