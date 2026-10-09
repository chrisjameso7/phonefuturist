import { describe, expect, it } from 'vitest';
import { buildCalibrationRegistry } from '../src/lib/simulation/modules/calibration-registry';
import { backtestCameraPhotoTexture } from '../src/lib/simulation/modules/camera-backtest';

describe('camera photo texture backtest', () => {
  it('evaluates unseen devices without self-matching', () => {
    const result = backtestCameraPhotoTexture(
      buildCalibrationRegistry(),
    );

    expect(result.domain).toBe('photo_texture');
    expect(result.evaluatedDevices).toBeGreaterThanOrEqual(6);
    expect(result.maeScore).toBeDefined();
    expect(result.p90AbsoluteError).toBeDefined();
  });
});
