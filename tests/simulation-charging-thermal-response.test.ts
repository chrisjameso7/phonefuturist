import { describe, expect, it } from 'vitest';
import {
  collectChargingThermalResponseEvidence,
  resolveChargingThermalResponse,
} from '../src/lib/simulation/modules/charging-thermal-response';
import { estimateChargingFromCorpus } from '../src/lib/simulation/modules/charging-corpus-estimator';
import type { DeviceCorpus } from '../src/lib/simulation/modules/device-corpus';

const corpus: DeviceCorpus = {
  version: 'thermal-charging-test',
  sources: [
    {
      id: 'lab',
      publisher: 'Lab',
      url: 'https://example.com',
      protocol: 'controlled charging',
      protocolVersion: '1',
    },
  ],
  devices: [
    {
      variant: {
        id: 'phone-a',
        identity: {
          manufacturer: 'Example',
          family: 'Phone A',
          modelName: 'Phone A',
        },
        battery: {
          capacityMah: 5000,
          typicalEnergyWh: 20,
          chemistry: 'silicon-carbon',
        },
      },
      charging: {
        advertisedWiredWatts: 50,
        cellArchitecture: 'single-cell',
      },
    },
    {
      variant: {
        id: 'phone-b',
        identity: {
          manufacturer: 'Example',
          family: 'Phone B',
          modelName: 'Phone B',
        },
        battery: {
          capacityMah: 5000,
          typicalEnergyWh: 20,
          chemistry: 'silicon-carbon',
        },
      },
      charging: {
        advertisedWiredWatts: 50,
        cellArchitecture: 'single-cell',
      },
    },
  ],
  measurements: [
    {
      id: 'a-25-full',
      deviceVariantId: 'phone-a',
      workload: 'charging',
      metric: 'wiredFullChargeMinutes',
      value: 40,
      unit: 'minutes',
      sourceId: 'lab',
      evidenceKind: 'measured',
      testChargerWatts: 50,
      chargingStandard: 'USB PD/PPS',
      ambientTemperatureC: 25,
    },
    {
      id: 'a-35-full',
      deviceVariantId: 'phone-a',
      workload: 'charging',
      metric: 'wiredFullChargeMinutes',
      value: 50,
      unit: 'minutes',
      sourceId: 'lab',
      evidenceKind: 'measured',
      testChargerWatts: 50,
      chargingStandard: 'USB PD/PPS',
      ambientTemperatureC: 35,
    },
    {
      id: 'a-25-p30',
      deviceVariantId: 'phone-a',
      workload: 'charging',
      metric: 'charge30mPercent',
      value: 70,
      unit: 'percent',
      sourceId: 'lab',
      evidenceKind: 'measured',
      testChargerWatts: 50,
      chargingStandard: 'USB PD/PPS',
      ambientTemperatureC: 25,
    },
    {
      id: 'b-25-full',
      deviceVariantId: 'phone-b',
      workload: 'charging',
      metric: 'wiredFullChargeMinutes',
      value: 40,
      unit: 'minutes',
      sourceId: 'lab',
      evidenceKind: 'measured',
      testChargerWatts: 50,
      chargingStandard: 'USB PD/PPS',
      ambientTemperatureC: 25,
    },
    {
      id: 'b-25-p30',
      deviceVariantId: 'phone-b',
      workload: 'charging',
      metric: 'charge30mPercent',
      value: 70,
      unit: 'percent',
      sourceId: 'lab',
      evidenceKind: 'measured',
      testChargerWatts: 50,
      chargingStandard: 'USB PD/PPS',
      ambientTemperatureC: 25,
    },
  ],
};

describe('charging thermal response', () => {
  it('learns only warmer-condition slowdown from same-device same-mode pairs', () => {
    const evidence =
      collectChargingThermalResponseEvidence(corpus);

    expect(evidence).toHaveLength(1);
    expect(evidence[0].deviceVariantId).toBe(
      'phone-a',
    );

    const response =
      resolveChargingThermalResponse(corpus, {
        targetAmbientTemperatureC: 35,
        referenceAmbientTemperatureC: 25,
        manufacturer: 'Example',
        batteryChemistry: 'silicon-carbon',
        cellArchitecture: 'single-cell',
      });

    expect(response.status).toBe('resolved');
    expect(response.timeScale).toBeCloseTo(
      1.25,
      8,
    );
    expect(response.confidence).toBeGreaterThan(0);
  });

  it('does not invent a cooler-condition speed bonus', () => {
    const response =
      resolveChargingThermalResponse(corpus, {
        targetAmbientTemperatureC: 20,
        referenceAmbientTemperatureC: 25,
      });

    expect(response.status).toBe('resolved');
    expect(response.timeScale).toBe(1);
  });

  it('slows full-charge timing for a warmer target while leaving p30 unmodified without early thermal evidence', () => {
    const cool = estimateChargingFromCorpus(
      corpus,
      {
        batteryMah: 5000,
        batteryEnergyWh: 20,
        wiredChargingWatts: 50,
        chargingStandard: 'USB PD/PPS',
        ambientTemperatureC: 25,
        limit: 5,
      },
    );

    const hot = estimateChargingFromCorpus(
      corpus,
      {
        batteryMah: 5000,
        batteryEnergyWh: 20,
        wiredChargingWatts: 50,
        chargingStandard: 'USB PD/PPS',
        ambientTemperatureC: 35,
        limit: 5,
      },
    );

    expect(cool.status).toBe('resolved');
    expect(hot.status).toBe('resolved');

    expect(
      hot.estimate?.timeTo100Minutes?.expected,
    ).toBeGreaterThan(
      cool.estimate?.timeTo100Minutes?.expected ??
        0,
    );

    expect(
      hot.estimate?.charge30mPercent?.expected,
    ).toBeCloseTo(
      cool.estimate?.charge30mPercent?.expected ??
        0,
      8,
    );

    expect(
      hot.estimate?.thermalResponse?.applied,
    ).toBe(true);
    expect(
      hot.estimate?.thermalResponse
        ?.adjustedReferenceModes,
    ).toBeGreaterThan(0);
  });

  it('does not label an ambient-mismatched exact device mode as measured-match', () => {
    const result = estimateChargingFromCorpus(
      corpus,
      {
        deviceVariantId: 'phone-a',
        batteryMah: 5000,
        batteryEnergyWh: 20,
        wiredChargingWatts: 50,
        chargingStandard: 'USB PD/PPS',
        ambientTemperatureC: 30,
        limit: 5,
      },
    );

    expect(result.status).toBe('resolved');
    expect(result.estimate?.evidenceMode).not.toBe(
      'measured-match',
    );
    expect(result.estimate?.basis).toBe(
      'weighted-comparable-corpus',
    );
  });

  it('stays neutral when no multi-temperature pair exists', () => {
    const noPair: DeviceCorpus = {
      ...corpus,
      measurements: corpus.measurements.filter(
        (measurement) =>
          measurement.id !== 'a-35-full',
      ),
    };

    const response =
      resolveChargingThermalResponse(noPair, {
        targetAmbientTemperatureC: 35,
        referenceAmbientTemperatureC: 25,
      });

    expect(response.status).toBe('unresolved');
    expect(response.timeScale).toBe(1);
  });
});
