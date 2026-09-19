import { describe, expect, it } from 'vitest';

import {
  SIMULATION_ENGINE_VERSION,
  simulateDevice,
} from '../src/lib/simulation/engine';

describe('simulation engine', () => {
  it('calculates portrait phone display geometry correctly', () => {
    const result = simulateDevice({
      formFactor: 'phone',
      name: 'PhoneFuturist Test Device',

      dimensions: {
        widthMm: 75,
        heightMm: 160,
      },

      displays: {
        primary: {
          diagonalInches: 6.7,
          aspectWidth: 9,
          aspectHeight: 20,
          resolutionWidthPx: 1080,
          resolutionHeightPx: 2400,
          bezelTopMm: 1.5,
          bezelRightMm: 1.5,
          bezelBottomMm: 1.5,
          bezelLeftMm: 1.5,
        },
      },
    });

    expect(result.engineVersion).toBe(
      SIMULATION_ENGINE_VERSION,
    );

    expect(result.engineVersion).toBe('0.4.0');
    expect(result.formFactor).toBe('phone');

    const display = result.displays.primary;

    expect(display.widthMm).toBeCloseTo(69.8359, 4);
    expect(display.heightMm).toBeCloseTo(155.1908, 4);
    expect(display.areaMm2).toBeCloseTo(10837.8832, 4);
    expect(display.ppi).toBeCloseTo(392.8068, 4);
    expect(display.aspectRatio).toBeCloseTo(0.45, 4);

    expect(display.estimatedDeviceWidthMm).toBeCloseTo(
      72.8359,
      4,
    );

    expect(display.estimatedDeviceHeightMm).toBeCloseTo(
      158.1908,
      4,
    );

    expect(display.screenToBodyRatio).toBeCloseTo(
      90.3157,
      4,
    );

    expect(result.battery).toBeUndefined();
    expect(result.cameras).toBeUndefined();
    expect(result.packaging).toBeUndefined();
    expect(result.warnings).toEqual([]);
  });

  it('runs display and battery modules in the same simulation', () => {
    const result = simulateDevice({
      formFactor: 'phone',

      dimensions: {
        widthMm: 75,
        heightMm: 160,
        thicknessMm: 8,
        weightG: 190,
      },

      displays: {
        primary: {
          diagonalInches: 6.7,
          aspectWidth: 9,
          aspectHeight: 20,
          resolutionWidthPx: 1080,
          resolutionHeightPx: 2400,
        },
      },

      battery: {
        cells: [
          {
            capacityMah: 5000,
            nominalVoltageV: 3.85,
            widthMm: 60,
            heightMm: 80,
            thicknessMm: 5,
            weightG: 70,
          },
        ],
      },
    });

    expect(result.displays.primary.ppi).toBeCloseTo(
      392.8068,
      4,
    );

    expect(result.battery?.cellCount).toBe(1);
    expect(result.battery?.totalCapacityMah).toBe(5000);

    expect(result.battery?.totalEnergyWh).toBeCloseTo(
      19.25,
      6,
    );

    expect(result.battery?.totalVolumeMm3).toBe(24000);

    expect(result.packaging).toBeUndefined();
    expect(result.warnings).toEqual([]);
  });

  it('calculates multiple camera modules independently', () => {
    const result = simulateDevice({
      formFactor: 'phone',

      displays: {
        primary: {},
      },

      cameras: [
        {
          type: 'wide',
          sensorFormatDenominator: 1.3,
          physicalFocalLengthMm: 6.5,
          equivalentFocalLengthMm: 24,
          apertureFNumber: 1.6,
          moduleWidthMm: 20,
          moduleHeightMm: 20,
          moduleDepthMm: 6,
        },
        {
          type: 'periscope',
          sensorFormatDenominator: 2.5,
          physicalFocalLengthMm: 20,
          equivalentFocalLengthMm: 120,
          apertureFNumber: 2.8,
          moduleWidthMm: 20,
          moduleHeightMm: 15,
          moduleDepthMm: 6,
        },
      ],
    });

    expect(result.cameras).toHaveLength(2);

    expect(
      result.cameras?.[0].approximateSensorDiagonalMm,
    ).toBeCloseTo(12.307692, 6);

    expect(
      result.cameras?.[0].moduleVolumeMm3,
    ).toBe(2400);

    expect(
      result.cameras?.[1].cropFactor,
    ).toBeCloseTo(6, 6);

    expect(
      result.cameras?.[1].moduleVolumeMm3,
    ).toBe(1800);

    expect(result.warnings).toEqual([]);
  });

  it('passes calculated battery and camera volumes into packaging automatically', () => {
    const result = simulateDevice({
      formFactor: 'phone',

      dimensions: {
        widthMm: 75,
        heightMm: 160,
        thicknessMm: 8,
      },

      displays: {
        primary: {},
      },

      battery: {
        cells: [
          {
            capacityMah: 5000,
            nominalVoltageV: 3.85,
            widthMm: 60,
            heightMm: 80,
            thicknessMm: 5,
          },
        ],
      },

      cameras: [
        {
          type: 'wide',
          moduleWidthMm: 20,
          moduleHeightMm: 20,
          moduleDepthMm: 6,
        },
        {
          type: 'periscope',
          moduleWidthMm: 20,
          moduleHeightMm: 15,
          moduleDepthMm: 6,
        },
      ],

      packaging: {
        reservedVolumePercent: 20,

        componentVolumes: {
          thermalMm3: 4000,
          boardMm3: 12000,
          speakersMm3: 5000,
          otherMm3: 7000,
        },
      },
    });

    expect(result.battery?.totalVolumeMm3).toBe(24000);

    expect(
      result.cameras?.[0].moduleVolumeMm3,
    ).toBe(2400);

    expect(
      result.cameras?.[1].moduleVolumeMm3,
    ).toBe(1800);

    expect(
      result.packaging?.externalVolumeMm3,
    ).toBe(96000);

    expect(
      result.packaging?.availableInternalVolumeMm3,
    ).toBe(76800);

    // 24,000 battery
    // + 4,200 cameras
    // + 4,000 thermal
    // + 12,000 board
    // + 5,000 speakers
    // + 7,000 other
    // = 56,200 mm³
    expect(
      result.packaging?.knownComponentVolumeMm3,
    ).toBe(56200);

    expect(
      result.packaging?.remainingVolumeMm3,
    ).toBe(20600);

    expect(
      result.packaging?.batteryVolumePercent,
    ).toBeCloseTo(31.25, 6);

    expect(
      result.packaging?.fitsAvailableVolume,
    ).toBe(true);

    expect(result.warnings).toEqual([]);
  });

  it('does not invent camera packaging volume when module dimensions are unknown', () => {
    const result = simulateDevice({
      formFactor: 'phone',

      dimensions: {
        widthMm: 75,
        heightMm: 160,
        thicknessMm: 8,
      },

      displays: {
        primary: {},
      },

      cameras: [
        {
          type: 'wide',
          sensorFormatDenominator: 1.3,
          resolutionMp: 50,
          equivalentFocalLengthMm: 24,
          apertureFNumber: 1.6,
        },
      ],

      packaging: {
        reservedVolumePercent: 20,
      },
    });

    expect(
      result.cameras?.[0].approximateSensorDiagonalMm,
    ).toBeCloseTo(12.307692, 6);

    expect(
      result.cameras?.[0].moduleVolumeMm3,
    ).toBeUndefined();

    expect(
      result.packaging?.knownComponentVolumeMm3,
    ).toBeUndefined();

    expect(
      result.packaging?.fitsAvailableVolume,
    ).toBeUndefined();

    expect(result.warnings).toEqual([]);
  });

  it('detects a cross-module packaging volume overflow', () => {
    const result = simulateDevice({
      formFactor: 'phone',

      dimensions: {
        widthMm: 75,
        heightMm: 160,
        thicknessMm: 8,
      },

      displays: {
        primary: {},
      },

      battery: {
        cells: [
          {
            capacityMah: 5000,
            nominalVoltageV: 3.85,
            widthMm: 60,
            heightMm: 80,
            thicknessMm: 5,
          },
        ],
      },

      cameras: [
        {
          type: 'wide',
          moduleWidthMm: 30,
          moduleHeightMm: 30,
          moduleDepthMm: 10,
        },
      ],

      packaging: {
        reservedVolumePercent: 20,

        componentVolumes: {
          boardMm3: 45000,
        },
      },
    });

    // Available: 76,800 mm³
    // Battery: 24,000
    // Camera: 9,000
    // Board: 45,000
    // Known total: 78,000
    expect(
      result.packaging?.knownComponentVolumeMm3,
    ).toBe(78000);

    expect(
      result.packaging?.availableInternalVolumeMm3,
    ).toBe(76800);

    expect(
      result.packaging?.remainingVolumeMm3,
    ).toBe(-1200);

    expect(
      result.packaging?.fitsAvailableVolume,
    ).toBe(false);

    expect(result.warnings).toContainEqual({
      code: 'PACKAGING_VOLUME_EXCEEDED',
      message:
        'Known component volume exceeds the calculated available internal device volume.',
    });
  });

  it('does not invent values when inputs are missing', () => {
    const result = simulateDevice({
      formFactor: 'phone',

      displays: {
        primary: {},
      },
    });

    expect(result.engineVersion).toBe(
      SIMULATION_ENGINE_VERSION,
    );

    expect(result.displays.primary).toEqual({});
    expect(result.battery).toBeUndefined();
    expect(result.cameras).toBeUndefined();
    expect(result.packaging).toBeUndefined();
    expect(result.warnings).toEqual([]);
  });

  it('warns instead of calculating invalid display geometry', () => {
    const result = simulateDevice({
      formFactor: 'phone',

      displays: {
        primary: {
          diagonalInches: -6.7,
          aspectWidth: 9,
          aspectHeight: 20,
        },
      },
    });

    expect(
      result.displays.primary.widthMm,
    ).toBeUndefined();

    expect(
      result.displays.primary.heightMm,
    ).toBeUndefined();

    expect(result.warnings).toContainEqual({
      code: 'INVALID_DISPLAY_GEOMETRY',
      message:
        'Display diagonal and aspect ratio must contain positive finite values.',
    });
  });

  it('propagates battery warnings through the main engine', () => {
    const result = simulateDevice({
      formFactor: 'phone',

      displays: {
        primary: {},
      },

      battery: {
        cells: [
          {
            capacityMah: 5000,
            nominalVoltageV: 3.85,
            widthMm: 60,
            heightMm: 80,
          },
        ],
      },
    });

    expect(result.battery).toBeDefined();

    expect(result.warnings).toContainEqual({
      code: 'INCOMPLETE_BATTERY_DIMENSIONS',
      message:
        'Battery cell 1 requires width, height, and thickness to calculate volume.',
    });
  });

  it('propagates camera warnings through the main engine', () => {
    const result = simulateDevice({
      formFactor: 'phone',

      displays: {
        primary: {},
      },

      cameras: [
        {
          type: 'periscope',
          moduleWidthMm: 20,
          moduleHeightMm: 15,
        },
      ],
    });

    expect(result.cameras).toHaveLength(1);

    expect(result.warnings).toContainEqual({
      code: 'INCOMPLETE_CAMERA_MODULE_DIMENSIONS',
      message:
        'Camera module width, height, and depth are all required to calculate module volume.',
    });
  });
});