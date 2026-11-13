import { describe, expect, it } from 'vitest';
import { expandSimpleMode } from '../src/lib/simulation/simple-mode';

describe('Simple Mode translation', () => {
  it('maps friendly presets into one canonical advanced simulation input', () => {
    const result = expandSimpleMode({
      name: 'Future Ultra',
      manufacturer: 'Example',
      batteryMah: 5700,
      wiredChargingWatts: 60,
      displayDiagonalInches: 6.9,
      displayResolution: 'qhd',
      refreshRateHz: 120,
      socVendor: 'Qualcomm',
      socName: 'Snapdragon 8 Elite Gen 5',
      cooling: 'large-vc',
      mainCamera: {
        sensorFormatDenominator: 1.3,
        resolutionMp: 200,
        apertureFNumber: 1.7,
        equivalentFocalLengthMm: 24,
      },
    });

    expect(result.simulationInput.displays.primary).toMatchObject({
      diagonalInches: 6.9,
      resolutionWidthPx: 1440,
      resolutionHeightPx: 3200,
      refreshRateHz: 120,
      aspectWidth: 9,
      aspectHeight: 20,
    });

    expect(
      result.simulationInput.battery?.cells[0].capacityMah,
    ).toBe(5700);

    expect(result.advanced).toMatchObject({
      manufacturer: 'Example',
      batteryMah: 5700,
      wiredChargingWatts: 60,
      socVendor: 'Qualcomm',
      socName: 'Snapdragon 8 Elite Gen 5',
      coolingClass: 'large-vapor-chamber',
    });

    expect(result.simulationInput.cameras).toHaveLength(1);
    expect(result.simulationInput.cameras?.[0]).toMatchObject({
      type: 'wide',
      sensorFormatDenominator: 1.3,
      resolutionMp: 200,
      apertureFNumber: 1.7,
      equivalentFocalLengthMm: 24,
    });
  });

  it('maps the FHD preset without pretending it is an exact panel resolution', () => {
    const result = expandSimpleMode({
      batteryMah: 5000,
      displayDiagonalInches: 6.5,
      displayResolution: 'fhd',
      refreshRateHz: 120,
      cooling: 'good',
    });

    expect(result.simulationInput.displays.primary).toMatchObject({
      resolutionWidthPx: 1080,
      resolutionHeightPx: 2400,
    });

    expect(
      result.assumptions.find(
        (assumption) =>
          assumption.code ===
          'DISPLAY_RESOLUTION_PRESET',
      )?.message,
    ).toContain('workload preset');
  });

  it('only adds telephoto when explicitly enabled and specified', () => {
    const result = expandSimpleMode({
      batteryMah: 5000,
      displayDiagonalInches: 6.7,
      displayResolution: 'fhd',
      refreshRateHz: 120,
      cooling: 'basic',
      mainCamera: {
        resolutionMp: 50,
      },
      telephoto: {
        enabled: true,
        resolutionMp: 50,
        apertureFNumber: 2.8,
        equivalentFocalLengthMm: 120,
      },
    });

    expect(result.simulationInput.cameras).toHaveLength(2);
    expect(result.simulationInput.cameras?.[1].type).toBe(
      'telephoto',
    );
  });

  it('does not invent packaging dimensions or thermal constants', () => {
    const result = expandSimpleMode({
      batteryMah: 5000,
      displayDiagonalInches: 6.7,
      displayResolution: 'fhd',
      refreshRateHz: 120,
      cooling: 'large-vc',
    });

    expect(result.simulationInput.dimensions).toBeUndefined();
    expect(result.simulationInput.packaging).toBeUndefined();

    expect(result.advanced.coolingClass).toBe(
      'large-vapor-chamber',
    );
  });

  it('rejects invalid core inputs instead of silently repairing them', () => {
    expect(() =>
      expandSimpleMode({
        batteryMah: 0,
        displayDiagonalInches: 6.7,
        displayResolution: 'fhd',
        refreshRateHz: 120,
        cooling: 'good',
      }),
    ).toThrow(/battery capacity/i);

    expect(() =>
      expandSimpleMode({
        batteryMah: 5000,
        displayDiagonalInches: 6.7,
        displayResolution: 'fhd',
        refreshRateHz: 0,
        cooling: 'good',
      }),
    ).toThrow(/refresh rate/i);
  });
});


describe('Simple brightness scenario handoff', () => {
  const input = { batteryMah: 5500, displayDiagonalInches: 6.8,
    displayResolution: 'qhd' as const, refreshRateHz: 120, cooling: 'large-vc' as const };
  it('preserves explicit brightness for the advanced battery and display adapters', () => {
    expect(expandSimpleMode({ ...input, brightnessNits: 800 }).advanced.brightnessNits).toBe(800);
  });
  it('keeps reference conditions unspecified instead of inventing a lab brightness', () => {
    expect(expandSimpleMode(input).advanced).not.toHaveProperty('brightnessNits');
  });
  it.each([0, -1, NaN, Infinity])('rejects invalid explicit brightness %s', brightnessNits => {
    expect(() => expandSimpleMode({ ...input, brightnessNits })).toThrow('brightness must be positive');
  });
});
