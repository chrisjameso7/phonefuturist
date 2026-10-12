import { describe, expect, it } from 'vitest';
import { buildChargingModeCorpus } from '../src/lib/simulation/modules/charging-mode-corpus';
import { backtestChargingCorpus } from '../src/lib/simulation/modules/charging-backtest';

describe('charging corpus backtest', () => {
  it('holds out measured charger modes and reports finite error metrics', () => {
    const corpus = buildChargingModeCorpus();
    const result = backtestChargingCorpus(corpus);

    expect(result.evaluatedModes).toBeGreaterThanOrEqual(2);
    expect(result.maeMinutes).toBeDefined();
    expect(result.mapePercent).toBeDefined();
    expect(Number.isFinite(result.maeMinutes!)).toBe(true);
    expect(Number.isFinite(result.mapePercent!)).toBe(true);
    expect(result.maeMinutes!).toBeGreaterThanOrEqual(0);
    expect(result.mapePercent!).toBeGreaterThanOrEqual(0);
  });
});
