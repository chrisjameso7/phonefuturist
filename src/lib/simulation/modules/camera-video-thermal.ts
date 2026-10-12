export const CAMERA_VIDEO_THERMAL_VERSION =
  'camera-video-thermal-0.1.0';

export interface CameraVideoThermalInput {
  cameraPipelinePowerW?: number;
  ambientTemperatureC?: number;
  thermalResistanceCPerW?: number;
  thermalMassJPerC?: number;
  thermalLimitTemperatureC?: number;
  recordingDurationMinutes?: number;
}

export interface CameraVideoThermalResult {
  version: string;
  status: 'resolved' | 'unresolved';
  steadyStateTemperatureC?: number;
  thermalTimeConstantSeconds?: number;
  thermalLimitSeconds?: number;
  thermalLimitMinutes?: number;
  temperatureAtRequestedDurationC?: number;
  thermalLimitWithinRequestedDuration?: boolean;
  noThermalLimitAtConstantPower?: boolean;
  unresolvedReason?: string;
  warnings: string[];
  note: string;
}

function positive(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value > 0
  );
}

function finite(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value)
  );
}

export function calculateCameraVideoThermal(
  input: CameraVideoThermalInput,
): CameraVideoThermalResult {
  const warnings: string[] = [];

  const powerW =
    positive(input.cameraPipelinePowerW)
      ? input.cameraPipelinePowerW
      : undefined;
  const ambientC =
    finite(input.ambientTemperatureC)
      ? input.ambientTemperatureC
      : undefined;
  const resistance =
    positive(input.thermalResistanceCPerW)
      ? input.thermalResistanceCPerW
      : undefined;
  const thermalMass =
    positive(input.thermalMassJPerC)
      ? input.thermalMassJPerC
      : undefined;
  const limitC =
    finite(input.thermalLimitTemperatureC)
      ? input.thermalLimitTemperatureC
      : undefined;
  const durationMinutes =
    positive(input.recordingDurationMinutes)
      ? input.recordingDurationMinutes
      : undefined;

  if (
    powerW === undefined ||
    ambientC === undefined ||
    resistance === undefined ||
    thermalMass === undefined ||
    limitC === undefined
  ) {
    return {
      version:
        CAMERA_VIDEO_THERMAL_VERSION,
      status: 'unresolved',
      unresolvedReason:
        'Pipeline power, ambient temperature, thermal resistance, thermal mass and thermal limit are all required.',
      warnings,
      note:
        'Video thermal duration stays unresolved rather than inferring camera thermal constants from resolution or phone size.',
    };
  }

  const thermalTimeConstantSeconds =
    resistance * thermalMass;

  const steadyStateTemperatureC =
    ambientC + powerW * resistance;

  if (limitC <= ambientC) {
    warnings.push(
      'Thermal limit is at or below ambient temperature.',
    );

    return {
      version:
        CAMERA_VIDEO_THERMAL_VERSION,
      status: 'resolved',
      steadyStateTemperatureC,
      thermalTimeConstantSeconds,
      thermalLimitSeconds: 0,
      thermalLimitMinutes: 0,
      ...(durationMinutes !== undefined
        ? {
            temperatureAtRequestedDurationC:
              ambientC,
            thermalLimitWithinRequestedDuration:
              true,
          }
        : {}),
      noThermalLimitAtConstantPower:
        false,
      warnings,
      note:
        'The entered thermal ceiling is already reached at the starting ambient condition.',
    };
  }

  const temperatureAtSeconds = (
    seconds: number,
  ) =>
    ambientC +
    powerW *
      resistance *
      (
        1 -
        Math.exp(
          -seconds /
            thermalTimeConstantSeconds,
        )
      );

  if (
    steadyStateTemperatureC <=
    limitC
  ) {
    const requestedTemperature =
      durationMinutes !== undefined
        ? temperatureAtSeconds(
            durationMinutes * 60,
          )
        : undefined;

    return {
      version:
        CAMERA_VIDEO_THERMAL_VERSION,
      status: 'resolved',
      steadyStateTemperatureC,
      thermalTimeConstantSeconds,
      ...(requestedTemperature !== undefined
        ? {
            temperatureAtRequestedDurationC:
              requestedTemperature,
            thermalLimitWithinRequestedDuration:
              false,
          }
        : {}),
      noThermalLimitAtConstantPower:
        true,
      warnings,
      note:
        'At the supplied constant pipeline power and thermal parameters, the first-order steady-state temperature remains below the entered thermal ceiling.',
    };
  }

  const normalizedRise =
    (limitC - ambientC) /
    (powerW * resistance);

  const thermalLimitSeconds =
    -thermalTimeConstantSeconds *
    Math.log(
      1 -
      normalizedRise,
    );

  const requestedTemperature =
    durationMinutes !== undefined
      ? temperatureAtSeconds(
          durationMinutes * 60,
        )
      : undefined;

  return {
    version:
      CAMERA_VIDEO_THERMAL_VERSION,
    status: 'resolved',
    steadyStateTemperatureC,
    thermalTimeConstantSeconds,
    thermalLimitSeconds,
    thermalLimitMinutes:
      thermalLimitSeconds / 60,
    ...(requestedTemperature !== undefined
      ? {
          temperatureAtRequestedDurationC:
            requestedTemperature,
          thermalLimitWithinRequestedDuration:
            thermalLimitSeconds <=
            durationMinutes! * 60,
        }
      : {}),
    noThermalLimitAtConstantPower:
      false,
    warnings,
    note:
      'Thermal-limit time uses a constant-power first-order RC thermal model. It does not model ISP throttling, camera shutdown policy, changing ambient conditions or power reduction after the ceiling is reached.',
  };
}
