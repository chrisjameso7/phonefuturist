import { buildCalibrationRegistry } from './modules/calibration-registry';
import type { DeviceCorpus } from './modules/device-corpus';
import {
  simulateCalibratedSocThermals,
  type CalibratedSocThermalInput,
} from './modules/calibrated-soc-thermal';
import {
  simulateSocThermals,
  type SocThermalInput,
} from './modules/soc-thermal';

export const LIVE_THERMAL_EXPERIENCE_VERSION =
  'live-thermal-experience-0.1.0';

export interface LiveThermalExperienceInput
  extends CalibratedSocThermalInput {}

export interface LiveThermalExperienceResult {
  version: string;
  status: 'resolved' | 'unresolved';
  evidenceMode?: 'calibrated' | 'physics-fallback';
  confidence?: number;
  referenceCount?: number;
  neighborIds?: string[];
  peakTemperatureC?: number;
  endTemperatureC?: number;
  throttleStartSecond?: number;
  sustainedPerformancePercent?: number;
  sustainedPowerW?: number;
  points?: Array<{
    second: number;
    temperatureC: number;
    powerW: number;
    performancePercent: number;
  }>;
  warnings?: Array<{
    code: string;
    message: string;
  }>;
  note?: string;
  unresolvedReason?: string;
}


function thermalWarnings(
  input: LiveThermalExperienceInput,
  result: {
    peakTemperatureC: number;
    sustainedPerformancePercent: number;
    throttleStartSecond?: number;
  },
) {
  const warnings: Array<{ code: string; message: string }> = [];
  const steadyStateC =
    input.ambientTemperatureC +
    input.targetPowerW * input.thermalResistanceCPerW;

  if (
    input.throttleTemperatureC -
      input.ambientTemperatureC <
    8
  ) {
    warnings.push({
      code: 'LOW_THROTTLE_HEADROOM',
      message:
        'Throttle temperature is less than 8 °C above ambient. This may represent a surface-temperature limit rather than a realistic internal SoC junction ceiling.',
    });
  }

  if (steadyStateC >= input.throttleTemperatureC + 20) {
    warnings.push({
      code: 'HIGH_UNTHROTTLED_STEADY_STATE',
      message:
        'The unthrottled steady-state temperature would sit more than 20 °C above the throttle ceiling, so sustained performance depends heavily on throttling behavior.',
    });
  }

  if (
    result.throttleStartSecond !== undefined &&
    result.throttleStartSecond < 60
  ) {
    warnings.push({
      code: 'EARLY_THROTTLE',
      message:
        'The model reaches the thermal ceiling within the first minute. Recheck target power, thermal resistance, thermal mass and throttle temperature.',
    });
  }

  if (result.sustainedPerformancePercent < 60) {
    warnings.push({
      code: 'SEVERE_SUSTAINED_THROTTLE',
      message:
        'Sustained performance falls below 60% of target. Treat this as a strong thermal bottleneck signal.',
    });
  }

  return warnings;
}

export function simulateThermalExperience(
  corpus: DeviceCorpus,
  input: LiveThermalExperienceInput,
): LiveThermalExperienceResult {
  const calibrated = simulateCalibratedSocThermals(
    corpus,
    input,
  );

  if (
    calibrated.status === 'resolved' &&
    calibrated.simulation &&
    calibrated.evidence
  ) {
    const warnings = thermalWarnings(input, {
      peakTemperatureC:
        calibrated.simulation.peakTemperatureC,
      sustainedPerformancePercent:
        calibrated.simulation.sustainedPerformancePercent,
      throttleStartSecond:
        calibrated.simulation.throttleStartSecond,
    });

    return {
      version: LIVE_THERMAL_EXPERIENCE_VERSION,
      status: 'resolved',
      evidenceMode: 'calibrated',
      confidence: calibrated.evidence.confidence,
      referenceCount: calibrated.evidence.referenceCount,
      neighborIds: calibrated.evidence.neighborIds,
      peakTemperatureC:
        calibrated.simulation.peakTemperatureC,
      endTemperatureC:
        calibrated.simulation.endTemperatureC,
      throttleStartSecond:
        calibrated.simulation.throttleStartSecond,
      sustainedPerformancePercent:
        calibrated.simulation.sustainedPerformancePercent,
      sustainedPowerW:
        calibrated.simulation.sustainedPowerW,
      points: calibrated.simulation.points,
      warnings,
      note:
        'Sustained performance is calibrated from comparable measured thermal evidence, then propagated through the deterministic thermal model.',
    };
  }

  const fallbackInput: SocThermalInput = {
    targetPowerW: input.targetPowerW,
    ambientTemperatureC: input.ambientTemperatureC,
    thermalResistanceCPerW:
      input.thermalResistanceCPerW,
    thermalMassJPerC: input.thermalMassJPerC,
    throttleTemperatureC: input.throttleTemperatureC,
    durationSeconds: input.durationSeconds,
    stepSeconds: input.stepSeconds,
  };

  const fallback = simulateSocThermals(fallbackInput);

  if (!fallback) {
    return {
      version: LIVE_THERMAL_EXPERIENCE_VERSION,
      status: 'unresolved',
      unresolvedReason:
        calibrated.unresolvedReason ??
        'Thermal inputs could not be resolved.',
    };
  }

  const warnings = thermalWarnings(input, {
    peakTemperatureC: fallback.peakTemperatureC,
    sustainedPerformancePercent:
      fallback.sustainedPerformancePercent,
    throttleStartSecond: fallback.throttleStartSecond,
  });

  return {
    version: LIVE_THERMAL_EXPERIENCE_VERSION,
    status: 'resolved',
    evidenceMode: 'physics-fallback',
    peakTemperatureC: fallback.peakTemperatureC,
    endTemperatureC: fallback.endTemperatureC,
    throttleStartSecond: fallback.throttleStartSecond,
    sustainedPerformancePercent:
      fallback.sustainedPerformancePercent,
    sustainedPowerW: fallback.sustainedPowerW,
    points: fallback.points,
    warnings,
    note:
      'No compatible measured sustained-performance evidence was available. Result uses the deterministic first-order thermal model only and should be treated as lower confidence.',
  };
}

export function simulateLiveThermalExperience(
  input: LiveThermalExperienceInput,
): LiveThermalExperienceResult {
  return simulateThermalExperience(
    buildCalibrationRegistry(),
    input,
  );
}
