import { buildCalibrationRegistry } from './calibration-registry';
import {
  selectThermalCalibrationReferences,
  type ThermalCalibrationQuery,
} from './thermal-calibration';
import { normalizeSocFamily } from './comparable-devices';
import type { DeviceCorpus } from './device-corpus';

export const SUSTAINED_PERFORMANCE_ESTIMATOR_VERSION =
  'sustained-performance-estimator-0.1.0';

export interface SustainedPerformanceEstimate {
  version: string;
  status: 'resolved' | 'unresolved';
  domain: Exclude<
    ThermalCalibrationQuery['domain'],
    'surface_temperature'
  >;
  expectedPercent?: number;
  minPercent?: number;
  maxPercent?: number;
  confidence?: number;
  averageSimilarity?: number;
  averageCoverage?: number;
  referenceCount: number;
  neighborIds: string[];
  evidenceScope?:
    | 'same-soc-family'
    | 'same-soc-vendor'
    | 'protocol-cohort';
  sameSocFamilyReferences: number;
  sameSocVendorReferences: number;
  sourceRecordCount: number;
  publisherCount: number;
  protocolKey?: string;
  unresolvedReason?: string;
}

function normalizedPercent(
  value: number,
  unit: string,
) {
  const normalized = unit.trim().toLowerCase();

  if (
    normalized === 'percent' ||
    normalized === '%'
  ) {
    return value;
  }

  if (normalized === 'ratio') {
    return value * 100;
  }

  return undefined;
}

export function estimateSustainedPerformance(
  corpus: DeviceCorpus,
  query: ThermalCalibrationQuery,
): SustainedPerformanceEstimate {
  if (query.domain === 'surface_temperature') {
    return {
      version:
        SUSTAINED_PERFORMANCE_ESTIMATOR_VERSION,
      status: 'unresolved',
      domain: 'gpu_sustained',
      referenceCount: 0,
      neighborIds: [],
      sameSocFamilyReferences: 0,
      sameSocVendorReferences: 0,
      sourceRecordCount: 0,
      publisherCount: 0,
      unresolvedReason:
        'Surface temperature is not a sustained-performance domain.',
    };
  }

  const selected =
    selectThermalCalibrationReferences(
      corpus,
      query,
    );

  const usable = selected.references.flatMap(
    (reference) => {
      const percent = normalizedPercent(
        reference.value,
        reference.unit,
      );

      if (
        percent === undefined ||
        !Number.isFinite(percent) ||
        percent <= 0
      ) {
        return [];
      }

      return [{
        ...reference,
        percent: Math.min(
          100,
          Math.max(0, percent),
        ),
      }];
    },
  );

  if (!usable.length) {
    return {
      version:
        SUSTAINED_PERFORMANCE_ESTIMATOR_VERSION,
      status: 'unresolved',
      domain: query.domain,
      referenceCount: 0,
      neighborIds: [],
      sameSocFamilyReferences: 0,
      sameSocVendorReferences: 0,
      sourceRecordCount: 0,
      publisherCount: 0,
      unresolvedReason:
        selected.unresolvedReason ??
        'No compatible measured sustained-performance evidence is available.',
    };
  }

  const sameFamily = query.socName
    ? usable.filter(
        (reference) =>
          reference.socName &&
          normalizeSocFamily(
            reference.socName,
          ) ===
            normalizeSocFamily(
              query.socName!,
            ),
      )
    : [];

  const sameVendor = query.socVendor
    ? usable.filter(
        (reference) =>
          reference.socVendor ===
          query.socVendor,
      )
    : [];

  const references =
    sameFamily.length >= 2
      ? sameFamily
      : sameVendor.length >= 2
        ? sameVendor
        : usable;

  const evidenceScope:
    | 'same-soc-family'
    | 'same-soc-vendor'
    | 'protocol-cohort' =
    references === sameFamily
      ? 'same-soc-family'
      : references === sameVendor
        ? 'same-soc-vendor'
        : 'protocol-cohort';

  const weighted = references.map(
    (reference) => ({
      ...reference,
      weight:
        Math.max(reference.score, 0.05) **
        2,
    }),
  );

  const totalWeight = weighted.reduce(
    (sum, reference) =>
      sum + reference.weight,
    0,
  );

  const expectedPercent =
    weighted.reduce(
      (sum, reference) =>
        sum +
        reference.percent *
          reference.weight,
      0,
    ) /
    Math.max(
      totalWeight,
      Number.EPSILON,
    );

  return {
    version:
      SUSTAINED_PERFORMANCE_ESTIMATOR_VERSION,
    status: 'resolved',
    domain: query.domain,
    expectedPercent,
    minPercent: Math.min(
      ...references.map(
        (reference) =>
          reference.percent,
      ),
    ),
    maxPercent: Math.max(
      ...references.map(
        (reference) =>
          reference.percent,
      ),
    ),
    confidence:
      references.reduce(
        (sum, reference) =>
          sum + reference.score,
        0,
      ) / references.length,
    averageSimilarity:
      references.reduce(
        (sum, reference) =>
          sum +
          reference.similarityScore,
        0,
      ) / references.length,
    averageCoverage:
      references.reduce(
        (sum, reference) =>
          sum +
          reference.coverageScore,
        0,
      ) / references.length,
    referenceCount: references.length,
    neighborIds: [
      ...new Set(
        references.map(
          (reference) =>
            reference.deviceVariantId,
        ),
      ),
    ],
    evidenceScope,
    sameSocFamilyReferences:
      sameFamily.length,
    sameSocVendorReferences:
      sameVendor.length,
    sourceRecordCount:
      new Set(
        references.map(
          (reference) =>
            reference.sourceId,
        ),
      ).size,
    publisherCount:
      new Set(
        references.map(
          (reference) =>
            reference.publisher,
        ),
      ).size,
    protocolKey:
      references[0]?.protocolKey,
  };
}

export function estimateLiveSustainedPerformance(
  query: ThermalCalibrationQuery,
) {
  return estimateSustainedPerformance(
    buildCalibrationRegistry(),
    query,
  );
}
