import { describe, expect, it } from 'vitest';
import { buildCalibrationRegistry } from '../src/lib/simulation/modules/calibration-registry';
import { backtestPeakPerformance } from '../src/lib/simulation/modules/peak-performance-backtest';

describe('peak performance backtest', () => {
  it('evaluates held-out peak benchmark rows without self-matching', () => {
    const result =
      backtestPeakPerformance(
        buildCalibrationRegistry(),
      );

    expect(
      result.evaluatedMeasurements,
    ).toBeGreaterThanOrEqual(8);

    expect(result.maePoints).toBeDefined();
    expect(
      result.mapePercent,
    ).toBeDefined();
    expect(
      result.medianAbsolutePercentError,
    ).toBeDefined();

    expect(
      result.rows.every(
        (row) =>
          !row.neighborIds.includes(
            row.deviceVariantId,
          ),
      ),
    ).toBe(true);

    expect(
      result.rows.every(
        (row) =>
          row.referenceCount > 0,
      ),
    ).toBe(true);
  });
});
