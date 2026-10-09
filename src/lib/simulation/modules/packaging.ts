export interface PackagingInput {
  /**
   * External device dimensions.
   */
  widthMm?: number;
  heightMm?: number;
  thicknessMm?: number;

  /**
   * Volume that cannot realistically be used for internal components.
   *
   * This can represent frame material, structural reinforcement,
   * hinge mechanisms, seals, buttons, connectors, and other
   * non-allocatable space.
   *
   * Expressed as a percentage from 0 to 100.
   */
  reservedVolumePercent?: number;

  /**
   * Known internal component volumes.
   */
  componentVolumes?: {
    batteryMm3?: number;
    cameraMm3?: number;
    thermalMm3?: number;
    boardMm3?: number;
    speakersMm3?: number;
    otherMm3?: number;
  };
}

export interface CalculatedPackaging {
  externalVolumeMm3?: number;
  externalVolumeCm3?: number;

  reservedVolumeMm3?: number;

  availableInternalVolumeMm3?: number;
  availableInternalVolumeCm3?: number;

  knownComponentVolumeMm3?: number;
  knownComponentVolumeCm3?: number;

  remainingVolumeMm3?: number;
  remainingVolumeCm3?: number;

  usedInternalVolumePercent?: number;
  remainingInternalVolumePercent?: number;

  batteryVolumePercent?: number;

  componentVolumePercent?: {
    battery?: number;
    camera?: number;
    thermal?: number;
    board?: number;
    speakers?: number;
    other?: number;
  };

  largestKnownComponent?: {
    component:
      | 'battery'
      | 'camera'
      | 'thermal'
      | 'board'
      | 'speakers'
      | 'other';
    volumeMm3: number;
    percentOfAvailableInternalVolume?: number;
  };

  minimumAggregateThicknessMm?: number;
  aggregateThicknessHeadroomMm?: number;

  packagingPressure?:
    | 'relaxed'
    | 'constrained'
    | 'tight'
    | 'exceeded';

  thinnerByHalfMm?: {
    targetThicknessMm: number;
    availableInternalVolumeCm3: number;
    lostAvailableVolumeCm3: number;
    remainingVolumeCm3: number;
    usedInternalVolumePercent: number;
    fitsAvailableVolume: boolean;
  };

  componentGrowthSensitivity?: Array<{
    component: 'battery' | 'camera' | 'thermal';
    growthPercent: 10;
    baselineVolumeCm3: number;
    targetVolumeCm3: number;
    addedVolumeCm3: number;
    remainingVolumeCm3: number;
    usedInternalVolumePercent: number;
    fitsAvailableVolume: boolean;
  }>;

  /**
   * Indicates only whether the aggregate known component
   * volume is within the calculated internal volume budget.
   *
   * A true value does not prove that the actual component
   * shapes and positions can physically fit together.
   */
  fitsAvailableVolume?: boolean;
}

export interface PackagingWarning {
  code: string;
  message: string;
}

export interface PackagingCalculation {
  result: CalculatedPackaging;
  warnings: PackagingWarning[];
}

function isPositiveFinite(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function isNonNegativeFinite(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

function calculateKnownComponentVolume(
  components: NonNullable<PackagingInput['componentVolumes']>,
): {
  total: number;
  warnings: PackagingWarning[];
} {
  const warnings: PackagingWarning[] = [];
  const entries = Object.entries(components);
  let total = 0;

  for (const [component, volume] of entries) {
    if (volume === undefined) continue;

    if (!isNonNegativeFinite(volume)) {
      warnings.push({
        code: 'INVALID_COMPONENT_VOLUME',
        message: `${component} volume must be a non-negative finite value.`,
      });
      continue;
    }

    total += volume;
  }

  return { total, warnings };
}


function componentKey(
  key: keyof NonNullable<PackagingInput['componentVolumes']>,
) {
  return key.replace(/Mm3$/, '') as
    | 'battery'
    | 'camera'
    | 'thermal'
    | 'board'
    | 'speakers'
    | 'other';
}

export function calculatePackaging(
  input: PackagingInput,
): PackagingCalculation {
  const result: CalculatedPackaging = {};
  const warnings: PackagingWarning[] = [];

  const hasAnyDimension =
    input.widthMm !== undefined ||
    input.heightMm !== undefined ||
    input.thicknessMm !== undefined;

  const hasAllDimensions =
    input.widthMm !== undefined &&
    input.heightMm !== undefined &&
    input.thicknessMm !== undefined;

  if (hasAnyDimension && !hasAllDimensions) {
    warnings.push({
      code: 'INCOMPLETE_DEVICE_DIMENSIONS',
      message:
        'Device width, height, and thickness are all required to calculate packaging volume.',
    });
  }

  if (hasAllDimensions) {
    if (
      isPositiveFinite(input.widthMm!) &&
      isPositiveFinite(input.heightMm!) &&
      isPositiveFinite(input.thicknessMm!)
    ) {
      result.externalVolumeMm3 =
        input.widthMm! *
        input.heightMm! *
        input.thicknessMm!;

      result.externalVolumeCm3 =
        result.externalVolumeMm3 / 1000;
    } else {
      warnings.push({
        code: 'INVALID_DEVICE_DIMENSIONS',
        message:
          'Device width, height, and thickness must be positive finite values.',
      });
    }
  }

  let reservedVolumePercent = 0;

  if (input.reservedVolumePercent !== undefined) {
    if (
      Number.isFinite(input.reservedVolumePercent) &&
      input.reservedVolumePercent >= 0 &&
      input.reservedVolumePercent <= 100
    ) {
      reservedVolumePercent =
        input.reservedVolumePercent;
    } else {
      warnings.push({
        code: 'INVALID_RESERVED_VOLUME_PERCENT',
        message:
          'Reserved volume percentage must be a finite value from 0 to 100.',
      });
    }
  }

  if (result.externalVolumeMm3 !== undefined) {
    result.reservedVolumeMm3 =
      result.externalVolumeMm3 *
      (reservedVolumePercent / 100);

    result.availableInternalVolumeMm3 =
      result.externalVolumeMm3 -
      result.reservedVolumeMm3;

    result.availableInternalVolumeCm3 =
      result.availableInternalVolumeMm3 / 1000;
  }

  if (input.componentVolumes) {
    const componentCalculation =
      calculateKnownComponentVolume(
        input.componentVolumes,
      );

    warnings.push(...componentCalculation.warnings);

    result.knownComponentVolumeMm3 =
      componentCalculation.total;

    result.knownComponentVolumeCm3 =
      componentCalculation.total / 1000;

    if (
      result.availableInternalVolumeMm3 !== undefined &&
      result.availableInternalVolumeMm3 > 0
    ) {
      const shares: NonNullable<
        CalculatedPackaging['componentVolumePercent']
      > = {};

      let largest:
        | NonNullable<CalculatedPackaging['largestKnownComponent']>
        | undefined;

      for (const [key, volume] of Object.entries(
        input.componentVolumes,
      )) {
        if (
          volume === undefined ||
          !isNonNegativeFinite(volume)
        ) {
          continue;
        }

        const component = componentKey(
          key as keyof NonNullable<
            PackagingInput['componentVolumes']
          >,
        );
        const percent =
          (volume / result.availableInternalVolumeMm3) * 100;

        shares[component] = percent;

        if (!largest || volume > largest.volumeMm3) {
          largest = {
            component,
            volumeMm3: volume,
            percentOfAvailableInternalVolume: percent,
          };
        }
      }

      result.componentVolumePercent = shares;
      result.largestKnownComponent = largest;
    }

    if (
      input.componentVolumes.batteryMm3 !== undefined &&
      isNonNegativeFinite(
        input.componentVolumes.batteryMm3,
      ) &&
      result.availableInternalVolumeMm3 !== undefined &&
      result.availableInternalVolumeMm3 > 0
    ) {
      result.batteryVolumePercent =
        (input.componentVolumes.batteryMm3 /
          result.availableInternalVolumeMm3) *
        100;
    }
  }

  if (
    result.availableInternalVolumeMm3 !== undefined &&
    result.knownComponentVolumeMm3 !== undefined
  ) {
    result.remainingVolumeMm3 =
      result.availableInternalVolumeMm3 -
      result.knownComponentVolumeMm3;

    result.remainingVolumeCm3 =
      result.remainingVolumeMm3 / 1000;

    if (result.availableInternalVolumeMm3 > 0) {
      result.usedInternalVolumePercent =
        (result.knownComponentVolumeMm3 /
          result.availableInternalVolumeMm3) *
        100;

      result.remainingInternalVolumePercent =
        (result.remainingVolumeMm3 /
          result.availableInternalVolumeMm3) *
        100;
    }

    const growthSensitivity: NonNullable<
      CalculatedPackaging['componentGrowthSensitivity']
    > = [];

    for (const component of [
      'battery',
      'camera',
      'thermal',
    ] as const) {
      const key = `${component}Mm3` as keyof NonNullable<
        PackagingInput['componentVolumes']
      >;
      const baselineVolume =
        input.componentVolumes?.[key];

      if (
        baselineVolume === undefined ||
        !isNonNegativeFinite(baselineVolume)
      ) {
        continue;
      }

      const targetVolume = baselineVolume * 1.1;
      const addedVolume = targetVolume - baselineVolume;
      const scenarioKnownVolume =
        result.knownComponentVolumeMm3 + addedVolume;
      const remainingVolume =
        result.availableInternalVolumeMm3 -
        scenarioKnownVolume;

      growthSensitivity.push({
        component,
        growthPercent: 10,
        baselineVolumeCm3: baselineVolume / 1000,
        targetVolumeCm3: targetVolume / 1000,
        addedVolumeCm3: addedVolume / 1000,
        remainingVolumeCm3: remainingVolume / 1000,
        usedInternalVolumePercent:
          result.availableInternalVolumeMm3 > 0
            ? (
                scenarioKnownVolume /
                result.availableInternalVolumeMm3
              ) * 100
            : Number.POSITIVE_INFINITY,
        fitsAvailableVolume:
          scenarioKnownVolume <=
          result.availableInternalVolumeMm3,
      });
    }

    if (growthSensitivity.length > 0) {
      result.componentGrowthSensitivity =
        growthSensitivity;
    }

    result.fitsAvailableVolume =
      result.knownComponentVolumeMm3 <=
      result.availableInternalVolumeMm3;

    if (
      input.widthMm !== undefined &&
      input.heightMm !== undefined &&
      isPositiveFinite(input.widthMm) &&
      isPositiveFinite(input.heightMm)
    ) {
      const allocatableFraction =
        1 - reservedVolumePercent / 100;

      if (allocatableFraction > 0) {
        result.minimumAggregateThicknessMm =
          result.knownComponentVolumeMm3 /
          (
            input.widthMm *
            input.heightMm *
            allocatableFraction
          );

        if (
          input.thicknessMm !== undefined &&
          isPositiveFinite(input.thicknessMm)
        ) {
          result.aggregateThicknessHeadroomMm =
            input.thicknessMm -
            result.minimumAggregateThicknessMm;

          const targetThicknessMm =
            input.thicknessMm - 0.5;

          if (
            targetThicknessMm > 0 &&
            result.availableInternalVolumeMm3 !== undefined
          ) {
            const scenarioExternalVolumeMm3 =
              input.widthMm *
              input.heightMm *
              targetThicknessMm;
            const scenarioAvailableMm3 =
              scenarioExternalVolumeMm3 *
              allocatableFraction;
            const remainingMm3 =
              scenarioAvailableMm3 -
              result.knownComponentVolumeMm3;

            result.thinnerByHalfMm = {
              targetThicknessMm,
              availableInternalVolumeCm3:
                scenarioAvailableMm3 / 1000,
              lostAvailableVolumeCm3:
                (
                  result.availableInternalVolumeMm3 -
                  scenarioAvailableMm3
                ) / 1000,
              remainingVolumeCm3:
                remainingMm3 / 1000,
              usedInternalVolumePercent:
                scenarioAvailableMm3 > 0
                  ? (
                      result.knownComponentVolumeMm3 /
                      scenarioAvailableMm3
                    ) * 100
                  : Number.POSITIVE_INFINITY,
              fitsAvailableVolume:
                result.knownComponentVolumeMm3 <=
                scenarioAvailableMm3,
            };
          }
        }
      }
    }

    if (!result.fitsAvailableVolume) {
      result.packagingPressure = 'exceeded';
    } else if (
      result.usedInternalVolumePercent !== undefined &&
      result.usedInternalVolumePercent >= 90
    ) {
      result.packagingPressure = 'tight';
    } else if (
      result.usedInternalVolumePercent !== undefined &&
      result.usedInternalVolumePercent >= 75
    ) {
      result.packagingPressure = 'constrained';
    } else if (
      result.usedInternalVolumePercent !== undefined
    ) {
      result.packagingPressure = 'relaxed';
    }

    if (
      result.packagingPressure === 'tight'
    ) {
      warnings.push({
        code: 'PACKAGING_HEADROOM_TIGHT',
        message:
          'Known components consume at least 90% of the aggregate internal volume budget. This leaves little unallocated volume for routing, tolerances, shielding, adhesives, connectors, and shape inefficiency.',
      });
    }

    if (!result.fitsAvailableVolume) {
      warnings.push({
        code: 'PACKAGING_VOLUME_EXCEEDED',
        message:
          'Known component volume exceeds the calculated available internal device volume.',
      });
    }
  }

  return {
    result,
    warnings,
  };
}