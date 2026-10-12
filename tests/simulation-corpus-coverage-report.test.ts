import { describe, expect, it } from 'vitest';
import {
  buildCalibrationRegistry,
  clearCalibrationRegistryCache,
} from '../src/lib/simulation/modules/calibration-registry';
import {
  buildCorpusCoverageReport,
} from '../src/lib/simulation/modules/corpus-coverage-report';

describe('corpus coverage report', () => {
  it('separates catalog breadth from measurement depth', () => {
    clearCalibrationRegistryCache();

    const report =
      buildCorpusCoverageReport(
        buildCalibrationRegistry(),
      );

    expect(
      report.catalogDeviceCount,
    ).toBeGreaterThanOrEqual(1000);

    expect(
      report.brandCount,
    ).toBeGreaterThanOrEqual(20);

    expect(
      report.totalMeasurementCount,
    ).toBeGreaterThan(0);

    expect(
      report.measurementBackedCanonicalDevices,
    ).toBeGreaterThan(0);

    expect(
      report.chargingCanonicalDevices,
    ).toBeGreaterThan(0);

    expect(
      report.batteryRuntimeCanonicalDevices,
    ).toBeGreaterThan(0);

    expect(
      report.performanceCanonicalDevices,
    ).toBeGreaterThan(0);
  });

  it('reports TechAPI catalog breadth without calling it lab evidence', () => {
    clearCalibrationRegistryCache();

    const report =
      buildCorpusCoverageReport(
        buildCalibrationRegistry(),
      );

    expect(
      report.sourceRoleCounts.catalog,
    ).toBeGreaterThan(0);

    expect(
      report.sourceRoleCounts[
        'measurement-lab'
      ],
    ).toBeGreaterThan(0);

    expect(
      report.sourceRoleCounts[
        'aggregated-benchmark'
      ],
    ).toBeGreaterThan(0);
  });
});
