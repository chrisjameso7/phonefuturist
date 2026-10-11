import { describe, expect, it } from 'vitest';
import {
  calculateBatteryAgingRuntime,
} from '../src/lib/simulation/modules/battery-aging-runtime';

describe('battery aging runtime impact', () => {
  it('scales runtime with retained energy under a fixed-drain assumption', () => {
    const result =
      calculateBatteryAgingRuntime({
        baselineRuntimeHours: 20,
        retainedEnergyFraction: 0.8,
      });

    expect(result.status).toBe('resolved');
    expect(result.agedRuntimeHours).toBe(16);
    expect(result.runtimeDeltaHours).toBe(-4);
    expect(result.runtimeDeltaPercent).toBe(-20);
  });

  it('fails closed without retained energy', () => {
    const result =
      calculateBatteryAgingRuntime({
        baselineRuntimeHours: 20,
      });

    expect(result.status).toBe('unresolved');
    expect(result.agedRuntimeHours).toBeUndefined();
  });
});
