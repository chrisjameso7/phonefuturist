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
  note?: string;
  unresolvedReason?: string;
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
