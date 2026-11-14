import { describe, expect, it } from 'vitest';
import { buildCalibrationRegistry } from '../src/lib/simulation/modules/calibration-registry';
import { enrichCorpusWithBatteryEnergyEvidence } from '../src/lib/simulation/modules/battery-energy-evidence';
import type { DeviceCorpus } from '../src/lib/simulation/modules/device-corpus';

describe('battery energy evidence enrichment', () => {
  it('enriches matching runtime variants without inventing a generic voltage', () => {
    const corpus: DeviceCorpus = {
      version: 'test',
      sources: [],
      devices: [
        {
          variant: {
            id: 's25',
            identity: {
              manufacturer: 'Samsung',
              family: 'Galaxy S25 Ultra',
              modelName: 'Galaxy S25 Ultra',
            },
            battery: {
              capacityMah: 5000,
            },
          },
        },
        {
          variant: {
            id: 'unknown',
            identity: {
              manufacturer: 'Example',
              family: 'Mystery',
              modelName: 'Mystery',
            },
            battery: {
              capacityMah: 5000,
            },
          },
        },
      ],
      measurements: [],
    };

    const result =
      enrichCorpusWithBatteryEnergyEvidence(corpus);

    const s25 = result.corpus.devices.find(
      (device) => device.variant.id === 's25',
    );
    const unknown = result.corpus.devices.find(
      (device) => device.variant.id === 'unknown',
    );

    expect(
      s25?.variant.battery?.nominalVoltageV,
    ).toBeCloseTo(3.88, 8);
    expect(
      s25?.variant.battery?.ratedEnergyWh,
    ).toBeCloseTo(18.84, 8);

    expect(
      unknown?.variant.battery?.nominalVoltageV,
    ).toBeUndefined();
    expect(
      unknown?.variant.battery?.typicalEnergyWh,
    ).toBeUndefined();
    expect(
      unknown?.variant.battery?.ratedEnergyWh,
    ).toBeUndefined();
  });

  it('makes accepted battery energy evidence available in the live registry', () => {
    const registry = buildCalibrationRegistry();

    const s25 = registry.devices.find(
      (device) =>
        device.variant.identity.manufacturer === 'Samsung' &&
        device.variant.identity.modelName === 'Galaxy S25 Ultra',
    );

    expect(s25).toBeDefined();
    expect(
      s25?.variant.battery?.nominalVoltageV,
    ).toBeCloseTo(3.88, 8);
    expect(
      s25?.variant.battery?.ratedEnergyWh,
    ).toBeCloseTo(18.84, 8);
  });
});
