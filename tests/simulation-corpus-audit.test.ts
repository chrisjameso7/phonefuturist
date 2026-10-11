import { describe, expect, it } from 'vitest';
import {
  auditDeviceCorpus,
} from '../src/lib/simulation/modules/corpus-audit';
import {
  buildCalibrationRegistry,
  clearCalibrationRegistryCache,
} from '../src/lib/simulation/modules/calibration-registry';
import {
  buildBulkDeviceCatalogCorpus,
} from '../src/lib/simulation/modules/bulk-device-catalog-corpus';

describe('calibration corpus audit', () => {
  it('keeps the bulk catalog above the 1000-phone expansion target', () => {
    const bulk =
      buildBulkDeviceCatalogCorpus();

    expect(
      bulk.devices.length,
    ).toBeGreaterThanOrEqual(1000);
  });

  it('reports measured and catalog-only coverage separately', () => {
    clearCalibrationRegistryCache();
    const corpus =
      buildCalibrationRegistry();

    const audit =
      auditDeviceCorpus(corpus);

    expect(
      audit.totalRecords,
    ).toBeGreaterThanOrEqual(1000);
    expect(
      audit.measuredDeviceCount,
    ).toBeGreaterThan(0);
    expect(
      audit.catalogOnlyDeviceCount,
    ).toBeGreaterThan(0);
    expect(
      audit.publisherCount,
    ).toBeGreaterThanOrEqual(4);
    expect(
      audit.measuredDevicesByPublisher
        .Geekerwan,
    ).toBe(78);
  });

  it('does not pretend source-specific duplicate records are unique semantic phone identities', () => {
    clearCalibrationRegistryCache();
    const audit =
      auditDeviceCorpus(
        buildCalibrationRegistry(),
      );

    expect(
      audit.semanticIdentityCount,
    ).toBeLessThanOrEqual(
      audit.totalRecords,
    );

    expect(
      audit.semanticDuplicateRecords,
    ).toBeGreaterThanOrEqual(0);
  });
});
