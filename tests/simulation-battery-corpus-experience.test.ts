import { describe, expect, it } from 'vitest';
import { simulateBatteryExperience } from '../src/lib/simulation/modules/battery-experience-engine';
import type { DeviceCorpus } from '../src/lib/simulation/modules/device-corpus';

const corpus: DeviceCorpus = {
  version: 'test',
  sources: [{ id: 'lab', publisher: 'Lab', url: 'https://example.com' }],
  devices: [
    {
      variant: {
        id: 'single',
        identity: {
          manufacturer: 'Example',
          family: 'Example',
          modelName: 'Single Cell',
        },
        battery: { capacityMah: 5000 },
      },
      display: { diagonalInches: 6.8, refreshRateHz: 120 },
      dimensions: { thicknessMm: 8.5, weightG: 220 },
      charging: {
        advertisedWiredWatts: 60,
        cellArchitecture: 'single-cell',
      },
    },
    {
      variant: {
        id: 'dual',
        identity: {
          manufacturer: 'Other',
          family: 'Other',
          modelName: 'Dual Cell',
        },
        battery: { capacityMah: 5000 },
      },
      display: { diagonalInches: 6.8, refreshRateHz: 120 },
      dimensions: { thicknessMm: 8.5, weightG: 220 },
      charging: {
        advertisedWiredWatts: 60,
        cellArchitecture: 'dual-cell',
      },
    },
  ],
  measurements: [
    {
      id: 'single-web',
      deviceVariantId: 'single',
      workload: 'web_browsing',
      metric: 'runtime',
      value: 10,
      unit: 'hours',
      sourceId: 'lab',
      evidenceKind: 'measured',
    },
    {
      id: 'single-video',
      deviceVariantId: 'single',
      workload: 'video_playback',
      metric: 'runtime',
      value: 20,
      unit: 'hours',
      sourceId: 'lab',
      evidenceKind: 'measured',
    },
    {
      id: 'single-gaming',
      deviceVariantId: 'single',
      workload: 'gaming',
      metric: 'runtime',
      value: 5,
      unit: 'hours',
      sourceId: 'lab',
      evidenceKind: 'measured',
    },
    {
      id: 'single-30',
      deviceVariantId: 'single',
      workload: 'charging',
      metric: 'charge30mPercent',
      value: 80,
      unit: 'percent',
      sourceId: 'lab',
      evidenceKind: 'measured',
    },
    {
      id: 'single-full',
      deviceVariantId: 'single',
      workload: 'charging',
      metric: 'wiredFullChargeMinutes',
      value: 50,
      unit: 'minutes',
      sourceId: 'lab',
      evidenceKind: 'measured',
    },
    {
      id: 'dual-30',
      deviceVariantId: 'dual',
      workload: 'charging',
      metric: 'charge30mPercent',
      value: 95,
      unit: 'percent',
      sourceId: 'lab',
      evidenceKind: 'measured',
    },
    {
      id: 'dual-full',
      deviceVariantId: 'dual',
      workload: 'charging',
      metric: 'wiredFullChargeMinutes',
      value: 35,
      unit: 'minutes',
      sourceId: 'lab',
      evidenceKind: 'measured',
    },
  ],
};

describe('unified corpus battery experience', () => {
  it('returns runtime and charging in one result', () => {
    const result = simulateBatteryExperience(corpus, {
      simulation: {
        formFactor: 'phone',
        displays: {
          primary: { diagonalInches: 6.8 },
        },
        dimensions: { thicknessMm: 8.5, weightG: 220 },
        battery: { cells: [{ capacityMah: 5000 }] },
      },
      manufacturer: 'Example',
      wiredWatts: 60,
      cellArchitecture: 'single-cell',
    });

    expect(result.runtimes).toHaveLength(3);
    expect(
      result.runtimes.find((runtime) => runtime.workload === 'web_browsing')
        ?.expectedHours,
    ).toBeCloseTo(10);
    expect(result.charging?.status).toBe('resolved');
    expect(result.charging?.estimate?.neighborIds[0]).toBe('single');
  });
});
