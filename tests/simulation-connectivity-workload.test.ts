import { describe, expect, it } from 'vitest';
import {
  calculateConnectivityWorkload,
} from '../src/lib/simulation/modules/connectivity-workload';

describe('connectivity workload model', () => {
  it('calculates transfer volume, utilization and explicit radio energy', () => {
    const result =
      calculateConnectivityWorkload({
        mode: '5g-sub6',
        downloadMbps: 100,
        uploadMbps: 20,
        linkCapacityMbps: 300,
        sessionDurationMinutes: 30,
        radioPowerW: 2.4,
        activeDutyFraction: 0.5,
      });

    expect(result.status).toBe('resolved');
    expect(
      result.aggregateTrafficMbps,
    ).toBe(120);
    expect(
      result.throughputUtilizationPercent,
    ).toBeCloseTo(40, 8);
    expect(
      result.totalTransferredDataGb,
    ).toBeCloseTo(27, 8);
    expect(
      result.effectiveRadioPowerW,
    ).toBeCloseTo(1.2, 8);
    expect(
      result.radioEnergyWh,
    ).toBeCloseTo(0.6, 8);
  });

  it('preserves signed signal metadata without turning it into a hidden power multiplier', () => {
    const result =
      calculateConnectivityWorkload({
        mode: 'lte',
        signalMetricLabel: 'RSRP dBm',
        signalMetricValue: -105,
        downloadMbps: 20,
      });

    expect(result.signalMetricValue).toBe(
      -105,
    );
    expect(result.radioPowerW).toBeUndefined();
    expect(result.radioEnergyWh).toBeUndefined();
    expect(result.note).toContain(
      'do not create hidden power multipliers',
    );
  });

  it('flags requested traffic above explicit link capacity', () => {
    const result =
      calculateConnectivityWorkload({
        mode: 'wifi',
        downloadMbps: 800,
        uploadMbps: 200,
        linkCapacityMbps: 900,
      });

    expect(result.capacityExceeded).toBe(
      true,
    );
    expect(
      result.throughputUtilizationPercent,
    ).toBeGreaterThan(100);
  });
});
