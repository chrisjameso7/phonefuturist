import { describe, expect, it } from 'vitest';
import { batteryEnergyWh, runtimeHours, usableEnergyWh } from '../src/lib/simulation/live-kernel';

describe('Interactive Leaks live math kernel', () => {
  it('converts explicit battery capacity and voltage to Wh exactly', () => {
    expect(batteryEnergyWh(5700, 3.85)).toBeCloseTo(21.945, 10);
  });

  it('never invents missing or invalid battery inputs', () => {
    expect(batteryEnergyWh(undefined, 3.85)).toBeUndefined();
    expect(batteryEnergyWh(5700, undefined)).toBeUndefined();
    expect(batteryEnergyWh(-1, 3.85)).toBeUndefined();
  });

  it('applies only an explicit usable-energy percentage', () => {
    expect(usableEnergyWh(20, 95)).toBe(19);
    expect(usableEnergyWh(20, undefined)).toBeUndefined();
    expect(usableEnergyWh(20, 101)).toBeUndefined();
  });

  it('derives runtime only from explicit usable energy and whole-device power', () => {
    expect(runtimeHours(20, 5)).toBe(4);
    expect(runtimeHours(20, undefined)).toBeUndefined();
    expect(runtimeHours(20, 0)).toBeUndefined();
  });
});
