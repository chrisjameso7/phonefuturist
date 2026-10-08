import { describe, expect, it } from 'vitest';
import { estimateChargingFromCorpus } from '../src/lib/simulation/modules/charging-corpus-estimator';
import { resolveCorpusRuntimeBand } from '../src/lib/simulation/modules/corpus-runtime';
import type { DeviceCorpus } from '../src/lib/simulation/modules/device-corpus';

const corpus: DeviceCorpus = {
  version: 'test',
  sources: [
    {
      id: 'runtime-a',
      publisher: 'Lab A',
      url: 'https://example.com/a',
      protocol: 'web-test',
      protocolVersion: 'v1',
    },
    {
      id: 'runtime-b',
      publisher: 'Lab B',
      url: 'https://example.com/b',
      protocol: 'web-test',
      protocolVersion: 'v2',
    },
    {
      id: 'charge',
      publisher: 'Charge Lab',
      url: 'https://example.com/charge',
    },
  ],
  devices: [
    {
      variant: {
        id: 'phone',
        identity: {
          manufacturer: 'Example',
          family: 'Example',
          modelName: 'Phone',
        },
        battery: { capacityMah: 5000 },
      },
      display: { diagonalInches: 6.7 },
      charging: { advertisedWiredWatts: 60 },
    },
  ],
  measurements: [
    {
      id: 'web-v1',
      deviceVariantId: 'phone',
      workload: 'web_browsing',
      metric: 'runtime',
      value: 10,
      unit: 'hours',
      sourceId: 'runtime-a',
      evidenceKind: 'measured',
    },
    {
      id: 'web-v2',
      deviceVariantId: 'phone',
      workload: 'web_browsing',
      metric: 'runtime',
      value: 20,
      unit: 'hours',
      sourceId: 'runtime-b',
      evidenceKind: 'measured',
    },
    {
      id: 'full',
      deviceVariantId: 'phone',
      workload: 'charging',
      metric: 'wiredFullChargeMinutes',
      value: 50,
      unit: 'minutes',
      sourceId: 'charge',
      evidenceKind: 'measured',
      testChargerWatts: 60,
    },
    {
      id: 'p30',
      deviceVariantId: 'phone',
      workload: 'charging',
      metric: 'charge30mPercent',
      value: 80,
      unit: 'percent',
      sourceId: 'charge',
      evidenceKind: 'measured',
      testChargerWatts: 60,
    },
  ],
};

describe('battery and charging normalization', () => {
  it('never averages incompatible runtime protocols', () => {
    const input = {
      formFactor: 'phone' as const,
      displays: { primary: { diagonalInches: 6.7 } },
      battery: { cells: [{ capacityMah: 5000 }] },
    };

    const auto = resolveCorpusRuntimeBand(
      corpus,
      input,
      'web_browsing',
    );

    expect(auto.status).toBe('resolved');
    expect(auto.estimate?.referenceCount).toBe(1);

    const v2 = resolveCorpusRuntimeBand(
      corpus,
      input,
      'web_browsing',
      {
        protocol: 'web-test',
        protocolVersion: 'v2',
      },
    );

    expect(v2.estimate?.protocolVersion).toBe('v2');
    expect(v2.estimate?.expectedMahPerHour).toBeCloseTo(250);
  });

  it('exposes capacity-normalized charging metrics', () => {
    const result = estimateChargingFromCorpus(corpus, {
      batteryMah: 5000,
      wiredChargingWatts: 60,
    });

    expect(
      result.estimate?.normalized?.expectedFullChargeMahPerMinute,
    ).toBeCloseTo(100);

    expect(
      result.estimate?.normalized?.expectedMinutesPer1000Mah,
    ).toBeCloseTo(10);

    expect(
      result.estimate?.normalized?.effectiveFullChargeCPerHour,
    ).toBeCloseTo(1.2);

    expect(
      result.estimate?.normalized?.expectedMahAddedIn30Minutes,
    ).toBeCloseTo(4000);
  });
});
