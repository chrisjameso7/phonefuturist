import type { DeviceCorpus, CorpusMeasurement } from './device-corpus';

export const CHARGING_THERMAL_CONTEXT_VERSION =
  'charging-thermal-context-0.1.0';

export interface ChargingThermalContextQuery {
  ambientTemperatureC?: number;
}

export interface ChargingThermalContext {
  version: string;
  status: 'resolved' | 'unresolved';
  matchedMeasurementIds: string[];
  confidenceMultiplier: number;
  note: string;
}

export function resolveChargingThermalContext(
  measurements: CorpusMeasurement[],
  query: ChargingThermalContextQuery,
): ChargingThermalContext {
  const target = query.ambientTemperatureC;

  if (target === undefined || !Number.isFinite(target)) {
    return {
      version: CHARGING_THERMAL_CONTEXT_VERSION,
      status: 'unresolved',
      matchedMeasurementIds: [],
      confidenceMultiplier: 1,
      note:
        'No ambient temperature was supplied. Charging output remains unmodified, but no thermal-context confidence boost is applied.',
    };
  }

  const withAmbient = measurements.filter(
    (measurement) =>
      measurement.workload === 'charging' &&
      measurement.ambientTemperatureC !== undefined &&
      Number.isFinite(measurement.ambientTemperatureC),
  );

  if (!withAmbient.length) {
    return {
      version: CHARGING_THERMAL_CONTEXT_VERSION,
      status: 'unresolved',
      matchedMeasurementIds: [],
      confidenceMultiplier: 0.85,
      note:
        'Target ambient temperature is known, but comparable charging measurements do not record ambient temperature. Confidence is reduced rather than inventing a thermal penalty.',
    };
  }

  const ranked = withAmbient
    .map((measurement) => ({
      measurement,
      distance: Math.abs(
        (measurement.ambientTemperatureC ?? target) - target,
      ),
    }))
    .sort((a, b) => a.distance - b.distance);

  const closest = ranked[0].distance;
  const matched = ranked
    .filter((row) => row.distance <= Math.max(2, closest))
    .map((row) => row.measurement);

  const multiplier =
    closest <= 2 ? 1 : closest <= 5 ? 0.92 : 0.78;

  return {
    version: CHARGING_THERMAL_CONTEXT_VERSION,
    status: 'resolved',
    matchedMeasurementIds: matched.map((measurement) => measurement.id),
    confidenceMultiplier: multiplier,
    note:
      closest <= 2
        ? 'Charging evidence includes measurements at a closely matched ambient temperature.'
        : 'Charging evidence exists with recorded ambient temperature, but the closest test condition differs from the target. Confidence is reduced rather than applying an unmeasured speed penalty.',
  };
}
