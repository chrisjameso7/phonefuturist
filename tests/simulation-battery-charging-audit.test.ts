import { describe, expect, it } from 'vitest';
import { buildBatteryChargingCoverageReport } from '../src/lib/simulation/modules/battery-charging-coverage';
import { validateChargingEvidence } from '../src/lib/simulation/modules/charging-evidence-validator';
import type { DeviceCorpus } from '../src/lib/simulation/modules/device-corpus';

const corpus: DeviceCorpus = {
  version: 'test',
  sources: [{ id: 'lab', publisher: 'Lab', url: 'https://example.com' }],
  devices: [
    {
      variant: {
        id: 'a',
        identity: { manufacturer: 'BrandA', family: 'A', modelName: 'A1' },
        battery: { capacityMah: 5000, chemistry: 'Li-ion' },
      },
      charging: {
        advertisedWiredWatts: 60,
        cellArchitecture: 'single-cell',
      },
    },
    {
      variant: {
        id: 'b',
        identity: { manufacturer: 'BrandA', family: 'A', modelName: 'A2' },
        battery: { capacityMah: 5700 },
      },
      charging: { advertisedWiredWatts: 60 },
    },
  ],
  measurements: [
    {
      id: 'a50',
      deviceVariantId: 'a',
      workload: 'charging',
      metric: 'timeTo50Minutes',
      value: 18,
      unit: 'minutes',
      sourceId: 'lab',
      evidenceKind: 'measured',
    },
    {
      id: 'a80',
      deviceVariantId: 'a',
      workload: 'charging',
      metric: 'timeTo80Minutes',
      value: 31,
      unit: 'minutes',
      sourceId: 'lab',
      evidenceKind: 'measured',
    },
    {
      id: 'a100',
      deviceVariantId: 'a',
      workload: 'charging',
      metric: 'wiredFullChargeMinutes',
      value: 49,
      unit: 'minutes',
      sourceId: 'lab',
      evidenceKind: 'measured',
    },
    {
      id: 'a30',
      deviceVariantId: 'a',
      workload: 'charging',
      metric: 'charge30mPercent',
      value: 78,
      unit: 'percent',
      sourceId: 'lab',
      evidenceKind: 'measured',
    },
  ],
};

describe('battery and charging corpus audit', () => {
  it('reports coverage by brand and charging class', () => {
    const report = buildBatteryChargingCoverageReport(corpus);
    expect(report.totals.devices).toBe(2);
    expect(report.totals.withChargingMeasurements).toBe(1);
    expect(report.brands.find((row) => row.label === 'BrandA')?.devices).toBe(2);
  });

  it('accepts monotonic charging evidence', () => {
    expect(validateChargingEvidence(corpus)).toEqual([]);
  });

  it('flags impossible milestone ordering', () => {
    const broken: DeviceCorpus = {
      ...corpus,
      measurements: corpus.measurements.map((measurement) =>
        measurement.id === 'a80'
          ? { ...measurement, value: 15 }
          : measurement,
      ),
    };

    expect(
      validateChargingEvidence(broken).some(
        (issue) => issue.code === 'NON_MONOTONIC_MILESTONES',
      ),
    ).toBe(true);
  });
});
