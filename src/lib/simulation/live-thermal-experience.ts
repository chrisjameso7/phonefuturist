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
import {
  simulateTwoNodeThermals,
  type TwoNodeThermalResult,
} from './modules/two-node-thermal';

export const LIVE_THERMAL_EXPERIENCE_VERSION =
  'live-thermal-experience-0.2.0';

export interface LiveThermalExperienceInput
  extends CalibratedSocThermalInput {
  twoNode?: {
    socToChassisResistanceCPerW: number;
    chassisToAmbientResistanceCPerW: number;
    socThermalMassJPerC: number;
    chassisThermalMassJPerC: number;
    socThrottleTemperatureC: number;
    surfaceComfortTemperatureC?: number;
  };
}

export interface LiveThermalExperienceResult {
  version: string;
  status: 'resolved' | 'unresolved';
  evidenceMode?: 'calibrated' | 'physics-fallback';
  confidence?: number;
  averageSimilarity?: number;
  averageCoverage?: number;
  protocolKey?: string;
  referenceCount?: number;
  neighborIds?: string[];
  evidenceScope?:
    | 'same-soc-family'
    | 'same-soc-vendor'
    | 'protocol-cohort';
  sameSocFamilyReferences?: number;
  sameSocVendorReferences?: number;
  sourceRecordCount?: number;
  publisherCount?: number;
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
  twoNode?: TwoNodeThermalResult;
  warnings?: Array<{
    code: string;
    message: string;
  }>;
  sensitivity?: Array<{
    scenario: 'hot-ambient' | 'improved-cooling' | 'higher-power';
    label: string;
    peakTemperatureC: number;
    sustainedPerformancePercent: number;
    sustainedPowerW: number;
    throttleStartSecond?: number;
    deltaPeakTemperatureC: number;
    deltaSustainedPerformancePercent: number;
    deltaSustainedPowerW: number;
  }>;
  note?: string;
  unresolvedReason?: string;
}




function optionalTwoNodeResult(
  input: LiveThermalExperienceInput,
) {
  if (!input.twoNode) {
    return undefined;
  }

  return simulateTwoNodeThermals({
    targetPowerW: input.targetPowerW,
    ambientTemperatureC:
      input.ambientTemperatureC,
    socToChassisResistanceCPerW:
      input.twoNode
        .socToChassisResistanceCPerW,
    chassisToAmbientResistanceCPerW:
      input.twoNode
        .chassisToAmbientResistanceCPerW,
    socThermalMassJPerC:
      input.twoNode.socThermalMassJPerC,
    chassisThermalMassJPerC:
      input.twoNode
        .chassisThermalMassJPerC,
    socThrottleTemperatureC:
      input.twoNode.socThrottleTemperatureC,
    surfaceComfortTemperatureC:
      input.twoNode
        .surfaceComfortTemperatureC,
    durationSeconds: input.durationSeconds,
    stepSeconds:
      input.stepSeconds !== undefined
        ? Math.min(input.stepSeconds, 2)
        : undefined,
  });
}

function thermalSensitivityScenarios(
  input: LiveThermalExperienceInput,
  evidenceMode: 'calibrated' | 'physics-fallback',
  baseline: {
    peakTemperatureC: number;
    sustainedPerformancePercent: number;
    sustainedPowerW: number;
  },
) {
  const scenarios = [
    {
      scenario: 'hot-ambient' as const,
      label: 'Ambient +5 °C',
      input: {
        ...input,
        ambientTemperatureC:
          input.ambientTemperatureC + 5,
      },
    },
    {
      scenario: 'improved-cooling' as const,
      label: 'Cooling resistance -20%',
      input: {
        ...input,
        thermalResistanceCPerW:
          input.thermalResistanceCPerW * 0.8,
      },
    },
    {
      scenario: 'higher-power' as const,
      label: 'SoC power +20%',
      input: {
        ...input,
        targetPowerW: input.targetPowerW * 1.2,
      },
    },
  ];

  const rawBaseline =
    evidenceMode === 'calibrated'
      ? simulateSocThermals({
          targetPowerW: input.targetPowerW,
          ambientTemperatureC:
            input.ambientTemperatureC,
          thermalResistanceCPerW:
            input.thermalResistanceCPerW,
          thermalMassJPerC:
            input.thermalMassJPerC,
          throttleTemperatureC:
            input.throttleTemperatureC,
          durationSeconds:
            input.durationSeconds,
          stepSeconds: input.stepSeconds,
        })
      : undefined;

  return scenarios.flatMap((entry) => {
    if (evidenceMode === 'calibrated') {
      const rawScenario = simulateSocThermals({
        targetPowerW: entry.input.targetPowerW,
        ambientTemperatureC:
          entry.input.ambientTemperatureC,
        thermalResistanceCPerW:
          entry.input.thermalResistanceCPerW,
        thermalMassJPerC:
          entry.input.thermalMassJPerC,
        throttleTemperatureC:
          entry.input.throttleTemperatureC,
        durationSeconds:
          entry.input.durationSeconds,
        stepSeconds: entry.input.stepSeconds,
      });

      if (!rawBaseline || !rawScenario) {
        return [];
      }

      const deltaPeakTemperatureC =
        rawScenario.peakTemperatureC -
        rawBaseline.peakTemperatureC;
      const deltaSustainedPerformancePercent =
        rawScenario.sustainedPerformancePercent -
        rawBaseline.sustainedPerformancePercent;
      const deltaSustainedPowerW =
        rawScenario.sustainedPowerW -
        rawBaseline.sustainedPowerW;

      return [{
        scenario: entry.scenario,
        label: entry.label,
        peakTemperatureC: Math.max(
          entry.input.ambientTemperatureC,
          baseline.peakTemperatureC +
            deltaPeakTemperatureC,
        ),
        sustainedPerformancePercent: Math.min(
          100,
          Math.max(
            0,
            baseline.sustainedPerformancePercent +
              deltaSustainedPerformancePercent,
          ),
        ),
        sustainedPowerW: Math.max(
          0,
          baseline.sustainedPowerW +
            deltaSustainedPowerW,
        ),
        throttleStartSecond:
          rawScenario.throttleStartSecond,
        deltaPeakTemperatureC,
        deltaSustainedPerformancePercent,
        deltaSustainedPowerW,
      }];
    }

    const result = simulateSocThermals({
      targetPowerW: entry.input.targetPowerW,
      ambientTemperatureC:
        entry.input.ambientTemperatureC,
      thermalResistanceCPerW:
        entry.input.thermalResistanceCPerW,
      thermalMassJPerC: entry.input.thermalMassJPerC,
      throttleTemperatureC:
        entry.input.throttleTemperatureC,
      durationSeconds: entry.input.durationSeconds,
      stepSeconds: entry.input.stepSeconds,
    });

    if (!result) return [];

    return [{
      scenario: entry.scenario,
      label: entry.label,
      peakTemperatureC: result.peakTemperatureC,
      sustainedPerformancePercent:
        result.sustainedPerformancePercent,
      sustainedPowerW: result.sustainedPowerW,
      throttleStartSecond: result.throttleStartSecond,
      deltaPeakTemperatureC:
        result.peakTemperatureC -
        baseline.peakTemperatureC,
      deltaSustainedPerformancePercent:
        result.sustainedPerformancePercent -
        baseline.sustainedPerformancePercent,
      deltaSustainedPowerW:
        result.sustainedPowerW -
        baseline.sustainedPowerW,
    }];
  });
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
  const twoNode = optionalTwoNodeResult(input);

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
      averageSimilarity:
        calibrated.evidence.averageSimilarity,
      averageCoverage:
        calibrated.evidence.averageCoverage,
      protocolKey: calibrated.evidence.protocolKey,
      referenceCount: calibrated.evidence.referenceCount,
      neighborIds: calibrated.evidence.neighborIds,
      evidenceScope:
        calibrated.evidence.evidenceScope,
      sameSocFamilyReferences:
        calibrated.evidence.sameSocFamilyReferences,
      sameSocVendorReferences:
        calibrated.evidence.sameSocVendorReferences,
      sourceRecordCount:
        calibrated.evidence.sourceRecordCount,
      publisherCount:
        calibrated.evidence.publisherCount,
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
      ...(twoNode ? { twoNode } : {}),
      warnings,
      sensitivity: thermalSensitivityScenarios(
        input,
        'calibrated',
        {
          peakTemperatureC:
            calibrated.simulation.peakTemperatureC,
          sustainedPerformancePercent:
            calibrated.simulation.sustainedPerformancePercent,
          sustainedPowerW:
            calibrated.simulation.sustainedPowerW,
        },
      ),
      note:
        'Sustained performance is calibrated from comparable measured thermal evidence. What-if sensitivity keeps that measured baseline, then applies deterministic physics-derived deltas for changed ambient temperature, cooling resistance or SoC power. When explicit two-node parameters are supplied, package and chassis temperatures are also simulated separately without replacing the calibrated baseline.'
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
    ...(twoNode ? { twoNode } : {}),
    warnings,
    sensitivity: thermalSensitivityScenarios(
      input,
      'physics-fallback',
      {
        peakTemperatureC: fallback.peakTemperatureC,
        sustainedPerformancePercent:
          fallback.sustainedPerformancePercent,
        sustainedPowerW: fallback.sustainedPowerW,
      },
    ),
    note:
      'No compatible measured sustained-performance evidence was available. Result uses the deterministic first-order thermal model only and should be treated as lower confidence. Explicit two-node parameters, when supplied, are returned as a separate package/surface physics trace.'
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
