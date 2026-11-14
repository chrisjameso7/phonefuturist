export const TWO_NODE_THERMAL_MODEL_VERSION =
  'two-node-thermal-0.1.0';

export interface TwoNodeThermalInput {
  targetPowerW: number;
  ambientTemperatureC: number;

  socToChassisResistanceCPerW: number;
  chassisToAmbientResistanceCPerW: number;

  socThermalMassJPerC: number;
  chassisThermalMassJPerC: number;

  socThrottleTemperatureC: number;
  surfaceComfortTemperatureC?: number;

  durationSeconds?: number;
  stepSeconds?: number;
}

export interface TwoNodeThermalPoint {
  second: number;
  socPackageTemperatureC: number;
  chassisSurfaceTemperatureC: number;
  powerW: number;
  performancePercent: number;
}

export interface TwoNodeThermalResult {
  modelVersion: string;

  peakSocPackageTemperatureC: number;
  peakChassisSurfaceTemperatureC: number;

  endSocPackageTemperatureC: number;
  endChassisSurfaceTemperatureC: number;

  throttleStartSecond?: number;
  surfaceComfortCrossSecond?: number;

  sustainedPerformancePercent: number;
  sustainedPowerW: number;

  points: TwoNodeThermalPoint[];
}

const q = (
  value: number,
  precision = 1000,
) => Math.round(value * precision) / precision;

function valid(input: TwoNodeThermalInput) {
  return [
    input.targetPowerW,
    input.ambientTemperatureC,
    input.socToChassisResistanceCPerW,
    input.chassisToAmbientResistanceCPerW,
    input.socThermalMassJPerC,
    input.chassisThermalMassJPerC,
    input.socThrottleTemperatureC,
  ].every(Number.isFinite) &&
    input.targetPowerW > 0 &&
    input.socToChassisResistanceCPerW > 0 &&
    input.chassisToAmbientResistanceCPerW > 0 &&
    input.socThermalMassJPerC > 0 &&
    input.chassisThermalMassJPerC > 0 &&
    input.socThrottleTemperatureC >
      input.ambientTemperatureC &&
    (
      input.surfaceComfortTemperatureC ===
        undefined ||
      (
        Number.isFinite(
          input.surfaceComfortTemperatureC,
        ) &&
        input.surfaceComfortTemperatureC >
          input.ambientTemperatureC
      )
    );
}

/**
 * Deterministic two-node phone thermal model.
 *
 * SoC/package node:
 *   C_soc * dT_soc/dt =
 *     P - (T_soc - T_chassis) / R_soc_chassis
 *
 * Chassis/surface node:
 *   C_chassis * dT_chassis/dt =
 *     (T_soc - T_chassis) / R_soc_chassis
 *     - (T_chassis - T_ambient) / R_chassis_ambient
 *
 * Throttling is controlled by the SoC/package node only.
 * Surface comfort is tracked separately and never directly
 * throttles silicon in this primitive.
 */
export function simulateTwoNodeThermals(
  input: TwoNodeThermalInput,
): TwoNodeThermalResult | undefined {
  if (!valid(input)) return undefined;

  const duration = Math.max(
    1,
    Math.round(input.durationSeconds ?? 1800),
  );

  const dt = input.stepSeconds ?? 0.5;

  if (
    !Number.isFinite(dt) ||
    dt <= 0 ||
    dt > 2
  ) {
    return undefined;
  }

  const steps = Math.ceil(duration / dt);
  const floorPower =
    input.targetPowerW * 0.5;

  let socC = input.ambientTemperatureC;
  let chassisC = input.ambientTemperatureC;
  let powerW = input.targetPowerW;

  let throttling = false;
  let throttleStartSecond: number | undefined;
  let surfaceComfortCrossSecond:
    | number
    | undefined;

  let peakSocC = socC;
  let peakChassisC = chassisC;

  let sustainedPowerSum = 0;
  let sustainedPerformanceSum = 0;
  let sustainedSamples = 0;

  const points: TwoNodeThermalPoint[] = [];
  const sampleEvery = Math.max(
    1,
    Math.round(30 / dt),
  );

  for (
    let step = 1;
    step <= steps;
    step += 1
  ) {
    const second = Math.min(
      duration,
      q(step * dt),
    );

    if (
      !throttling &&
      socC >= input.socThrottleTemperatureC
    ) {
      throttling = true;
      throttleStartSecond ??= second;
    } else if (
      throttling &&
      socC <=
        input.socThrottleTemperatureC - 3
    ) {
      throttling = false;
    }

    if (throttling) {
      const over = Math.max(
        0,
        socC -
          input.socThrottleTemperatureC,
      );

      const reduction = Math.min(
        0.5,
        0.18 + over * 0.03,
      );

      powerW = Math.max(
        floorPower,
        input.targetPowerW *
          (1 - reduction),
      );
    } else {
      powerW = Math.min(
        input.targetPowerW,
        powerW +
          input.targetPowerW * 0.02,
      );
    }

    const socToChassisW =
      (socC - chassisC) /
      input.socToChassisResistanceCPerW;

    const chassisToAmbientW =
      (
        chassisC -
        input.ambientTemperatureC
      ) /
      input.chassisToAmbientResistanceCPerW;

    const deltaSocC =
      (
        (
          powerW -
          socToChassisW
        ) /
        input.socThermalMassJPerC
      ) *
      dt;

    const deltaChassisC =
      (
        (
          socToChassisW -
          chassisToAmbientW
        ) /
        input.chassisThermalMassJPerC
      ) *
      dt;

    socC = q(
      Math.max(
        input.ambientTemperatureC,
        socC + deltaSocC,
      ),
    );

    chassisC = q(
      Math.max(
        input.ambientTemperatureC,
        chassisC + deltaChassisC,
      ),
    );

    powerW = q(powerW);

    peakSocC = Math.max(
      peakSocC,
      socC,
    );

    peakChassisC = Math.max(
      peakChassisC,
      chassisC,
    );

    if (
      surfaceComfortCrossSecond ===
        undefined &&
      input.surfaceComfortTemperatureC !==
        undefined &&
      chassisC >=
        input.surfaceComfortTemperatureC
    ) {
      surfaceComfortCrossSecond = second;
    }

    const performancePercent = q(
      Math.min(
        100,
        Math.max(
          0,
          (
            powerW /
            input.targetPowerW
          ) *
            100,
        ),
      ),
      10,
    );

    if (
      second >
      duration -
        Math.min(300, duration)
    ) {
      sustainedPowerSum += powerW;
      sustainedPerformanceSum +=
        performancePercent;
      sustainedSamples += 1;
    }

    if (
      step === 1 ||
      step % sampleEvery === 0 ||
      step === steps
    ) {
      points.push({
        second,
        socPackageTemperatureC: socC,
        chassisSurfaceTemperatureC:
          chassisC,
        powerW,
        performancePercent,
      });
    }
  }

  return {
    modelVersion:
      TWO_NODE_THERMAL_MODEL_VERSION,
    peakSocPackageTemperatureC: q(
      peakSocC,
      100,
    ),
    peakChassisSurfaceTemperatureC: q(
      peakChassisC,
      100,
    ),
    endSocPackageTemperatureC: q(
      socC,
      100,
    ),
    endChassisSurfaceTemperatureC: q(
      chassisC,
      100,
    ),
    ...(throttleStartSecond !== undefined
      ? { throttleStartSecond }
      : {}),
    ...(surfaceComfortCrossSecond !==
    undefined
      ? { surfaceComfortCrossSecond }
      : {}),
    sustainedPerformancePercent: q(
      sustainedSamples
        ? sustainedPerformanceSum /
            sustainedSamples
        : 100,
      10,
    ),
    sustainedPowerW: q(
      sustainedSamples
        ? sustainedPowerSum /
            sustainedSamples
        : input.targetPowerW,
      100,
    ),
    points,
  };
}
