import { describe, expect, it } from 'vitest';
import { scoreValidationPairs } from '../src/lib/simulation/modules/validation-accuracy';

describe('independent calibration accuracy scoring', () => {
  it('passes both targets for exact measurements', () => {
    const score = scoreValidationPairs([{observed: 10, predicted: 10}])!;
    expect(score.target80Met).toBe(true);
    expect(score.target90Met).toBe(true);
    expect(score.coverageWithin20Percent).toBe(100);
  });
  it('does not disguise sparse acceptable predictions as high hit-rate coverage', () => {
    const score = scoreValidationPairs([{observed: 10, predicted: 7}, {observed: 10, predicted: 10}])!;
    expect(score.mapePercent).toBeCloseTo(15);
    expect(score.target80Met).toBe(true);
    expect(score.target90Met).toBe(false);
    expect(score.coverageWithin20Percent).toBe(50);
  });
  it('does not count 20% errors as 90% accuracy', () => {
    const score = scoreValidationPairs([{observed: 10, predicted: 12}])!;
    expect(score.target80Met).toBe(true);
    expect(score.target90Met).toBe(false);
    expect(score.within20Percent).toBe(1);
  });
  it('rejects empty and invalid reference measurements', () => {
    expect(scoreValidationPairs([])).toBeUndefined();
    expect(scoreValidationPairs([{observed: 0, predicted: 3}])).toBeUndefined();
    expect(scoreValidationPairs([{observed: Number.NaN, predicted: 3}])).toBeUndefined();
  });
});
