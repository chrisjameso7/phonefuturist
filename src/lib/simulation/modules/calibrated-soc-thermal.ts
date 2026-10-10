import type { DeviceCorpus } from './device-corpus';
import { normalizeSocFamily } from './comparable-devices';
import {
  selectThermalCalibrationReferences,
  type ThermalDomain,
  type ThermalCalibrationQuery,
} from './thermal-calibration';

export const CALIBRATED_SOC_THERMAL_VERSION = 'calibrated-soc-thermal-0.2.0';

export interface CalibratedSocThermalInput
  extends Omit<ThermalCalibrationQuery, 'domain'> {
  domain: Exclude<ThermalDomain, 'surface_temperature'>;
  targetPowerW: number;
  ambientTemperatureC: number;
  thermalResistanceCPerW: number;
  thermalMassJPerC: number;
  throttleTemperatureC: number;
  durationSeconds?: number;
  stepSeconds?: number;
}

export interface CalibratedSocThermalPoint {
  second: number;
  temperatureC: number;
  powerW: number;
  performancePercent: number;
}

export interface CalibratedSocThermalResult {
  version: string;
  status: 'resolved' | 'unresolved';
  unresolvedReason?: string;
  evidence?: {
    domain: CalibratedSocThermalInput['domain'];
    referenceCount: number;
    targetSustainedPerformancePercent: number;
    confidence: number;
    averageSimilarity: number;
    averageCoverage: number;
    protocolKey: string;
    neighborIds: string[];
    evidenceScope:
      | 'same-soc-family'
      | 'same-soc-vendor'
      | 'protocol-cohort';
    sameSocFamilyReferences: number;
    sameSocVendorReferences: number;
  };
  simulation?: {
    peakTemperatureC: number;
    endTemperatureC: number;
    throttleStartSecond?: number;
    sustainedPerformancePercent: number;
    sustainedPowerW: number;
    points: CalibratedSocThermalPoint[];
  };
}

const q = (value: number, precision = 1000) =>
  Math.round(value * precision) / precision;

function valid(input: CalibratedSocThermalInput) {
  return [
    input.targetPowerW,
    input.ambientTemperatureC,
    input.thermalResistanceCPerW,
    input.thermalMassJPerC,
    input.throttleTemperatureC,
  ].every(Number.isFinite) &&
    input.targetPowerW > 0 &&
    input.thermalResistanceCPerW > 0 &&
    input.thermalMassJPerC > 0 &&
    input.throttleTemperatureC > input.ambientTemperatureC;
}

function normalizedPerformanceValue(value: number, unit: string) {
  const u = unit.trim().toLowerCase();
  if (u === 'percent' || u === '%') return value;
  if (u === 'ratio') return value * 100;
  return undefined;
}

function weightedTarget(
  refs: ReturnType<typeof selectThermalCalibrationReferences>['references'],
  targetSocVendor?: string,
  targetSocName?: string,
) {
  const usable = refs.flatMap((reference) => {
    const value = normalizedPerformanceValue(reference.value, reference.unit);
    if (value === undefined || !Number.isFinite(value) || value <= 0) return [];
    return [{
      value: Math.min(100, Math.max(1, value)),
      weight: Math.max(reference.score, 0.05) ** 2,
      score: reference.score,
      similarityScore: reference.similarityScore,
      coverageScore: reference.coverageScore,
      protocolKey: reference.protocolKey,
      socVendor: reference.socVendor,
      socName: reference.socName,
      id: reference.deviceVariantId,
    }];
  });

  if (!usable.length) return undefined;

  const sameFamily = targetSocName
    ? usable.filter(
        (item) =>
          item.socName &&
          normalizeSocFamily(item.socName) ===
            normalizeSocFamily(targetSocName),
      )
    : [];

  const sameVendor = targetSocVendor
    ? usable.filter(
        (item) =>
          item.socVendor === targetSocVendor,
      )
    : [];

  const selected =
    sameFamily.length >= 2
      ? sameFamily
      : sameVendor.length >= 2
        ? sameVendor
        : usable;

  const evidenceScope =
    selected === sameFamily
      ? 'same-soc-family'
      : selected === sameVendor
        ? 'same-soc-vendor'
        : 'protocol-cohort';

  const weight = selected.reduce((sum, item) => sum + item.weight, 0);
  return {
    percent:
      selected.reduce((sum, item) => sum + item.value * item.weight, 0) /
      Math.max(weight, Number.EPSILON),
    confidence:
      selected.reduce((sum, item) => sum + item.score, 0) / selected.length,
    averageSimilarity:
      selected.reduce(
        (sum, item) => sum + item.similarityScore,
        0,
      ) / selected.length,
    averageCoverage:
      selected.reduce(
        (sum, item) => sum + item.coverageScore,
        0,
      ) / selected.length,
    protocolKey: selected[0].protocolKey,
    neighborIds: [...new Set(selected.map((item) => item.id))],
    count: selected.length,
    evidenceScope,
    sameSocFamilyReferences:
      targetSocName
        ? usable.filter(
            (item) =>
              item.socName &&
              normalizeSocFamily(item.socName) ===
                normalizeSocFamily(targetSocName),
          ).length
        : 0,
    sameSocVendorReferences:
      targetSocVendor
        ? usable.filter(
            (item) =>
              item.socVendor === targetSocVendor,
          ).length
        : 0,
  };
}

export function simulateCalibratedSocThermals(
  corpus: DeviceCorpus,
  input: CalibratedSocThermalInput,
): CalibratedSocThermalResult {
  if (!valid(input)) {
    return {
      version: CALIBRATED_SOC_THERMAL_VERSION,
      status: 'unresolved',
      unresolvedReason: 'Thermal inputs are invalid.',
    };
  }

  const refs = selectThermalCalibrationReferences(corpus, input);
  const calibrated = weightedTarget(
    refs.references,
    input.socVendor,
    input.socName,
  );

  if (!calibrated) {
    return {
      version: CALIBRATED_SOC_THERMAL_VERSION,
      status: 'unresolved',
      unresolvedReason:
        'No comparable sustained-performance measurements are available for this thermal domain.',
    };
  }

  const duration = Math.max(1, Math.round(input.durationSeconds ?? 1800));
  const dt = input.stepSeconds ?? 1;
  if (!Number.isFinite(dt) || dt <= 0 || dt > 10) {
    return {
      version: CALIBRATED_SOC_THERMAL_VERSION,
      status: 'unresolved',
      unresolvedReason: 'Thermal step size must be greater than 0 and no more than 10 seconds.',
    };
  }

  const targetSustainedRatio = calibrated.percent / 100;
  const calibratedFloorPower = input.targetPowerW * targetSustainedRatio;
  const steps = Math.ceil(duration / dt);
  let temperatureC = input.ambientTemperatureC;
  let powerW = input.targetPowerW;
  let throttling = false;
  let throttleStartSecond: number | undefined;
  let peakTemperatureC = temperatureC;
  let sustainedPowerSum = 0;
  let sustainedPerformanceSum = 0;
  let sustainedSamples = 0;
  const points: CalibratedSocThermalPoint[] = [];
  const sampleEvery = Math.max(1, Math.round(30 / dt));

  for (let step = 1; step <= steps; step += 1) {
    const second = Math.min(duration, q(step * dt));

    if (!throttling && temperatureC >= input.throttleTemperatureC) {
      throttling = true;
      throttleStartSecond ??= second;
    } else if (
      throttling &&
      temperatureC <= input.throttleTemperatureC - 2
    ) {
      throttling = false;
    }

    if (throttling) {
      const over = Math.max(
        0,
        temperatureC - input.throttleTemperatureC,
      );
      const dynamicReduction = Math.min(0.35, 0.10 + over * 0.03);
      const dynamicPower = input.targetPowerW * (1 - dynamicReduction);
      powerW = Math.max(calibratedFloorPower, dynamicPower);
    } else {
      powerW = Math.min(
        input.targetPowerW,
        powerW + input.targetPowerW * 0.025,
      );
    }

    const coolingW =
      (temperatureC - input.ambientTemperatureC) /
      input.thermalResistanceCPerW;
    const deltaC =
      ((powerW - coolingW) / input.thermalMassJPerC) * dt;

    temperatureC = q(
      Math.max(input.ambientTemperatureC, temperatureC + deltaC),
    );
    powerW = q(powerW);
    peakTemperatureC = Math.max(peakTemperatureC, temperatureC);

    const performancePercent = q(
      Math.min(
        100,
        Math.max(0, (powerW / input.targetPowerW) * 100),
      ),
      10,
    );

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
    version: CALIBRATED_SOC_THERMAL_VERSION,
    status: 'resolved',
    evidence: {
      domain: input.domain,
      referenceCount: calibrated.count,
      targetSustainedPerformancePercent: q(calibrated.percent, 10),
      confidence: q(Math.min(1, Math.max(0, calibrated.confidence)), 100),
      averageSimilarity: q(
        Math.min(1, Math.max(0, calibrated.averageSimilarity)),
        100,
      ),
      averageCoverage: q(
        Math.min(1, Math.max(0, calibrated.averageCoverage)),
        100,
      ),
      protocolKey: calibrated.protocolKey,
      neighborIds: calibrated.neighborIds,
      evidenceScope: calibrated.evidenceScope,
      sameSocFamilyReferences:
        calibrated.sameSocFamilyReferences,
      sameSocVendorReferences:
        calibrated.sameSocVendorReferences,
    },
    simulation: {
      peakTemperatureC: q(peakTemperatureC, 100),
      endTemperatureC: q(temperatureC, 100),
      ...(throttleStartSecond !== undefined
        ? { throttleStartSecond }
        : {}),
      sustainedPerformancePercent: q(
        sustainedSamples
          ? sustainedPerformanceSum / sustainedSamples
          : 100,
        10,
      ),
      sustainedPowerW: q(
        sustainedSamples
          ? sustainedPowerSum / sustainedSamples
          : input.targetPowerW,
        100,
      ),
      points,
    },
  };
}
