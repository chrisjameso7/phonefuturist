import { describe, expect, it } from 'vitest';
import {
  selectChargingComparables,
} from '../src/lib/simulation/modules/charging-comparables';
import type { DeviceCorpus } from '../src/lib/simulation/modules/device-corpus';

const corpus: DeviceCorpus = {
  version: 'test',
  sources: [
    { id: 'lab', publisher: 'Lab', url: 'https://example.com' },
  ],
  devices: [
    {
      variant: {
        id: 'active-60w',
        identity: {
          manufacturer: 'Example',
          family: 'Gaming',
          modelName: 'Active 60',
        },
        battery: {
          capacityMah: 5800,
          chemistry: 'silicon-carbon',
        },
        soc: { vendor: 'Qualcomm', name: 'Chip' },
      },
      display: {
        diagonalInches: 6.8,
        refreshRateHz: 165,
      },
      dimensions: {
        widthMm: 77,
        heightMm: 164,
        thicknessMm: 9.3,
        weightG: 225,
      },
      charging: {
        advertisedWiredWatts: 60,
        cellArchitecture: 'dual-cell',
      },
      cooling: {
        class: 'active-fan',
      },
    },
    {
      variant: {
        id: 'thin-60w',
        identity: {
          manufacturer: 'Example',
          family: 'Flagship',
          modelName: 'Thin 60',
        },
        battery: {
          capacityMah: 5800,
          chemistry: 'silicon-carbon',
        },
        soc: { vendor: 'Qualcomm', name: 'Chip' },
      },
      display: {
        diagonalInches: 6.8,
        refreshRateHz: 120,
      },
      dimensions: {
        widthMm: 75,
        heightMm: 162,
        thicknessMm: 7.2,
        weightG: 190,
      },
      charging: {
        advertisedWiredWatts: 60,
        cellArchitecture: 'single-cell',
      },
      cooling: {
        class: 'vapor-chamber',
      },
    },
  ],
  measurements: [
    {
      id: 'active-full',
      deviceVariantId: 'active-60w',
      workload: 'charging',
      metric: 'wiredFullChargeMinutes',
      value: 38,
      unit: 'minutes',
      sourceId: 'lab',
      evidenceKind: 'measured',
    },
    {
      id: 'thin-full',
      deviceVariantId: 'thin-60w',
      workload: 'charging',
      metric: 'wiredFullChargeMinutes',
      value: 54,
      unit: 'minutes',
      sourceId: 'lab',
      evidenceKind: 'measured',
    },
  ],
};

describe('charging comparable selection', () => {
  it('prefers the thermally and physically closer charging reference', () => {
    const result = selectChargingComparables(corpus, {
      batteryMah: 5700,
      batteryChemistry: 'silicon-carbon',
      wiredChargingWatts: 60,
      socVendor: 'Qualcomm',
      displayDiagonalInches: 6.8,
      refreshRateHz: 165,
      thicknessMm: 9.2,
      weightG: 222,
      coolingClass: 'active-fan',
      limit: 2,
    });

    expect(result.status).toBe('resolved');
    expect(result.references[0].deviceVariantId).toBe('active-60w');
    expect(result.references[0].fullChargeMinutes).toBe(38);
  });

  it('fails closed when comparable phones have no measured charging evidence', () => {
    const empty: DeviceCorpus = {
      ...corpus,
      measurements: [],
    };

    const result = selectChargingComparables(empty, {
      batteryMah: 5700,
      wiredChargingWatts: 60,
    });

    expect(result.status).toBe('unresolved');
    expect(result.references).toHaveLength(0);
  });
});
