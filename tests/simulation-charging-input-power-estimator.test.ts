import { describe, expect, it } from 'vitest';
import {
  buildChargerLabSamsungCurrentCorpus,
} from '../src/lib/simulation/modules/chargerlab-samsung-current-corpus';
import {
  estimateObservedChargingInputPower,
} from '../src/lib/simulation/modules/charging-input-power-estimator';
import {
  validateDeviceCorpus,
} from '../src/lib/simulation/modules/device-corpus';

describe('Samsung observed charging input estimation', () => {
  it('keeps current ChargerLAB Samsung power evidence valid and measurement-backed', () => {
    const corpus =
      buildChargerLabSamsungCurrentCorpus();

    expect(
      validateDeviceCorpus(corpus),
    ).toEqual([]);

    expect(
      corpus.measurements.every(
        (measurement) =>
          measurement.evidenceKind ===
          'measured',
      ),
    ).toBe(true);
  });

  it('anchors a Samsung 60W target below the advertised 60W using measured peers', () => {
    const corpus =
      buildChargerLabSamsungCurrentCorpus();

    const result =
      estimateObservedChargingInputPower(
        corpus,
        {
          advertisedWatts: 60,
          manufacturer: 'Samsung',
          chargingStandard:
            'USB PD PPS',
        },
      );

    expect(result.status).toBe('resolved');

    expect(
      result.expectedObservedPeakWatts,
    ).toBeGreaterThan(48);

    expect(
      result.expectedObservedPeakWatts,
    ).toBeLessThan(56);

    expect(
      result.expectedUtilizationPercent,
    ).toBeLessThan(100);
  });

  it('does not treat 140W adapter rating as 140W phone input on the S25 Ultra', () => {
    const corpus =
      buildChargerLabSamsungCurrentCorpus();

    const highAdapter =
      corpus.measurements.find(
        (measurement) =>
          measurement.id ===
          'chargerlab-s25u-aohi-140w-observed-input',
      );

    expect(
      highAdapter?.testChargerWatts,
    ).toBe(140);

    expect(
      highAdapter?.measuredPeakWatts,
    ).toBeCloseTo(40.51, 8);
  });
});
