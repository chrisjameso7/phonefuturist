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

    result.fitsAvailableVolume =
      result.knownComponentVolumeMm3 <=
      result.availableInternalVolumeMm3;

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