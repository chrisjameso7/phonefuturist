import { describe, expect, it } from 'vitest';
import {
  compareSocsAtPerformance,
  overlappingMeasuredPerformance,
} from '../src/lib/simulation/modules/soc-matched-performance';

describe('matched-performance SoC curves', () => {
  const first = 'Snapdragon 8 Elite Gen 5';
  const second = 'Snapdragon 8 Elite';
  it('resolves actual same-protocol operating points at equal performance', () => {
    const overlap = overlappingMeasuredPerformance(first, second, 'geekbench6');
    expect(overlap).toBeDefined();
    const score = (overlap!.min + overlap!.max) / 2;
    const result = compareSocsAtPerformance(first, second, 'geekbench6', score);
    expect(result.status).toBe('resolved');
    expect(result.firstBoardPowerW).toBeGreaterThan(0);
    expect(result.secondBoardPowerW).toBeGreaterThan(0);
    expect(result.secondVsFirstPowerPercent).toBeCloseTo(
      100 * (result.secondBoardPowerW! / result.firstBoardPowerW! - 1),
    );
  });
  it('does not borrow Exynos 2600 curves for Exynos 2700', () => {
    expect(compareSocsAtPerformance('Exynos 2700', first, 'geekbench6', 4000).status).toBe('unresolved');
  });
  it('does not extrapolate beyond measured scores', () => {
    expect(compareSocsAtPerformance(first, second, 'geekbench6', 1e9).status).toBe('unresolved');
  });
  it('rejects invalid benchmark targets', () => {
    expect(compareSocsAtPerformance(first, second, 'geekbench6', 0).status).toBe('unresolved');
  });
});
