import { describe, expect, it } from 'vitest';
import { buildChargingModeCorpus } from '../src/lib/simulation/modules/charging-mode-corpus';
import { backtestChargingCorpus } from '../src/lib/simulation/modules/charging-backtest';

describe('charging backtest scorecard', () => {
  it('reports coverage and grouped error breakdowns', () => {
    const result = backtestChargingCorpus(
      buildChargingModeCorpus(),
    );

    expect(result.coveragePercent).toBeGreaterThan(0);
    expect(result.coveragePercent).toBeLessThanOrEqual(100);

    expect(result.byManufacturer.length).toBeGreaterThan(0);
    expect(result.byChargingStandard.length).toBeGreaterThan(0);
    expect(result.byWattageBand.length).toBeGreaterThan(0);

    for (const group of [
      ...result.byManufacturer,
      ...result.byChargingStandard,
      ...result.byWattageBand,
    ]) {
      expect(group.count).toBeGreaterThan(0);
      expect(Number.isFinite(group.maeMinutes)).toBe(true);
      expect(Number.isFinite(group.mapePercent)).toBe(true);
    }

    expect(result.worstMisses.length).toBeLessThanOrEqual(5);
    for (let i = 1; i < result.worstMisses.length; i += 1) {
      expect(
        result.worstMisses[i - 1].absolutePercentageError,
      ).toBeGreaterThanOrEqual(
        result.worstMisses[i].absolutePercentageError,
      );
    }
  });
});
