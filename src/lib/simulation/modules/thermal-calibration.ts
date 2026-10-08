import type { DeviceCorpus } from './device-corpus';
import { findComparableDevices } from './comparable-devices';

export const THERMAL_CALIBRATION_VERSION = 'thermal-calibration-0.1.0';

export type ThermalDomain =
  | 'cpu_sustained'
  | 'gpu_sustained'
  | 'gaming_sustained'
  | 'ray_tracing'
  | 'surface_temperature';

export interface ThermalCalibrationQuery {
  batteryMah?: number;
  manufacturer?: string;
  socVendor?: string;
  displayDiagonalInches?: number;
  refreshRateHz?: number;
  thicknessMm?: number;
  weightG?: number;
  bodyVolumeMm3?: number;
  coolingClass?: 'passive-graphite' | 'vapor-chamber' | 'large-vapor-chamber' | 'active-fan' | 'other';
  domain: ThermalDomain;
  limit?: number;
}

export interface ThermalCalibrationReference {
  deviceVariantId: string;
  score: number;
  metric: string;
  value: number;
  unit: string;
  reasons: string[];
}

export interface ThermalCalibrationResult {
  version: string;
  status: 'resolved' | 'unresolved';
  references: ThermalCalibrationReference[];
  unresolvedReason?: string;
}

function metricMatches(domain: ThermalDomain, metric: string) {
  const m = metric.toLowerCase();
  switch (domain) {
    case 'cpu_sustained':
      return m.includes('cpu') && (m.includes('sustain') || m.includes('stability'));
    case 'gpu_sustained':
      return m.includes('gpu') && (m.includes('sustain') || m.includes('stability'));
    case 'gaming_sustained':
      return m.includes('gaming') && (m.includes('fps') || m.includes('sustain') || m.includes('stability'));
    case 'ray_tracing':
      return m.includes('ray') || m.includes('solar bay');
    case 'surface_temperature':
      return m.includes('temperature') || m.includes('surface temp');
  }
}

export function selectThermalCalibrationReferences(
  corpus: DeviceCorpus,
  query: ThermalCalibrationQuery,
): ThermalCalibrationResult {
  const comparables = findComparableDevices(corpus, {
    batteryMah: query.batteryMah,
    manufacturer: query.manufacturer,
    socVendor: query.socVendor,
    displayDiagonalInches: query.displayDiagonalInches,
    refreshRateHz: query.refreshRateHz,
    thicknessMm: query.thicknessMm,
    weightG: query.weightG,
    bodyVolumeMm3: query.bodyVolumeMm3,
    coolingClass: query.coolingClass,
    limit: Math.max(query.limit ?? 8, 8),
  });

  const references = comparables.flatMap((match) =>
    corpus.measurements
      .filter(
        (measurement) =>
          measurement.deviceVariantId === match.device.variant.id &&
          (measurement.workload === 'thermal' || measurement.workload === 'benchmark') &&
          metricMatches(query.domain, measurement.metric) &&
          Number.isFinite(measurement.value),
      )
      .map((measurement) => ({
        deviceVariantId: match.device.variant.id,
        score: match.score,
        metric: measurement.metric,
        value: measurement.value,
        unit: measurement.unit,
        reasons: match.reasons,
      })),
  );

  if (!references.length) {
    return {
      version: THERMAL_CALIBRATION_VERSION,
      status: 'unresolved',
      references: [],
      unresolvedReason:
        'No comparable devices with matching sustained thermal/performance evidence were found.',
    };
  }

  return {
    version: THERMAL_CALIBRATION_VERSION,
    status: 'resolved',
    references: references.slice(0, query.limit ?? 5),
  };
}
