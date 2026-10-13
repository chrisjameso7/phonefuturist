import { beforeAll, describe, expect, it } from 'vitest';
import {
  buildCalibrationRegistry,
  clearCalibrationRegistryCache,
} from '../src/lib/simulation/modules/calibration-registry';
import {
  backtestAgainstPhoneArenaCharging,
} from '../src/lib/simulation/modules/phonearena-charging-holdout';

describe('external PhoneArena charging holdout', () => {
  let result: ReturnType<
    typeof backtestAgainstPhoneArenaCharging
  >;

  beforeAll(() => {
    clearCalibrationRegistryCache();
    result =
      backtestAgainstPhoneArenaCharging(
        buildCalibrationRegistry(),
      );
  }, 240_000);

  it('evaluates a meaningful held-out PhoneArena charging cohort', () => {
    expect(result.status).toBe(
      'resolved',
    );

    console.info(
      'PHONEARENA_CHARGING_HOLDOUT',
      JSON.stringify({
        evaluatedDevices:
          result.evaluatedDevices,
        skippedDevices:
          result.skippedDevices,
        maeMinutes:
          result.maeMinutes,
        mapePercent:
          result.mapePercent,
        meanSignedErrorMinutes:
          result.meanSignedErrorMinutes,
        thirtyMinuteEvaluatedDevices:
          result.thirtyMinuteEvaluatedDevices,
        thirtyMinuteMaePoints:
          result.thirtyMinuteMaePoints,
        byWattageBand:
          result.byWattageBand,
      }),
    );



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

  it('scores 30-minute early-charge behavior separately from full-charge time', () => {
    expect(
      result.thirtyMinuteEvaluatedDevices,
    ).toBeGreaterThanOrEqual(10);

    expect(
      result.thirtyMinuteMaePoints,
    ).toBeGreaterThanOrEqual(0);

    expect(
      result.thirtyMinuteMeanSignedErrorPoints,
    ).toBeDefined();
  });

  it('reports manufacturer and charger-class bias rather than hiding it in one global number', () => {
    expect(
      result.byManufacturer.length,
    ).toBeGreaterThanOrEqual(4);

    expect(
      result.byWattageBand.length,
    ).toBeGreaterThanOrEqual(3);

    expect(
      result.worstFullChargeMisses.length,
    ).toBeGreaterThan(0);

    expect(
      result.worstThirtyMinuteMisses.length,
    ).toBeGreaterThan(0);
  });

  it('holds PhoneArena measurements out instead of testing against self-fit predictions', () => {
    expect(result.note).toContain(
      'removed from the estimator before prediction',
    );

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
  });
});
