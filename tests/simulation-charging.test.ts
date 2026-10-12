import { describe, expect, it } from 'vitest';
import {
  CHARGING_MODEL_VERSION,
  CHARGING_ACTIVE_REFERENCE_COUNT,
  CHARGING_REFERENCE_COUNT,
  simulateCharging,
} from '../src/lib/simulation/charging';

describe('v0.6.0 charging model', () => {
  it('ships a 100-plus-phone charging database', () => {
    expect(CHARGING_MODEL_VERSION).toBe('0.6.0');
    expect(CHARGING_REFERENCE_COUNT).toBe(140);
    expect(CHARGING_ACTIVE_REFERENCE_COUNT).toBe(132);
    expect(CHARGING_REFERENCE_COUNT).toBeGreaterThan(100);
  });

  it('returns the measured values for a matched reference phone', () => {
    const result = simulateCharging({
      deviceName: 'Samsung Galaxy S26 Ultra',
      batteryCapacityMah: 5000,
      wiredChargerW: 60,
    });

    expect(result.status).toBe('resolved');
    expect(result.estimate?.basis).toBe('matched-reference');
    expect(result.estimate?.charge30mPercent).toEqual({
      min: 78,
      max: 78,
    });
    expect(result.estimate?.timeTo100Minutes).toEqual({
      min: 49,
      max: 49,
    });
  });

  it('keeps future Samsung charging anchored to Samsung behavior', () => {
    const result = simulateCharging({
      deviceName: 'Samsung Galaxy S27 Ultra',
      batteryCapacityMah: 5700,
      wiredChargerW: 60,
    });

    expect(result.status).toBe('resolved');
    expect(result.estimate?.basis).toBe('reference-cohort');
    expect(result.estimate?.neighborIds).toContain('samsung_galaxy_s26_ultra');
    expect(result.estimate?.neighborIds).toContain('samsung_galaxy_s25_ultra');
    expect(result.estimate!.timeTo100Minutes.min).toBeGreaterThan(45);
    expect(result.estimate!.timeTo100Minutes.max).toBeLessThan(90);
  });

  it('estimates an unreleased concept from nearby released references', () => {
    const result = simulateCharging({
      deviceName: 'Future flagship',
      batteryCapacityMah: 6000,
      wiredChargerW: 80,
    });

    expect(result.status).toBe('resolved');
    expect(result.estimate?.basis).toBe('reference-cohort');
    expect(result.estimate?.referenceCount).toBe(7);
    expect(result.estimate?.neighborIds).toHaveLength(7);
    expect(result.estimate!.timeTo100Minutes.max).toBeGreaterThanOrEqual(
      result.estimate!.timeTo100Minutes.min,
    );
    expect(result.estimate!.timeTo80Minutes.max).toBeGreaterThanOrEqual(
      result.estimate!.timeTo80Minutes.min,
    );
  });

  it('requires only capacity and wired charger power', () => {
    const missingCapacity = simulateCharging({
      wiredChargerW: 60,
    });
    expect(missingCapacity.status).toBe('unresolved');
    expect(missingCapacity.unresolved?.code).toBe('MISSING_CAPACITY');

    const missingPower = simulateCharging({
      batteryCapacityMah: 5000,
    });
    expect(missingPower.status).toBe('unresolved');
    expect(missingPower.unresolved?.code).toBe('MISSING_CHARGER_POWER');
  });

  it('preserves taper: 80% takes longer than a linear 50-to-80 extension', () => {
    const result = simulateCharging({
      deviceName: 'Apple iPhone 17 Pro Max',
      batteryCapacityMah: 5088,
      wiredChargerW: 40,
    });

    expect(result.status).toBe('resolved');
    const estimate = result.estimate!;
    expect(estimate.timeTo80Minutes.min).toBeGreaterThan(
      estimate.timeTo50Minutes.min,
    );
    expect(estimate.timeTo100Minutes.min).toBeGreaterThan(
      estimate.timeTo80Minutes.min,
    );
  });

  it('rejects out-of-range phone inputs', () => {
    const result = simulateCharging({
      batteryCapacityMah: 50000,
      wiredChargerW: 1000,
    });

    expect(result.status).toBe('unresolved');
    expect(result.unresolved?.code).toBe('INVALID_INPUT');
  });
});
