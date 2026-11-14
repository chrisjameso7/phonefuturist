import { describe, expect, it } from 'vitest';
import { resolveChargingThermalContext } from '../src/lib/simulation/modules/charging-thermal-context';
import type { CorpusMeasurement } from '../src/lib/simulation/modules/device-corpus';

const measurements: CorpusMeasurement[] = [
  {
    id: 'cool',
    deviceVariantId: 'phone',
    workload: 'charging',
    metric: 'wiredFullChargeMinutes',
    value: 50,
    unit: 'minutes',
    sourceId: 'lab',
    evidenceKind: 'measured',
    ambientTemperatureC: 23,
  },
  {
    id: 'warm',
    deviceVariantId: 'phone',
    workload: 'charging',
    metric: 'wiredFullChargeMinutes',
    value: 56,
    unit: 'minutes',
    sourceId: 'lab',
    evidenceKind: 'measured',
    ambientTemperatureC: 30,
  },
];

describe('charging thermal context', () => {
  it('prefers nearby measured ambient conditions', () => {
    const result = resolveChargingThermalContext(measurements, {
      ambientTemperatureC: 29,
    });

    expect(result.status).toBe('resolved');
    expect(result.matchedMeasurementIds).toContain('warm');
    expect(result.confidenceMultiplier).toBe(1);
  });

  it('reduces confidence when ambient metadata is missing', () => {
    const result = resolveChargingThermalContext(
      measurements.map(({ ambientTemperatureC: _ambient, ...rest }) => rest),
      { ambientTemperatureC: 35 },
    );

    expect(result.status).toBe('unresolved');
    expect(result.confidenceMultiplier).toBeLessThan(1);
  });
});
