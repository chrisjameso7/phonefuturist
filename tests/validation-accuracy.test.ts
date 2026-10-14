import { describe, expect, it } from 'vitest';
import { scoreValidationPairs, scoreValidationCohorts } from '../src/lib/simulation/modules/validation-accuracy';

describe('independent calibration accuracy scoring', () => {
  it('passes both targets for exact measurements', () => {
    const score = scoreValidationPairs([{observed: 10, predicted: 10}])!;
    expect(score.target80Met).toBe(true);
    expect(score.target90Met).toBe(true);
    expect(score.coverageWithin20Percent).toBe(100);
    expect(score.meets80QualityGate).toBe(true);
  });
  it('does not disguise sparse acceptable predictions as high hit-rate coverage', () => {
    const score = scoreValidationPairs([{observed: 10, predicted: 7}, {observed: 10, predicted: 10}])!;
    expect(score.mapePercent).toBeCloseTo(15);
    expect(score.target80Met).toBe(true);
    expect(score.target90Met).toBe(false);
    expect(score.coverageWithin20Percent).toBe(50);
    expect(score.meets80QualityGate).toBe(false);
  });
  it('does not count 20% errors as 90% accuracy', () => {
    const score = scoreValidationPairs([{observed: 10, predicted: 12}])!;
    expect(score.target80Met).toBe(true);
    expect(score.target90Met).toBe(false);
    expect(score.within20Percent).toBe(1);
  });
  it('ranks worst-performing cohorts and refuses to certify tiny samples', () => {
    const rows = [
      { group: 'A', observed: 10, predicted: 13 },
      { group: 'A', observed: 10, predicted: 12 },
      { group: 'B', observed: 10, predicted: 10 },
      { group: 'B', observed: 10, predicted: 11 },
      { group: 'B', observed: 10, predicted: 9 },
      { group: 'B', observed: 10, predicted: 10 },
      { group: 'B', observed: 10, predicted: 10 },
    ];
    const scores = scoreValidationCohorts(rows, row => row.group, row => row);
    expect(scores.map(row => row.key)).toEqual(['A', 'B']);
    expect(scores[0].sufficientSample).toBe(false);
    expect(scores[0].p90AbsoluteErrorPercent).toBeCloseTo(30);
    expect(scores[1].sufficientSample).toBe(true);
    expect(scores[1].meanSignedErrorPercent).toBeCloseTo(0);
  });
  it('rejects invalid cohort sample requirements', () => {
    expect(() => scoreValidationCohorts([], () => 'x', () => ({observed: 1, predicted: 1}), 0)).toThrow();
  });
  it('scores zero predictions as complete misses instead of ignoring them', () => {
    const score = scoreValidationPairs([{observed: 10, predicted: 0}])!;
    expect(score.mapePercent).toBe(100);
    expect(score.meets80QualityGate).toBe(false);
  });
  it('rejects empty and invalid reference measurements', () => {
    expect(scoreValidationPairs([])).toBeUndefined();
    expect(scoreValidationPairs([{observed: 0, predicted: 3}])).toBeUndefined();
    expect(scoreValidationPairs([{observed: Number.NaN, predicted: 3}])).toBeUndefined();
  });
});
