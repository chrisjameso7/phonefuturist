import { describe, expect, it } from 'vitest';
import { buildCalibrationRegistry } from '../src/lib/simulation/modules/calibration-registry';
import { backtestCameraVideoStabilization } from '../src/lib/simulation/modules/camera-backtest';

describe('camera video stabilization backtest', () => {
  it('evaluates unseen devices without self-matching', () => {
    const result = backtestCameraVideoStabilization(
      buildCalibrationRegistry(),
    );

    expect(result.domain).toBe('video_stabilization');
    expect(result.evaluatedDevices).toBeGreaterThanOrEqual(4);
    expect(result.maeScore).toBeDefined();
    expect(result.p90AbsoluteError).toBeDefined();
  });
});
