import { describe, expect, it } from 'vitest';

import {
  calculatePackaging,
} from '../src/lib/simulation/modules/packaging';

describe('packaging simulation module', () => {
  it('calculates available internal volume correctly', () => {
    const calculation = calculatePackaging({
      widthMm: 75,
      heightMm: 160,
      thicknessMm: 8,
      reservedVolumePercent: 20,
    });

    const packaging = calculation.result;

    expect(packaging.externalVolumeMm3).toBe(96000);
    expect(packaging.externalVolumeCm3).toBe(96);

    expect(packaging.reservedVolumeMm3).toBe(19200);

    expect(packaging.availableInternalVolumeMm3).toBe(76800);
    expect(packaging.availableInternalVolumeCm3).toBe(76.8);

    expect(calculation.warnings).toEqual([]);
  });

  it('calculates component usage and remaining volume', () => {
    const calculation = calculatePackaging({
      widthMm: 75,
      heightMm: 160,
      thicknessMm: 8,
      reservedVolumePercent: 20,

      componentVolumes: {
        batteryMm3: 24000,
        cameraMm3: 8000,
        thermalMm3: 4000,
        boardMm3: 12000,
        speakersMm3: 5000,
        otherMm3: 7000,
      },
    });

    const packaging = calculation.result;

    expect(packaging.availableInternalVolumeMm3).toBe(76800);

    expect(packaging.knownComponentVolumeMm3).toBe(60000);
    expect(packaging.knownComponentVolumeCm3).toBe(60);

    expect(packaging.remainingVolumeMm3).toBe(16800);
    expect(packaging.remainingVolumeCm3).toBe(16.8);

    expect(packaging.usedInternalVolumePercent).toBeCloseTo(
      78.125,
      6,
    );

    expect(
      packaging.remainingInternalVolumePercent,
    ).toBeCloseTo(21.875, 6);

    expect(packaging.batteryVolumePercent).toBeCloseTo(
      31.25,
      6,
    );

    expect(
      packaging.componentVolumePercent?.battery,
    ).toBeCloseTo(31.25, 6);
    expect(
      packaging.componentVolumePercent?.camera,
    ).toBeCloseTo(10.4166667, 6);
    expect(packaging.largestKnownComponent).toMatchObject({
      component: 'battery',
      volumeMm3: 24000,
    });
    expect(
      packaging.minimumAggregateThicknessMm,
    ).toBeCloseTo(6.25, 6);
    expect(
      packaging.aggregateThicknessHeadroomMm,
    ).toBeCloseTo(1.75, 6);
    expect(packaging.packagingPressure).toBe('constrained');
    expect(
      packaging.thinnerByHalfMm?.targetThicknessMm,
    ).toBeCloseTo(7.5, 6);
    expect(
      packaging.thinnerByHalfMm?.lostAvailableVolumeCm3,
    ).toBeCloseTo(4.8, 6);
    expect(
      packaging.thinnerByHalfMm?.remainingVolumeCm3,
    ).toBeCloseTo(12, 6);
    expect(
      packaging.thinnerByHalfMm?.usedInternalVolumePercent,
    ).toBeCloseTo(83.3333333, 6);
    expect(
      packaging.thinnerByHalfMm?.fitsAvailableVolume,
    ).toBe(true);

    expect(packaging.componentGrowthSensitivity).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          component: 'battery',
          growthPercent: 10,
        }),
        expect.objectContaining({
          component: 'camera',
          growthPercent: 10,
        }),
        expect.objectContaining({
          component: 'thermal',
          growthPercent: 10,
        }),
      ]),
    );

    const batteryGrowth =
      packaging.componentGrowthSensitivity?.find(
        (row) => row.component === 'battery',
      );

    expect(batteryGrowth?.addedVolumeCm3).toBeCloseTo(2.4, 6);
    expect(batteryGrowth?.remainingVolumeCm3).toBeCloseTo(14.4, 6);
    expect(batteryGrowth?.fitsAvailableVolume).toBe(true);

    expect(packaging.fitsAvailableVolume).toBe(true);
    expect(calculation.warnings).toEqual([]);
  });

  it('detects when known components exceed available volume', () => {
    const calculation = calculatePackaging({
      widthMm: 75,
      heightMm: 160,
      thicknessMm: 8,
      reservedVolumePercent: 20,

      componentVolumes: {
        batteryMm3: 50000,
        cameraMm3: 20000,
        boardMm3: 15000,
      },
    });

    const packaging = calculation.result;

    expect(packaging.knownComponentVolumeMm3).toBe(85000);
    expect(packaging.remainingVolumeMm3).toBe(-8200);
    expect(packaging.fitsAvailableVolume).toBe(false);

    expect(calculation.warnings).toContainEqual({
      code: 'PACKAGING_VOLUME_EXCEEDED',
      message:
        'Known component volume exceeds the calculated available internal device volume.',
    });
  });

  it('warns when device dimensions are incomplete', () => {
    const calculation = calculatePackaging({
      widthMm: 75,
      heightMm: 160,
    });

    expect(
      calculation.result.externalVolumeMm3,
    ).toBeUndefined();

    expect(calculation.warnings).toContainEqual({
      code: 'INCOMPLETE_DEVICE_DIMENSIONS',
      message:
        'Device width, height, and thickness are all required to calculate packaging volume.',
    });
  });

  it('rejects invalid reserved volume percentages', () => {
    const calculation = calculatePackaging({
      widthMm: 75,
      heightMm: 160,
      thicknessMm: 8,
      reservedVolumePercent: 120,
    });

    expect(calculation.warnings).toContainEqual({
      code: 'INVALID_RESERVED_VOLUME_PERCENT',
      message:
        'Reserved volume percentage must be a finite value from 0 to 100.',
    });
  });

  it('rejects negative component volumes', () => {
    const calculation = calculatePackaging({
      widthMm: 75,
      heightMm: 160,
      thicknessMm: 8,

      componentVolumes: {
        batteryMm3: -1000,
      },
    });

    expect(calculation.warnings).toContainEqual({
      code: 'INVALID_COMPONENT_VOLUME',
      message:
        'batteryMm3 volume must be a non-negative finite value.',
    });
  });

  it('warns when aggregate packaging headroom is tight even before volume is exceeded', () => {
    const calculation = calculatePackaging({
      widthMm: 75,
      heightMm: 160,
      thicknessMm: 8,
      reservedVolumePercent: 20,
      componentVolumes: {
        batteryMm3: 40000,
        cameraMm3: 12000,
        thermalMm3: 5000,
        boardMm3: 13000,
      },
    });

    expect(calculation.result.fitsAvailableVolume).toBe(true);
    expect(calculation.result.packagingPressure).toBe('tight');
    expect(calculation.warnings).toContainEqual({
      code: 'PACKAGING_HEADROOM_TIGHT',
      message:
        'Known components consume at least 90% of the aggregate internal volume budget. This leaves little unallocated volume for routing, tolerances, shielding, adhesives, connectors, and shape inefficiency.',
    });
  });

});
