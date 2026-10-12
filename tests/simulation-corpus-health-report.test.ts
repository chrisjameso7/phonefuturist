import { describe, expect, it } from 'vitest';
import {
  buildCorpusHealthReport,
} from '../src/lib/simulation/modules/corpus-health-report';
import {
  buildCalibrationRegistry,
  clearCalibrationRegistryCache,
} from '../src/lib/simulation/modules/calibration-registry';

describe('corpus health report', () => {
  it('separates catalog breadth from measurement depth', () => {
    clearCalibrationRegistryCache();
    const corpus =
      buildCalibrationRegistry();
    const report =
      buildCorpusHealthReport(
        corpus,
      );

    expect(
      report.deviceCount,
    ).toBeGreaterThanOrEqual(1000);

    expect(
      report.specOnlyDeviceCount,
    ).toBeGreaterThan(0);

    expect(
      report.measuredDeviceCount,
    ).toBeGreaterThan(0);

    expect(
      report.measurementCountsByPublisher
        .some(
          (row) =>
            row.publisher ===
            'PhoneArena',
        ),
    ).toBe(true);

    expect(
      report.measurementCountsByPublisher
        .some(
          (row) =>
            row.publisher ===
            'GSMArena',
        ),
    ).toBe(true);
  });

  it('does not count TechAPI catalog rows as measured evidence', () => {
    clearCalibrationRegistryCache();
    const corpus =
      buildCalibrationRegistry();
    const report =
      buildCorpusHealthReport(
        corpus,
      );

    expect(
      report.measurementCountsByPublisher
        .some(
          (row) =>
            row.publisher ===
            'TechAPI',
        ),
    ).toBe(false);
  });
});
