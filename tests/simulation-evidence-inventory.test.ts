import { beforeAll, describe, expect, it } from 'vitest';
import {
  buildCalibrationRegistry,
  clearCalibrationRegistryCache,
} from '../src/lib/simulation/modules/calibration-registry';
import {
  buildEvidenceInventory,
} from '../src/lib/simulation/modules/evidence-inventory';

describe('calibration evidence inventory', () => {
  let inventory: ReturnType<
    typeof buildEvidenceInventory
  >;

  beforeAll(() => {
    clearCalibrationRegistryCache();
    inventory =
      buildEvidenceInventory(
        buildCalibrationRegistry(),
      );
  }, 120_000);

  it('reports source breadth separately from measurement depth', () => {
    expect(
      inventory.totalSources,
    ).toBeGreaterThan(10);

    expect(
      inventory.totalDeviceRecords,
    ).toBeGreaterThan(1000);

    expect(
      inventory.totalMeasurements,
    ).toBeGreaterThan(8000);

    expect(
      inventory.evidenceKindCounts.measured,
    ).toBeGreaterThan(0);

    expect(
      inventory.evidenceKindCounts.inferred,
    ).toBeGreaterThan(0);
  });

  it('shows Geekerwan / SoCPK as a deep performance evidence source without relabeling fitted points as measured', () => {
    const geekerwan =
      inventory.publishers.find(
        (row) =>
          row.publisher ===
          'Geekerwan / SoCPK',
      );

    expect(geekerwan).toBeDefined();

    expect(
      geekerwan?.measurementCount,
    ).toBeGreaterThanOrEqual(7737);

    expect(
      geekerwan?.inferredCount,
    ).toBeGreaterThan(0);

    expect(
      geekerwan?.measuredCount,
    ).toBeGreaterThan(0);

    expect(
      geekerwan?.metrics,
    ).toEqual(
      expect.arrayContaining([
        'geekerwan_gb6_multi_curve_score',
        'geekerwan_gb7_multi_curve_score',
        'geekerwan_steel_nomad_light_curve_score',
      ]),
    );
  });

  it('retains independent PhoneArena measurement coverage', () => {
    const phoneArena =
      inventory.publishers.find(
        (row) =>
          row.publisher ===
          'PhoneArena',
      );

    expect(phoneArena).toBeDefined();

    expect(
      phoneArena?.measurementCount,
    ).toBeGreaterThan(100);

    expect(
      phoneArena?.workloads,
    ).toEqual(
      expect.arrayContaining([
        'web_browsing',
        'video_playback',
        'gaming',
        'charging',
      ]),
    );
  });

  it('prints the leading evidence publishers for calibration audits', () => {
    console.info(
      'CALIBRATION_EVIDENCE_INVENTORY',
      JSON.stringify({
        totalSources:
          inventory.totalSources,
        totalDeviceRecords:
          inventory.totalDeviceRecords,
        totalMeasurements:
          inventory.totalMeasurements,
        evidenceKindCounts:
          inventory.evidenceKindCounts,
        topPublishers:
          inventory.publishers
            .slice(0, 12)
            .map((row) => ({
              publisher:
                row.publisher,
              sources:
                row.sourceCount,
              devices:
                row.deviceRecordCount,
              measurements:
                row.measurementCount,
              measured:
                row.measuredCount,
              inferred:
                row.inferredCount,
            })),
      }),
    );
  });
});
