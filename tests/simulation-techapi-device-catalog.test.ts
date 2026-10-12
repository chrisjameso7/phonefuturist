import { describe, expect, it } from 'vitest';
import {
  buildTechApiDeviceCatalog,
  techApiCatalogCount,
} from '../src/lib/simulation/modules/techapi-device-catalog';
import {
  buildCalibrationRegistry,
  clearCalibrationRegistryCache,
} from '../src/lib/simulation/modules/calibration-registry';
import {
  validateDeviceCorpus,
} from '../src/lib/simulation/modules/device-corpus';
import {
  simulateChargingFromLiveCorpus,
} from '../src/lib/simulation/live-charging';

describe('TechAPI 1000-phone catalog', () => {
  it('loads exactly 1000 catalog devices without creating lab measurements', () => {
    const corpus =
      buildTechApiDeviceCatalog();
    const count =
      techApiCatalogCount();

    expect(count.selected).toBe(1000);
    expect(count.devices).toBe(1000);
    expect(corpus.devices).toHaveLength(
      1000,
    );
    expect(corpus.measurements).toHaveLength(
      0,
    );
  });

  it('keeps the generated snapshot recent and limits variant backfill', () => {
    const count =
      techApiCatalogCount();

    expect(
      count.years,
    ).toEqual([2025, 2026]);
    expect(
      count.uniqueBaseModels,
    ).toBeGreaterThanOrEqual(800);
    expect(
      count.variantBackfill,
    ).toBeLessThanOrEqual(200);
    expect(
      count.maxEntriesPerBaseModel,
    ).toBe(2);

    expect(
      count.verifiedOrUnspecified,
    ).toBeGreaterThanOrEqual(800);
    expect(
      count.sourceBackedUnverified,
    ).toBeLessThanOrEqual(200);

    const corpus =
      buildTechApiDeviceCatalog();

    expect(
      corpus.devices.every(
        (device) => {
          const year =
            Number(
              device.releaseDate?.slice(
                0,
                4,
              ),
            );

          return (
            year === 2025 ||
            year === 2026
          );
        },
      ),
    ).toBe(true);
  });

  it('keeps generated variant ids unique and source-backed', () => {
    const corpus =
      buildTechApiDeviceCatalog();

    expect(
      new Set(
        corpus.devices.map(
          (device) =>
            device.variant.id,
        ),
      ).size,
    ).toBe(1000);

    expect(
      corpus.devices.every(
        (device) =>
          device.sourceIds?.includes(
            'techapi-open-data-cc-by-sa',
          ),
      ),
    ).toBe(true);

    expect(
      validateDeviceCorpus(corpus),
    ).toEqual([]);
  });

  it('does not let 1000 spec-only catalog devices crowd measured charging peers out of the estimator', () => {
    clearCalibrationRegistryCache();

    const result =
      simulateChargingFromLiveCorpus({
        batteryMah: 5700,
        wiredChargingWatts: 60,
        manufacturer: 'Samsung',
        limit: 5,
      });

    expect(result.status).toBe(
      'resolved',
    );
    expect(
      result.estimate?.neighborIds,
    ).toContain(
      'legacy-charging-samsung-galaxy-s26-ultra',
    );
  });

  it('marks every imported phone as catalog evidence in notes', () => {
    const corpus =
      buildTechApiDeviceCatalog();

    expect(
      corpus.devices.every(
        (device) =>
          device.variant.notes?.some(
            (note) =>
              note.includes(
                'Catalog evidence only',
              ),
          ),
      ),
    ).toBe(true);
  });

  it('adds at least 1000 devices to the full registry without adding TechAPI measurements', () => {
    clearCalibrationRegistryCache();

    const catalog =
      buildTechApiDeviceCatalog();
    const registry =
      buildCalibrationRegistry();

    expect(
      registry.devices.length,
    ).toBeGreaterThanOrEqual(
      catalog.devices.length,
    );

    expect(
      registry.measurements.some(
        (measurement) =>
          measurement.sourceId ===
          'techapi-open-data-cc-by-sa',
      ),
    ).toBe(false);
  });
});
