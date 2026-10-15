import { describe, expect, it } from 'vitest';
import { buildPhoneArenaRuntimeSpecBridge } from '../src/lib/simulation/modules/phonearena-runtime-spec-bridge';
import type { DeviceCorpus, DeviceCorpusRecord } from '../src/lib/simulation/modules/device-corpus';

const sourceId = 'phonearena-battery-current-2026-10';

function phone(
  id: string, model: string, batteryMah: number,
  extra: Partial<DeviceCorpusRecord> = {},
): DeviceCorpusRecord {
  return {
    variant: {
      id,
      identity: { manufacturer: 'Samsung', family: model, modelName: model },
      battery: { capacityMah: batteryMah },
    },
    ...extra,
  };
}

function corpusWithDonors(donors: DeviceCorpusRecord[]): DeviceCorpus {
  return {
    version: 'bridge-test',
    sources: [{ id: sourceId, publisher: 'PhoneArena', url: 'https://example.com' }],
    measurements: [],
    devices: [
      {
        ...phone('phonearena-target', 'Galaxy X', 5000),
        sourceIds: [sourceId],
      },
      ...donors,
    ],
  };
}

describe('conservative battery runtime spec bridge', () => {
  it('links consistent specs from the exact model and battery variant only', () => {
    const donor = phone('spec-donor', 'Samsung Galaxy X 5G', 5000, {
      variant: {
        id: 'spec-donor',
        identity: { manufacturer: 'Samsung', family: 'Galaxy X', modelName: 'Samsung Galaxy X 5G' },
        battery: { capacityMah: 5000, nominalVoltageV: 3.9 },
        soc: { vendor: 'Qualcomm', name: 'Snapdragon Test' },
      },
      display: {
        diagonalInches: 6.7,
        resolutionWidthPx: 1440,
        resolutionHeightPx: 3200,
        refreshRateHz: 120,
      },
    });
    const original = corpusWithDonors([donor]);
    const result = buildPhoneArenaRuntimeSpecBridge(original);
    const linked = result.corpus.devices[0];

    expect(result.stats.linkedRecords).toBe(1);
    expect(result.stats.socAdded).toBe(1);
    expect(result.stats.displaySizeAdded).toBe(1);
    expect(linked.variant.soc?.name).toBe('Snapdragon Test');
    expect(linked.display?.refreshRateHz).toBe(120);
    expect(linked.display?.resolutionWidthPx).toBe(1440);
    // Voltage is variant-specific and must never be borrowed.
    expect(linked.variant.battery?.nominalVoltageV).toBeUndefined();
    expect(original.devices[0].variant.soc).toBeUndefined();
  });

  it('rejects a mismatched regional battery or a different model', () => {
    const others = [
      phone('wrong-region', 'Galaxy X', 5500, {
        display: { diagonalInches: 6.7, refreshRateHz: 120 },
      }),
      phone('wrong-model', 'Galaxy X Pro', 5000, {
        display: { diagonalInches: 6.7, refreshRateHz: 120 },
      }),
    ];
    const result = buildPhoneArenaRuntimeSpecBridge(corpusWithDonors(others));
    expect(result.stats.linkedRecords).toBe(0);
    expect(result.corpus.devices[0].display).toBeUndefined();
  });

  it('does not infer a chip when regional sources disagree', () => {
    const donors = [
      phone('qualcomm', 'Galaxy X', 5000, {
        variant: {
          id: 'qualcomm',
          identity: { manufacturer: 'Samsung', family: 'Galaxy X', modelName: 'Galaxy X' },
          battery: { capacityMah: 5000 },
          soc: { vendor: 'Qualcomm', name: 'Snapdragon Test' },
        },
      }),
      phone('samsung', 'Galaxy X', 5000, {
        variant: {
          id: 'samsung',
          identity: { manufacturer: 'Samsung', family: 'Galaxy X', modelName: 'Galaxy X' },
          battery: { capacityMah: 5000 },
          soc: { vendor: 'Samsung', name: 'Exynos Test' },
        },
      }),
    ];
    const result = buildPhoneArenaRuntimeSpecBridge(corpusWithDonors(donors));
    expect(result.stats.conflictingProcessors).toBe(1);
    expect(result.stats.socAdded).toBe(0);
    expect(result.corpus.devices[0].variant.soc).toBeUndefined();
  });
});
