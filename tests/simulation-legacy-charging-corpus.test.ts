import { describe, expect, it } from 'vitest';
import { buildLegacyChargingCorpus } from '../src/lib/simulation/modules/legacy-charging-corpus';
import { selectChargingComparables } from '../src/lib/simulation/modules/charging-comparables';
import type { DeviceCorpus } from '../src/lib/simulation/modules/device-corpus';

describe('legacy charging corpus migration', () => {
  it('imports the 2025-2026 charging dataset without relabeling tested charger power as advertised power', () => {
    const corpus =
      buildLegacyChargingCorpus();

    expect(corpus.devices).toHaveLength(140);
    expect(corpus.measurements).toHaveLength(266);

    const brands = new Set(
      corpus.devices.map(
        (device) =>
          device.variant.identity
            .manufacturer,
      ),
    );

    expect(brands.size).toBe(19);

    const s26Ultra =
      corpus.devices.find(
        (device) =>
          device.variant.identity
            .modelName ===
          'Galaxy S26 Ultra',
      );

    expect(
      s26Ultra?.charging
        ?.referenceWiredWatts,
    ).toBe(60);
    expect(
      s26Ultra?.charging
        ?.advertisedWiredWatts,
    ).toBeUndefined();
  });

  it('keeps primary milestone evidence separate from secondary-source provenance', () => {
    const corpus =
      buildLegacyChargingCorpus();

    const onePlus =
      corpus.devices.find(
        (device) =>
          device.variant.identity
            .manufacturer ===
            'OnePlus' &&
          device.variant.identity
            .modelName === '15',
      );

    expect(
      onePlus?.sourceIds?.length,
    ).toBeGreaterThanOrEqual(3);

    const measurements =
      corpus.measurements.filter(
        (measurement) =>
          measurement.deviceVariantId ===
          onePlus?.variant.id,
      );

    expect(measurements).toHaveLength(2);
    expect(
      new Set(
        measurements.map(
          (measurement) =>
            measurement.sourceId,
        ),
      ).size,
    ).toBe(1);
  });

  it('dedupes duplicate physical phones imported through different variant ids', () => {
    const corpus: DeviceCorpus = {
      version: 'dedupe-test',
      sources: [
        {
          id: 'lab',
          publisher: 'Lab',
          url: 'https://example.com',
        },
      ],
      devices: [
        {
          variant: {
            id: 'a',
            identity: {
              manufacturer: 'Example',
              family: 'Phone',
              modelName: 'Phone',
            },
            battery: {
              capacityMah: 5000,
            },
          },
          charging: {
            referenceWiredWatts: 60,
          },
        },
        {
          variant: {
            id: 'b',
            identity: {
              manufacturer: 'Example',
              family: 'Phone',
              modelName: 'Phone',
            },
            battery: {
              capacityMah: 5000,
            },
          },
          charging: {
            referenceWiredWatts: 60,
          },
        },
      ],
      measurements: [
        {
          id: 'a-full',
          deviceVariantId: 'a',
          workload: 'charging',
          metric: 'wiredFullChargeMinutes',
          value: 50,
          unit: 'minutes',
          sourceId: 'lab',
          evidenceKind: 'measured',
          testChargerWatts: 60,
        },
        {
          id: 'b-full',
          deviceVariantId: 'b',
          workload: 'charging',
          metric: 'wiredFullChargeMinutes',
          value: 50,
          unit: 'minutes',
          sourceId: 'lab',
          evidenceKind: 'measured',
          testChargerWatts: 60,
        },
      ],
    };

    const result =
      selectChargingComparables(
        corpus,
        {
          batteryMah: 5000,
          wiredChargingWatts: 60,
          limit: 5,
        },
      );

    expect(result.status).toBe('resolved');
    expect(result.references).toHaveLength(1);
  });
});
