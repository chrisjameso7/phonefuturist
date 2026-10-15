import { describe, expect, it } from 'vitest';
import { estimateMatchedSocRuntimeDelta, estimateMatchedSocBatteryScenario } from
  '../src/lib/simulation/modules/soc-runtime-delta';
import { simulateBatteryExperience } from
  '../src/lib/simulation/modules/battery-experience-engine';
import type { DeviceCorpus } from '../src/lib/simulation/modules/device-corpus';
import type { SimulationInput } from '../src/lib/simulation/types';

const pack: SimulationInput = {
  formFactor: 'phone',
  displays: { primary: { diagonalInches: 6.7 } },
  battery: { cells: [{ capacityMah: 5000, nominalVoltageV: 4 }] },
};

const corpus: DeviceCorpus = {
  version: 'matched-soc-power-test',
  sources: [{
    id: 'lab',
    publisher: 'Reference lab',
    url: 'https://example.com/reference',
    protocol: 'same-200-nit-gaming-test',
    protocolVersion: 'v1',
  }],
  devices: [
    {
      variant: {
        id: 'ref-one',
        identity: { manufacturer: 'Example', family: 'X', modelName: 'One' },
        battery: { capacityMah: 5000, typicalEnergyWh: 20 },
        soc: { vendor: 'Samsung', name: 'Exynos 2600' },
      },
      display: { diagonalInches: 6.7 },
    },
    {
      variant: {
        id: 'ref-two',
        identity: { manufacturer: 'Example', family: 'X', modelName: 'Two' },
        battery: { capacityMah: 5000, typicalEnergyWh: 20 },
        soc: { vendor: 'Samsung', name: 'Exynos 2600' },
      },
      display: { diagonalInches: 6.7 },
    },
  ],
  measurements: [
    {
      id: 'r1', deviceVariantId: 'ref-one', workload: 'gaming',
      metric: 'runtime', value: 8, unit: 'hours', sourceId: 'lab', evidenceKind: 'measured',
    },
    {
      id: 'r2', deviceVariantId: 'ref-two', workload: 'gaming',
      metric: 'runtime', value: 8, unit: 'hours', sourceId: 'lab', evidenceKind: 'measured',
    },
  ],
};

const query = {
  referenceSocName: 'Exynos 2600',
  protocol: 'steelNomadLight' as const,
  workload: 'gaming' as const,
  targetBenchmarkScore: 2200,
  activeDutyFraction: 0.3,
};

describe('measured SoC delta into phone runtime', () => {
  it('compares chips at one benchmark score without adding whole board power twice', () => {
    const delta = estimateMatchedSocRuntimeDelta({
      ...query, targetSocName: 'Snapdragon 8 Elite Gen 5',
    });
    expect(delta.status).toBe('scenario');
    if (delta.status !== 'scenario') return;
    expect(delta.deltaWholePhonePowerW).toBeCloseTo(
      (delta.targetBoardPowerW - delta.referenceBoardPowerW) * 0.3, 8,
    );
    const result = estimateMatchedSocBatteryScenario(
      corpus, pack, 'Snapdragon 8 Elite Gen 5', query,
    );
    expect(result.status).toBe('scenario');
    if (result.status !== 'scenario') return;
    expect(result.referenceRuntimeHours).toBeCloseTo(8, 8);
    expect(result.scenarioRuntimeHours).toBeCloseTo(
      20 / (2.5 + delta.deltaWholePhonePowerW), 8,
    );
    expect(result.independentReferencePhones).toBe(2);
    expect(result.energyBasis).toBe('wh');
  });

  it('does not invent 2700 measurements or cross benchmark domains', () => {
    const future = estimateMatchedSocRuntimeDelta({
      ...query, targetSocName: 'Exynos 2700',
    });
    expect(future.status).toBe('unresolved');
    const mismatched = estimateMatchedSocRuntimeDelta({
      ...query, targetSocName: 'Snapdragon 8 Elite Gen 5',
      protocol: 'geekbench6',
    });
    expect(mismatched.status).toBe('unresolved');
  });

  it('withholds comparison when battery Wh evidence or peer independence is absent', () => {
    const withoutVoltage: SimulationInput = {
      ...pack, battery: { cells: [{ capacityMah: 5000 }] },
    };
    expect(estimateMatchedSocBatteryScenario(
      corpus, withoutVoltage, 'Snapdragon 8 Elite Gen 5', query,
    ).status).toBe('unresolved');

    const onePhone: DeviceCorpus = {
      ...corpus,
      devices: corpus.devices.slice(0, 1),
      measurements: corpus.measurements.slice(0, 1),
    };
    expect(estimateMatchedSocBatteryScenario(
      onePhone, pack, 'Snapdragon 8 Elite Gen 5', query,
    ).status).toBe('unresolved');
  });

  it('exposes opt-in comparison separately from the stable headline battery result', () => {
    const baseline = simulateBatteryExperience(corpus, {
      simulation: pack, socName: 'Snapdragon 8 Elite Gen 5',
      dailyUseHours: { gaming: 1 },
    });
    const scenario = simulateBatteryExperience(corpus, {
      simulation: pack, socName: 'Snapdragon 8 Elite Gen 5',
      dailyUseHours: { gaming: 1 },
      measuredSocComparison: query,
    });
    expect(scenario.measuredSocComparison?.status).toBe('scenario');
    expect(scenario.mixedUse?.expectedActiveUseHoursPerCharge)
      .toBeCloseTo(baseline.mixedUse!.expectedActiveUseHoursPerCharge, 8);
    expect(scenario.runtimes.map(row => row.expectedHours))
      .toEqual(baseline.runtimes.map(row => row.expectedHours));
  });
});
