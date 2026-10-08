import { describe, expect, it } from 'vitest';
import {
  deviceVariantKey,
  type DeviceVariantRecord,
} from '../src/lib/simulation/modules/device-variant';

describe('device variant identity', () => {
  it('separates Samsung SoC variants with the same marketing name', () => {
    const base = {
      id: 'galaxy-example',
      identity: {
        manufacturer: 'Samsung',
        family: 'Galaxy S',
        modelName: 'Galaxy S Example',
        region: 'Global',
      },
      battery: { capacityMah: 5000 },
    } satisfies Omit<DeviceVariantRecord, 'soc'>;

    const exynos: DeviceVariantRecord = {
      ...base,
      soc: { vendor: 'Samsung', name: 'Exynos Example' },
    };

    const snapdragon: DeviceVariantRecord = {
      ...base,
      soc: { vendor: 'Qualcomm', name: 'Snapdragon Example' },
    };

    expect(deviceVariantKey(exynos)).not.toBe(deviceVariantKey(snapdragon));
  });

  it('separates Apple SIM and battery configurations', () => {
    const esim: DeviceVariantRecord = {
      id: 'iphone-esim',
      identity: {
        manufacturer: 'Apple',
        family: 'iPhone',
        modelName: 'iPhone Example',
        region: 'US',
      },
      simConfiguration: 'esim_only',
      battery: { capacityMah: 5100 },
      soc: { vendor: 'Apple', name: 'A Example' },
    };

    const physicalSim: DeviceVariantRecord = {
      ...esim,
      id: 'iphone-physical',
      identity: { ...esim.identity, region: 'Global' },
      simConfiguration: 'nano_sim_plus_esim',
      battery: { capacityMah: 4900 },
    };

    expect(deviceVariantKey(esim)).not.toBe(deviceVariantKey(physicalSim));
  });

  it('does not invent missing region or SKU information', () => {
    const unknown: DeviceVariantRecord = {
      id: 'unknown-region',
      identity: {
        manufacturer: 'Example',
        family: 'Example',
        modelName: 'Example Phone',
      },
      soc: { vendor: 'other', name: 'Example SoC' },
    };

    expect(deviceVariantKey(unknown)).toBe(
      'example|example|example phone|example soc',
    );
  });
});
