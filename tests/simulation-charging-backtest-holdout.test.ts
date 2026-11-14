import { describe, expect, it } from 'vitest';
import {
  backtestChargingCorpus,
  buildChargingBacktestHoldoutCorpus,
} from '../src/lib/simulation/modules/charging-backtest';
import type { DeviceCorpus } from '../src/lib/simulation/modules/device-corpus';

const corpus: DeviceCorpus = {
  version: 'charging-holdout-mode',
  sources: [{
    id: 'lab',
    publisher: 'Lab',
    url: 'https://example.com',
    protocol: 'charging-test',
  }],
  devices: [
    {
      variant: {
        id: 'target',
        identity: {
          manufacturer: 'Example',
          family: 'Example',
          modelName: 'Target',
        },
        battery: { capacityMah: 5000 },
      },
    },
    {
      variant: {
        id: 'peer',
        identity: {
          manufacturer: 'Peer',
          family: 'Peer',
          modelName: 'Peer',
        },
        battery: { capacityMah: 5000 },
      },
    },
  ],
  measurements: [
    {
      id: 'target-full-100w',
      deviceVariantId: 'target',
      workload: 'charging',
      metric: 'fullChargeMinutes',
      value: 40,
      unit: 'minutes',
      sourceId: 'lab',
      evidenceKind: 'measured',
      testChargerWatts: 100,
      chargingStandard: 'USB PD/PPS',
    },
    {
      id: 'target-p30-100w',
      deviceVariantId: 'target',
      workload: 'charging',
      metric: 'thirtyMinutePercent',
      value: 80,
      unit: 'percent',
      sourceId: 'lab',
      evidenceKind: 'measured',
      testChargerWatts: 100,
      chargingStandard: 'USB PD/PPS',
    },
    {
      id: 'target-peak-100w',
      deviceVariantId: 'target',
      workload: 'charging',
      metric: 'peakWatts',
      value: 82,
      unit: 'W',
      sourceId: 'lab',
      evidenceKind: 'measured',
      testChargerWatts: 100,
      chargingStandard: 'USB PD/PPS',
    },
    {
      id: 'target-full-65w',
      deviceVariantId: 'target',
      workload: 'charging',
      metric: 'fullChargeMinutes',
      value: 55,
      unit: 'minutes',
      sourceId: 'lab',
      evidenceKind: 'measured',
      testChargerWatts: 65,
      chargingStandard: 'USB PD/PPS',
    },
    {
      id: 'peer-full-100w',
      deviceVariantId: 'peer',
      workload: 'charging',
      metric: 'fullChargeMinutes',
      value: 45,
      unit: 'minutes',
      sourceId: 'lab',
      evidenceKind: 'measured',
      testChargerWatts: 100,
      chargingStandard: 'USB PD/PPS',
    },
  ],
};

describe('charging backtest mode holdout', () => {
  it('removes every same-mode measurement while keeping other charger modes', () => {
    const heldOut = corpus.measurements.find(
      (measurement) =>
        measurement.id === 'target-full-100w',
    );

    expect(heldOut).toBeDefined();

    const reduced =
      buildChargingBacktestHoldoutCorpus(
        corpus,
        heldOut!,
        'mode',
      );

    const ids = reduced.measurements.map(
      (measurement) => measurement.id,
    );

    expect(ids).not.toContain('target-full-100w');
    expect(ids).not.toContain('target-p30-100w');
    expect(ids).not.toContain('target-peak-100w');

    expect(ids).toContain('target-full-65w');
    expect(ids).toContain('peer-full-100w');
  });

  it('uses mode holdout by default', () => {
    const result = backtestChargingCorpus(corpus);

    expect(result.rows.length).toBeGreaterThan(0);
    expect(
      result.rows.every((row) => row.holdout === 'mode'),
    ).toBe(true);
  });

  it('keeps measurement holdout available only as an explicit diagnostic mode', () => {
    const result = backtestChargingCorpus(
      corpus,
      { holdout: 'measurement' },
    );

    expect(
      result.rows.every(
        (row) => row.holdout === 'measurement',
      ),
    ).toBe(true);
  });
});
