import { describe, expect, it } from 'vitest';
import {
  collectChargingPowerResponseEvidence,
  resolveChargingPowerResponse,
  chargingTimePowerScale,
} from '../src/lib/simulation/modules/charging-power-response';
import { buildChargingModeCorpus } from '../src/lib/simulation/modules/charging-mode-corpus';

describe('charging power response', () => {
  it('derives diminishing-return evidence from same-device charger tests', () => {
    const corpus = buildChargingModeCorpus();
    const evidence = collectChargingPowerResponseEvidence(corpus);

    expect(
      evidence.some(
        (row) =>
          row.deviceVariantId === 'oppo-find-x9-pro-global-7500' &&
          row.lowWatts === 55 &&
          row.highWatts === 80 &&
          row.lowFullChargeMinutes === 80 &&
          row.highFullChargeMinutes === 67,
      ),
    ).toBe(true);
  });

  it('resolves a non-linear local elasticity', () => {
    const corpus = buildChargingModeCorpus();
    const response = resolveChargingPowerResponse(corpus, {
      manufacturer: 'Oppo',
      targetWatts: 60,
    });

    expect(response.status).toBe('resolved');
    expect(response.elasticity).toBeGreaterThan(0);
    expect(response.elasticity).toBeLessThan(1);
  });

  it('does not learn fake adapter-rating elasticity when measured phone peak power is unchanged', () => {
    const corpus = {
      version: 'measured-peak-test',
      sources: [
        {
          id: 'lab',
          publisher: 'Lab',
          url: 'https://example.com',
          sourceRole: 'measurement-lab' as const,
        },
      ],
      devices: [
        {
          variant: {
            id: 'phone',
            identity: {
              manufacturer: 'Example',
              family: 'Phone',
              modelName: 'Phone',
            },
          },
          sourceIds: ['lab'],
        },
      ],
      measurements: [
        {
          id: '40w-full',
          deviceVariantId: 'phone',
          workload: 'charging' as const,
          metric: 'fullChargeMinutes',
          value: 91,
          unit: 'minutes',
          sourceId: 'lab',
          evidenceKind: 'measured' as const,
          testChargerWatts: 40,
          measuredPeakWatts: 36.7,
        },
        {
          id: '140w-full',
          deviceVariantId: 'phone',
          workload: 'charging' as const,
          metric: 'fullChargeMinutes',
          value: 89,
          unit: 'minutes',
          sourceId: 'lab',
          evidenceKind: 'measured' as const,
          testChargerWatts: 140,
          measuredPeakWatts: 37,
        },
      ],
    };

    const evidence =
      collectChargingPowerResponseEvidence(
        corpus,
      );

    expect(evidence).toEqual([]);
  });

  it('does not treat a doubling of watts as a halving of time', () => {
    const scale = chargingTimePowerScale(60, 120, 0.35);
    expect(scale).toBeGreaterThan(0.5);
    expect(scale).toBeLessThan(1);
  });
});
