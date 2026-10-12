import { describe, expect, it } from 'vitest';
import {
  buildExpandedEvidenceCoverage,
} from '../src/lib/simulation/modules/expanded-evidence-coverage';

describe('expanded evidence coverage', () => {
  it('keeps catalog breadth above two thousand records while preserving measurement depth separately', () => {
    const report =
      buildExpandedEvidenceCoverage();

    expect(
      report.rawExpandedCatalogRecords,
    ).toBeGreaterThanOrEqual(2000);

    expect(
      report.calibrationMeasurements,
    ).toBeGreaterThan(0);

    expect(
      report.coverage.catalogDeviceCount,
    ).toBeGreaterThanOrEqual(2000);

    expect(
      report.coverage.measurementBackedCanonicalDevices,
    ).toBeGreaterThan(0);

    expect(
      report.coverage.multiPublisherCanonicalDevices,
    ).toBeGreaterThan(0);
  });

  it('reports multiple evidence publishers without converting catalog rows into measurements', () => {
    const report =
      buildExpandedEvidenceCoverage();

    expect(
      report.coverage.publisherCount,
    ).toBeGreaterThanOrEqual(5);

    expect(report.note).toContain(
      'Catalog-only records remain measurement-free',
    );
  });
});
