import { describe, expect, it } from 'vitest';
import { estimateChargingFromCorpus } from '../src/lib/simulation/modules/charging-corpus-estimator';
import type { DeviceCorpus } from '../src/lib/simulation/modules/device-corpus';

function corpus(withEnergy = true): DeviceCorpus {
  return {
    version: 'charging-energy-test',
    sources: [
      {
        id: 'lab',
        publisher: 'Lab',
        url: 'https://example.com/charging',
        protocol: 'charging test',
        protocolVersion: '1',
      },
    ],
    devices: [
      {
        variant: {
          id: 'ref-a',
          identity: {
            manufacturer: 'Example',
            family: 'A',
            modelName: 'A',
          },
          battery: {
            capacityMah: 5000,
            ...(withEnergy
              ? {
                  typicalEnergyWh: 20,
                  nominalVoltageV: 4,
                }
              : {}),
          },
        },
        charging: {
          advertisedWiredWatts: 50,
        },
      },
      {
        variant: {
          id: 'ref-b',
          identity: {
            manufacturer: 'Example',
            family: 'B',
            modelName: 'B',
          },
          battery: {
            capacityMah: 5000,
            ...(withEnergy
              ? {
                  typicalEnergyWh: 20,
                  nominalVoltageV: 4,
                }
              : {}),
          },
        },
        charging: {
          advertisedWiredWatts: 50,
        },
      },
    ],
    measurements: [
      {
        id: 'a-full',
        deviceVariantId: 'ref-a',
        workload: 'charging',
        metric: 'wiredFullChargeMinutes',
        value: 40,
        unit: 'minutes',
        sourceId: 'lab',
        evidenceKind: 'measured',
        testChargerWatts: 50,
        chargingStandard: 'USB PD/PPS',
      },
      {
        id: 'a-p30',
        deviceVariantId: 'ref-a',
        workload: 'charging',
        metric: 'charge30mPercent',
        value: 70,
        unit: 'percent',
        sourceId: 'lab',
        evidenceKind: 'measured',
        testChargerWatts: 50,
        chargingStandard: 'USB PD/PPS',
      },
      {
        id: 'b-full',
        deviceVariantId: 'ref-b',
        workload: 'charging',
        metric: 'wiredFullChargeMinutes',
        value: 40,
        unit: 'minutes',
        sourceId: 'lab',
        evidenceKind: 'measured',
        testChargerWatts: 50,
        chargingStandard: 'USB PD/PPS',
      },
      {
        id: 'b-p30',
        deviceVariantId: 'ref-b',
        workload: 'charging',
        metric: 'charge30mPercent',
        value: 70,
        unit: 'percent',
        sourceId: 'lab',
        evidenceKind: 'measured',
        testChargerWatts: 50,
        chargingStandard: 'USB PD/PPS',
      },
    ],
  };
}

describe('charging Wh normalization', () => {
  it('scales charge time by battery energy when all selected references have energy evidence', () => {
    const result = estimateChargingFromCorpus(
      corpus(true),
      {
        batteryMah: 5000,
        batteryEnergyWh: 22,
        wiredChargingWatts: 50,
        chargingStandard: 'USB PD/PPS',
        limit: 5,
      },
    );

    expect(result.status).toBe('resolved');
    expect(
      result.estimate?.normalizationBasis,
    ).toBe('wh');

    expect(
      result.estimate?.timeTo100Minutes?.expected,
    ).toBeCloseTo(44, 8);

    expect(
      result.estimate?.normalized
        ?.expectedFullChargeWhPerMinute,
    ).toBeCloseTo(0.5, 8);
  });

  it('falls back to mAh scaling when any selected reference lacks accepted energy evidence', () => {
    const result = estimateChargingFromCorpus(
      corpus(false),
      {
        batteryMah: 5500,
        batteryEnergyWh: 22,
        wiredChargingWatts: 50,
        chargingStandard: 'USB PD/PPS',
        limit: 5,
      },
    );

    expect(result.status).toBe('resolved');
    expect(
      result.estimate?.normalizationBasis,
    ).toBe('mah');

    expect(
      result.estimate?.timeTo100Minutes?.expected,
    ).toBeCloseTo(44, 8);
  });
});
