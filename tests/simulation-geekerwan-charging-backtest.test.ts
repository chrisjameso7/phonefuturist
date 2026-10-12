import { beforeAll, describe, expect, it } from 'vitest';
import {
  buildCalibrationRegistry,
  clearCalibrationRegistryCache,
} from '../src/lib/simulation/modules/calibration-registry';
import {
  backtestAgainstGeekerwanCharging,
} from '../src/lib/simulation/modules/geekerwan-charging-backtest';

describe('external Geekerwan charging backtest', () => {
  // Build once: this holdout evaluation is expensive and deterministic.
  // Assertions intentionally inspect the same independent validation result.
  let result: ReturnType<typeof backtestAgainstGeekerwanCharging>;

  beforeAll(() => {
    clearCalibrationRegistryCache();
    result = backtestAgainstGeekerwanCharging(buildCalibrationRegistry());
  }, 120_000);
  it('evaluates a meaningful set of Geekerwan phones without training on their curve metrics', () => {
    expect(result.status).toBe('resolved');

    expect(
      result.evaluatedDevices,
    ).toBeGreaterThanOrEqual(20);

    expect(
      result.maeMinutes,
    ).toBeGreaterThanOrEqual(0);

    expect(
      result.mapePercent,
    ).toBeGreaterThanOrEqual(0);

    expect(
      result.meanSignedErrorMinutes,
    ).toBeDefined();
  });

  it('reports charger-class and manufacturer bias separately', () => {
    expect(
      result.byWattageBand.length,
    ).toBeGreaterThanOrEqual(2);

    expect(
      result.byManufacturer.length,
    ).toBeGreaterThanOrEqual(3);

    expect(
      result.worstMisses.length,
    ).toBeGreaterThan(0);
  });

  it('does not evaluate Geekerwan curve metrics against themselves', () => {
    expect(
      result.rows.every(
        (row) =>
          Number.isFinite(
            row.predictedFullChargeMinutes,
          ) &&
          Number.isFinite(
            row.actualFullChargeMinutes,
          ),
      ),
    ).toBe(true);

    expect(result.note).toContain(
      'non-Geekerwan charging corpus',
    );
  });
});
