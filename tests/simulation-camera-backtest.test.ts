import { describe, expect, it } from 'vitest';
import { buildCalibrationRegistry } from '../src/lib/simulation/modules/calibration-registry';
import { backtestCameraSharpnessTiming } from '../src/lib/simulation/modules/camera-backtest';

describe('camera sharpness timing backtest', () => {
  it('evaluates unseen devices without self-matching', () => {
    const result = backtestCameraSharpnessTiming(
      buildCalibrationRegistry(),
    );

    expect(result.evaluatedDevices).toBeGreaterThanOrEqual(4);
    expect(result.maeScore).toBeDefined();
    expect(result.p90AbsoluteError).toBeDefined();
    expect(result.rows.every(
      (row) => row.referenceCount > 0,
    )).toBe(true);
  });
});
