export const SOC_THERMAL_MODEL_VERSION = 'soc-thermal-0.1.0';

export type SocThermalInput = {
  targetPowerW: number;
  ambientTemperatureC: number;
  thermalResistanceCPerW: number;
  thermalMassJPerC: number;
  throttleTemperatureC: number;
  durationSeconds?: number;
  stepSeconds?: number;
};

export type SocThermalPoint = {
  second: number;
  temperatureC: number;
  powerW: number;
  performancePercent: number;
};

export type SocThermalResult = {
  modelVersion: string;
  peakTemperatureC: number;
  endTemperatureC: number;
  throttleStartSecond?: number;
  sustainedPerformancePercent: number;
  sustainedPowerW: number;
  points: SocThermalPoint[];
};

const q = (value: number, precision = 1000) =>
  Math.round(value * precision) / precision;

function valid(input: SocThermalInput): boolean {
  return [
    input.targetPowerW,
    input.ambientTemperatureC,
    input.thermalResistanceCPerW,
    input.thermalMassJPerC,
    input.throttleTemperatureC,
  ].every(Number.isFinite)
    && input.targetPowerW > 0
    && input.thermalResistanceCPerW > 0
    && input.thermalMassJPerC > 0
    && input.throttleTemperatureC > input.ambientTemperatureC;
}

/**
 * Deterministic first-order SoC thermal model.
 *
 * Cth * dT/dt = P - (T - Tambient) / Rth
 *
 * Once the thermal ceiling is reached, the power budget is reduced
 * deterministically. A 2 C hysteresis band prevents one-step oscillation.
 * This is a model primitive, not a claim about any specific unreleased chip.
 */
export function simulateSocThermals(input: SocThermalInput): SocThermalResult | undefined {
  if (!valid(input)) return undefined;

  const duration = Math.max(1, Math.round(input.durationSeconds ?? 1800));
  const dt = input.stepSeconds ?? 1;
  if (!Number.isFinite(dt) || dt <= 0 || dt > 10) return undefined;

  const steps = Math.ceil(duration / dt);
  const floorPower = input.targetPowerW * 0.52;
  let temperatureC = input.ambientTemperatureC;
  let powerW = input.targetPowerW;
  let throttling = false;
  let throttleStartSecond: number | undefined;
  let peakTemperatureC = temperatureC;
  let sustainedPowerSum = 0;
  let sustainedPerformanceSum = 0;
  let sustainedSamples = 0;
  const points: SocThermalPoint[] = [];
  const sampleEvery = Math.max(1, Math.round(30 / dt));

  for (let step = 1; step <= steps; step += 1) {
    const second = Math.min(duration, q(step * dt, 1000));

    if (!throttling && temperatureC >= input.throttleTemperatureC) {
      throttling = true;
      throttleStartSecond ??= second;
    } else if (throttling && temperatureC <= input.throttleTemperatureC - 2) {
      throttling = false;
    }

    if (throttling) {
      const over = Math.max(0, temperatureC - input.throttleTemperatureC);
      const reduction = Math.min(0.48, 0.18 + over * 0.035);
      powerW = Math.max(floorPower, input.targetPowerW * (1 - reduction));
    } else {
      powerW = Math.min(input.targetPowerW, powerW + input.targetPowerW * 0.025);
    }

    const coolingW = (temperatureC - input.ambientTemperatureC) / input.thermalResistanceCPerW;
    const deltaC = ((powerW - coolingW) / input.thermalMassJPerC) * dt;
    temperatureC = q(Math.max(input.ambientTemperatureC, temperatureC + deltaC));
    powerW = q(powerW);
    peakTemperatureC = Math.max(peakTemperatureC, temperatureC);

    const performancePercent = q(Math.min(100, Math.max(0, (powerW / input.targetPowerW) * 100)), 10);
    if (second > duration - Math.min(300, duration)) {
      sustainedPowerSum += powerW;
      sustainedPerformanceSum += performancePercent;
      sustainedSamples += 1;
    }

    if (step === 1 || step % sampleEvery === 0 || step === steps) {
      points.push({
        second,
        temperatureC,
        powerW,
        performancePercent,
      });
    }
  }

  return {
    modelVersion: SOC_THERMAL_MODEL_VERSION,
    peakTemperatureC: q(peakTemperatureC, 100),
    endTemperatureC: q(temperatureC, 100),
    ...(throttleStartSecond !== undefined ? { throttleStartSecond } : {}),
    sustainedPerformancePercent: q(
      sustainedSamples ? sustainedPerformanceSum / sustainedSamples : 100,
      10,
    ),
    sustainedPowerW: q(
      sustainedSamples ? sustainedPowerSum / sustainedSamples : input.targetPowerW,
      100,
    ),
    points,
  };
}
