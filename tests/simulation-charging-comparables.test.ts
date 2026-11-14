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

  it('ignores inferred charging rows even when the device is otherwise a perfect match', () => {
    const inferredOnly: DeviceCorpus = {
      ...corpus,
      measurements: corpus.measurements.map(
        (measurement) => ({
          ...measurement,
          evidenceKind: 'inferred' as const,
        }),
      ),
    };

    const result = selectChargingComparables(
      inferredOnly,
      {
        batteryMah: 5800,
        batteryChemistry: 'silicon-carbon',
        wiredChargingWatts: 60,
        manufacturer: 'Example',
      },
    );

    expect(result.status).toBe('unresolved');
    expect(result.references).toHaveLength(0);
  });

  it('keeps only the best charger mode from each physical device', () => {
    const multiMode: DeviceCorpus = {
      ...corpus,
      measurements: [
        ...corpus.measurements,
        {
          id: 'active-full-45w',
          deviceVariantId: 'active-60w',
          workload: 'charging',
          metric: 'wiredFullChargeMinutes',
          value: 52,
          unit: 'minutes',
          sourceId: 'lab',
          evidenceKind: 'measured',
          testChargerWatts: 45,
          chargingStandard: 'USB PD/PPS',
        },
        {
          id: 'active-full-60w-mode',
          deviceVariantId: 'active-60w',
          workload: 'charging',
          metric: 'wiredFullChargeMinutes',
          value: 38,
          unit: 'minutes',
          sourceId: 'lab',
          evidenceKind: 'measured',
          testChargerWatts: 60,
          chargingStandard: 'USB PD/PPS',
        },
        {
          id: 'thin-full-60w-mode',
          deviceVariantId: 'thin-60w',
          workload: 'charging',
          metric: 'wiredFullChargeMinutes',
          value: 54,
          unit: 'minutes',
          sourceId: 'lab',
          evidenceKind: 'measured',
          testChargerWatts: 60,
          chargingStandard: 'USB PD/PPS',
        },
      ],
    };

    const result = selectChargingComparables(
      multiMode,
      {
        batteryMah: 5800,
        wiredChargingWatts: 60,
        chargingStandard: 'USB PD/PPS',
        limit: 5,
      },
    );

    expect(result.status).toBe('resolved');
    expect(
      result.references.filter(
        (reference) =>
          reference.deviceVariantId ===
          'active-60w',
      ),
    ).toHaveLength(1);
    expect(
      new Set(
        result.references.map(
          (reference) =>
            reference.deviceVariantId,
        ),
      ).size,
    ).toBe(result.references.length);
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
