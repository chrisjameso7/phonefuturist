import { scoreValidationPairs, scoreValidationCohorts } from '../src/lib/simulation/modules/validation-accuracy';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  buildCalibrationRegistry,
  clearCalibrationRegistryCache,
} from '../src/lib/simulation/modules/calibration-registry';
import {
  backtestAgainstPhoneArenaRuntime,
} from '../src/lib/simulation/modules/phonearena-runtime-holdout';

describe('external PhoneArena runtime holdout', () => {
  let result: ReturnType<
    typeof backtestAgainstPhoneArenaRuntime
  >;

  beforeAll(() => {
    clearCalibrationRegistryCache();
    result =
      backtestAgainstPhoneArenaRuntime(
        buildCalibrationRegistry(),
      );
  }, 120_000);

  it('reports 80% and 90% evidence-based accuracy milestones', () => {
    expect(result.status).toBe('resolved');
    const score = scoreValidationPairs(result.rows.map(row => ({ observed: row.actualHours, predicted: row.predictedHours })));
    expect(score).toBeDefined();
    expect(score!.evaluated).toBe(result.rows.length);
    expect(score!.mapePercent).toBeCloseTo(result.mapePercent!, 6);
    console.info('RUNTIME_ACCURACY_TARGETS', JSON.stringify(score));
    const cohorts = scoreValidationCohorts(
      result.rows,
      row => row.workload,
      row => ({observed: row.actualHours, predicted: row.predictedHours}),
    );
    console.info('RUNTIME_WORST_COHORTS', JSON.stringify(cohorts));
    expect(cohorts.length).toBeGreaterThan(0);
    // A calibration milestone is achieved only when actual held-out error
    // meets the target. Reporting a milestone must not pretend it passed.
    if (process.env.ENFORCE_SIMULATION_ACCURACY === '1') {
      expect(score!.target80Met, 'Held-out MAPE must be at most 20%').toBe(true);
      expect(score!.coverageWithin20Percent, 'At least 80% of individual predictions must be within 20%').toBeGreaterThanOrEqual(80);
    }
  });

  it('evaluates held-out PhoneArena runtime rows across multiple workloads', () => {
    expect(result.status).toBe(
      'resolved',
    );

    console.info(
      'PHONEARENA_RUNTIME_HOLDOUT',
      JSON.stringify({
        evaluatedRows:
          result.evaluatedRows,
        evaluatedDevices:
          result.evaluatedDevices,
        skippedRows:
          result.skippedRows,
        maeHours:
          result.maeHours,
        mapePercent:
          result.mapePercent,
        meanSignedErrorHours:
          result.meanSignedErrorHours,
        byWorkload:
          result.byWorkload,
      }),
    );



    expect(
      result.evaluatedRows,
    ).toBeGreaterThanOrEqual(10);

    expect(
      result.evaluatedDevices,
    ).toBeGreaterThanOrEqual(5);

    expect(
      result.maeHours,
    ).toBeGreaterThanOrEqual(0);

    expect(
      result.mapePercent,
    ).toBeGreaterThanOrEqual(0);
  });

  it('compares a spec-enriched holdout without reintroducing PhoneArena measurements', () => {
    const enriched = backtestAgainstPhoneArenaRuntime(
      buildCalibrationRegistry(),
      'spec-enriched',
    );
    expect(enriched.status).toBe('resolved');
    expect(enriched.evaluatedRows).toBeGreaterThan(10);
    expect(enriched.rows.every(row => Number.isFinite(row.predictedHours) && row.predictedHours > 0)).toBe(true);
    console.info('PHONEARENA_RUNTIME_SPEC_ENRICHED', JSON.stringify({
      sparseMapePercent: result.mapePercent,
      enrichedMapePercent: enriched.mapePercent,
      sparseMaeHours: result.maeHours,
      enrichedMaeHours: enriched.maeHours,
      byWorkload: enriched.byWorkload,
    }));
  }, 120_000);

  it('reports browsing, video and gaming error separately', () => {
    const keys =
      result.byWorkload.map(
        (row) => row.key,
      );

    expect(keys).toEqual(
      expect.arrayContaining([
        'web_browsing',
        'video_playback',
        'gaming',
      ]),
    );

    expect(
      result.byWorkload.every(
        (row) =>
          row.count > 0 &&
          Number.isFinite(
            row.maeHours,
          ) &&
          Number.isFinite(
            row.mapePercent,
          ),
      ),
    ).toBe(true);
  });

  it('reports manufacturer bias and worst misses instead of only a global average', () => {
    expect(
      result.byManufacturer.length,
    ).toBeGreaterThanOrEqual(2);

    expect(
      result.worstMisses.length,
    ).toBeGreaterThan(0);
  });

  it('documents that this holdout tests the sparse-spec fallback path', () => {
    expect(result.note).toContain(
      'battery capacity plus manufacturer context',
    );

    expect(
      result.rows.every(
        (row) =>
          row.referenceCount > 0 &&
          row.publisherCount > 0,
      ),
    ).toBe(true);
  });
});
