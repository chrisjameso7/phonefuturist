import { describe, expect, it } from 'vitest';
import {
  evaluateSocAtBoardPower,
  getSocEfficiencyCurve,
  listSocEfficiencyCoverage,
} from '../src/lib/simulation/modules/soc-efficiency-registry';

describe('SoC efficiency registry', () => {
  it('has per-chip CPU and GPU measured coverage', () => {
    expect(listSocEfficiencyCoverage('geekbench6').length).toBeGreaterThan(10);
    expect(listSocEfficiencyCoverage('steelNomadLight').length).toBeGreaterThan(10);
    expect(getSocEfficiencyCurve('Snapdragon 8 Elite Gen 5', 'geekbench6')).toBeDefined();
    expect(getSocEfficiencyCurve('Exynos 2600', 'geekbench6')).toBeDefined();
  });

  it('keeps distinct generations separate rather than falling back to vendor averages', () => {
    const older = getSocEfficiencyCurve('Snapdragon 8 Elite', 'geekbench6');
    const newer = getSocEfficiencyCurve('Snapdragon 8 Elite Gen 5', 'geekbench6');
    expect(older).toBeDefined();
    expect(newer).toBeDefined();
    expect(older?.points).not.toEqual(newer?.points);
    expect(getSocEfficiencyCurve('Exynos 2700', 'geekbench6')).toBeUndefined();
    expect(evaluateSocAtBoardPower('Exynos 2700', 'geekbench6', 5).status).toBe('no-measurement');
  });

  it('interpolates only within observed board power, never extrapolates', () => {
    const curve = getSocEfficiencyCurve('Exynos 2600', 'geekbench6')!;
    const first = curve.points[0];
    const last = curve.points[curve.points.length - 1];
    expect(evaluateSocAtBoardPower(curve.soc, curve.protocol, first.boardPowerW).status).toBe('resolved');
    expect(evaluateSocAtBoardPower(curve.soc, curve.protocol, last.boardPowerW + 1).status).toBe('out-of-range');
    const center = (first.boardPowerW + curve.points[1].boardPowerW) / 2;
    const result = evaluateSocAtBoardPower(curve.soc, curve.protocol, center);
    expect(result.status).toBe('resolved');
    expect(result.benchmarkScore).toBeGreaterThan(0);
    expect(result.scorePerWatt).toBeCloseTo(result.benchmarkScore! / center);
  });

  it('does not mix CPU protocol generations or GPU scoring scales', () => {
    const chip = 'Snapdragon 8 Elite Gen 5';
    expect(getSocEfficiencyCurve(chip, 'geekbench6')?.protocol).toBe('geekbench6');
    expect(getSocEfficiencyCurve(chip, 'geekbench7')?.protocol).toBe('geekbench7');
    expect(getSocEfficiencyCurve(chip, 'steelNomadLight')?.domain).toBe('gpu');
  });
});
