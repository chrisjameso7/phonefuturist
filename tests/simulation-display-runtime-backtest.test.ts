import { describe, expect, it } from 'vitest';
import { buildCalibrationRegistry } from '../src/lib/simulation/modules/calibration-registry';
import { backtestDisplayAwareRuntime } from '../src/lib/simulation/modules/display-runtime-backtest';

describe('display-aware runtime backtest', () => {
  it('evaluates enriched current-generation devices without self-matching', () => {
    const result = backtestDisplayAwareRuntime(
      buildCalibrationRegistry(),
    );

    expect(result.displayEnrichedDevices).toBeGreaterThanOrEqual(7);
    expect(result.evaluatedRows).toBeGreaterThanOrEqual(18);

    expect(
      result.overall.blindMapePercent,
    ).toBeDefined();
    expect(
      result.overall.awareMapePercent,
    ).toBeDefined();

    expect(
      result.byWorkload.web_browsing.rows,
    ).toBeGreaterThanOrEqual(6);
    expect(
      result.byWorkload.video_playback.rows,
    ).toBeGreaterThanOrEqual(6);
    expect(
      result.byWorkload.gaming.rows,
    ).toBeGreaterThanOrEqual(6);
  });
});
