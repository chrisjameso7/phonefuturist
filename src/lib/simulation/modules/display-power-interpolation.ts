export const DISPLAY_POWER_INTERPOLATION_VERSION =
  'display-power-interpolation-0.1.0';

export type DisplayPowerInterpolationAxis =
  | 'brightness-nits'
  | 'apl-percent'
  | 'refresh-hz';

export interface DisplayPowerOperatingPoint {
  powerW: number;
  brightnessNits: number;
  averagePictureLevelPercent: number;
  refreshRateHz: number;
}

export interface DisplayPowerInterpolationInput {
  axis: DisplayPowerInterpolationAxis;
  low: DisplayPowerOperatingPoint;
  high: DisplayPowerOperatingPoint;
  targetValue: number;
}

export interface DisplayPowerInterpolationResult {
  version: string;
  status: 'resolved' | 'unresolved';
  axis: DisplayPowerInterpolationAxis;
  targetValue?: number;
  interpolationFraction?: number;
  expectedPowerW?: number;
  minMeasuredPowerW?: number;
  maxMeasuredPowerW?: number;
  unresolvedReason?: string;
  note: string;
}

function finite(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value)
  );
}

function positive(value: unknown): value is number {
  return finite(value) && value > 0;
}

function axisValue(
  point: DisplayPowerOperatingPoint,
  axis: DisplayPowerInterpolationAxis,
) {
  switch (axis) {
    case 'brightness-nits':
      return point.brightnessNits;
    case 'apl-percent':
      return point.averagePictureLevelPercent;
    case 'refresh-hz':
      return point.refreshRateHz;
  }
}

function sameControlledConditions(
  low: DisplayPowerOperatingPoint,
  high: DisplayPowerOperatingPoint,
  axis: DisplayPowerInterpolationAxis,
) {
  const epsilon = 1e-9;

  if (
    axis !== 'brightness-nits' &&
    Math.abs(
      low.brightnessNits -
        high.brightnessNits,
    ) > epsilon
  ) {
    return false;
  }

  if (
    axis !== 'apl-percent' &&
    Math.abs(
      low.averagePictureLevelPercent -
        high.averagePictureLevelPercent,
    ) > epsilon
  ) {
    return false;
  }

  if (
    axis !== 'refresh-hz' &&
    Math.abs(
      low.refreshRateHz -
        high.refreshRateHz,
    ) > epsilon
  ) {
    return false;
  }

  return true;
}

export function interpolateDisplayPower(
  input: DisplayPowerInterpolationInput,
): DisplayPowerInterpolationResult {
  const points = [
    input.low,
    input.high,
  ];

  if (
    !points.every(
      (point) =>
        positive(point.powerW) &&
        positive(point.brightnessNits) &&
        finite(
          point.averagePictureLevelPercent,
        ) &&
        point.averagePictureLevelPercent >=
          0 &&
        point.averagePictureLevelPercent <=
          100 &&
        positive(point.refreshRateHz),
    ) ||
    !finite(input.targetValue)
  ) {
    return {
      version:
        DISPLAY_POWER_INTERPOLATION_VERSION,
      status: 'unresolved',
      axis: input.axis,
      unresolvedReason:
        'Display interpolation requires two valid measured operating points and a finite target value.',
      note:
        'No display watts are estimated when the measured endpoints are invalid or incomplete.',
    };
  }

  if (
    !sameControlledConditions(
      input.low,
      input.high,
      input.axis,
    )
  ) {
    return {
      version:
        DISPLAY_POWER_INTERPOLATION_VERSION,
      status: 'unresolved',
      axis: input.axis,
      unresolvedReason:
        'Only one operating variable may change between interpolation endpoints.',
      note:
        'Brightness, APL and refresh effects are isolated rather than blended into an unvalidated multivariable power equation.',
    };
  }

  const lowAxis =
    axisValue(
      input.low,
      input.axis,
    );
  const highAxis =
    axisValue(
      input.high,
      input.axis,
    );

  if (
    !finite(lowAxis) ||
    !finite(highAxis) ||
    lowAxis === highAxis
  ) {
    return {
      version:
        DISPLAY_POWER_INTERPOLATION_VERSION,
      status: 'unresolved',
      axis: input.axis,
      unresolvedReason:
        'Interpolation endpoints must have different values on the selected axis.',
      note:
        'A zero-width measured interval cannot define a response.',
    };
  }

  const minAxis =
    Math.min(
      lowAxis,
      highAxis,
    );
  const maxAxis =
    Math.max(
      lowAxis,
      highAxis,
    );

  if (
    input.targetValue < minAxis ||
    input.targetValue > maxAxis
  ) {
    return {
      version:
        DISPLAY_POWER_INTERPOLATION_VERSION,
      status: 'unresolved',
      axis: input.axis,
      targetValue:
        input.targetValue,
      unresolvedReason:
        'Target operating point lies outside the measured interval.',
      note:
        'The display power model interpolates between measured points only and deliberately refuses extrapolation.',
    };
  }

  const interpolationFraction =
    (
      input.targetValue -
      lowAxis
    ) /
    (
      highAxis -
      lowAxis
    );

  const expectedPowerW =
    input.low.powerW +
    interpolationFraction *
      (
        input.high.powerW -
        input.low.powerW
      );

  return {
    version:
      DISPLAY_POWER_INTERPOLATION_VERSION,
    status: 'resolved',
    axis: input.axis,
    targetValue:
      input.targetValue,
    interpolationFraction,
    expectedPowerW,
    minMeasuredPowerW:
      Math.min(
        input.low.powerW,
        input.high.powerW,
      ),
    maxMeasuredPowerW:
      Math.max(
        input.low.powerW,
        input.high.powerW,
      ),
    note:
      'Electrical panel power is linearly interpolated only inside a measured one-variable interval with all other operating conditions held constant. No extrapolation is performed.',
  };
}
