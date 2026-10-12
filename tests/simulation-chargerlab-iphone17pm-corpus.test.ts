import { describe, expect, it } from 'vitest';
import {
  buildChargerLabIPhone17ProMaxCorpus,
} from '../src/lib/simulation/modules/chargerlab-iphone17pm-corpus';
import {
  collectChargingPowerResponseEvidence,
} from '../src/lib/simulation/modules/charging-power-response';
import {
  validateDeviceCorpus,
} from '../src/lib/simulation/modules/device-corpus';

describe('ChargerLAB iPhone 17 Pro Max corpus', () => {
  it('keeps four measured USB-PD adapter modes with 25C metadata', () => {
    const corpus =
      buildChargerLabIPhone17ProMaxCorpus();

    expect(
      validateDeviceCorpus(corpus),
    ).toEqual([]);

    const full =
      corpus.measurements.filter(
        (measurement) =>
          measurement.metric ===
          'fullChargeMinutes',
      );

    expect(full).toHaveLength(4);

    expect(
      new Set(
        full.map(
          (measurement) =>
            measurement.testChargerWatts,
        ),
      ),
    ).toEqual(
      new Set([20, 40, 70, 140]),
    );

    expect(
      full.every(
        (measurement) =>
          measurement.ambientTemperatureC ===
          25,
      ),
    ).toBe(true);
  });

  it('learns the useful response from measured phone peak power rather than adapter rating', () => {
    const corpus =
      buildChargerLabIPhone17ProMaxCorpus();

    const evidence =
      collectChargingPowerResponseEvidence(
        corpus,
      );

    expect(
      evidence.some(
        (row) =>
          row.lowWatts === 17 &&
          row.highWatts > 36 &&
          row.highWatts < 38,
      ),
    ).toBe(true);

    expect(
      evidence.every(
        (row) =>
          row.highWatts < 40,
      ),
    ).toBe(true);
  });

  it('retains measured charging surface temperatures separately from charge milestones', () => {
    const corpus =
      buildChargerLabIPhone17ProMaxCorpus();

    const temps =
      corpus.measurements.filter(
        (measurement) =>
          measurement.metric
            .toLowerCase()
            .includes(
              'temperature',
            ),
      );

    expect(temps).toHaveLength(6);
    expect(
      Math.max(
        ...temps.map(
          (measurement) =>
            measurement.value,
        ),
      ),
    ).toBeCloseTo(39.5, 8);
  });
});
