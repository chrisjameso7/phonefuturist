import { describe, expect, it } from 'vitest';
import { buildCalibrationRegistry } from '../src/lib/simulation/modules/calibration-registry';
import { backtestGpuStability } from '../src/lib/simulation/modules/performance-backtest';

describe('GPU stability backtest', () => {
  it('evaluates unseen sustained-performance devices without self-matching', () => {
    const result = backtestGpuStability(
      buildCalibrationRegistry(),
    );

    expect(result.evaluatedDevices).toBeGreaterThanOrEqual(3);
    expect(result.maePoints).toBeDefined();
    expect(result.rows.every(
      (row) => row.referenceCount > 0,
    )).toBe(true);
  });
});
