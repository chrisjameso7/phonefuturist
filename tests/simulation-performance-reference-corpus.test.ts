import { describe, expect, it } from 'vitest';
import { buildCalibrationRegistry } from '../src/lib/simulation/modules/calibration-registry';

describe('sustained GPU performance corpus', () => {
  it('exposes one protocol-compatible flagship stability family', () => {
    const registry = buildCalibrationRegistry();

    const rows = registry.measurements.filter(
      (measurement) =>
        measurement.workload === 'benchmark' &&
        measurement.metric === 'gpu_stability_percent',
    );

    expect(rows).toHaveLength(9);
    expect(
      new Set(
        rows.map(
          (measurement) => measurement.deviceVariantId,
        ),
      ).size,
    ).toBe(9);
    expect(
      rows.every(
        (measurement) =>
          measurement.unit === 'percent',
      ),
    ).toBe(true);
  });
});
