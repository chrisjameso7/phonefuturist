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

  it('evaluates held-out PhoneArena runtime rows across multiple workloads', () => {
    expect(result.status).toBe(
      'resolved',
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
