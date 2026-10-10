import { buildCalibrationRegistry } from './calibration-registry';
import {
  findComparableDevices,
  normalizeSocFamily,
} from './comparable-devices';
import type { DeviceCorpus } from './device-corpus';

export const PEAK_PERFORMANCE_ESTIMATOR_VERSION =
  'peak-performance-estimator-0.1.0';

export type PeakBenchmarkDomain =
  | 'geekbench6_single'
  | 'geekbench6_multi'
  | '3dmark_wle'
  | '3dmark_solar_bay';

export interface PeakPerformanceQuery {
  domain: PeakBenchmarkDomain;
  manufacturer?: string;
  socVendor?: string;
  socName?: string;
  batteryMah?: number;
  displayDiagonalInches?: number;
  refreshRateHz?: number;
  thicknessMm?: number;
  weightG?: number;
  bodyVolumeMm3?: number;
  coolingClass?:
    | 'passive-graphite'
    | 'vapor-chamber'
    | 'large-vapor-chamber'
    | 'active-fan'
    | 'other';
  assumedGenerationUpliftPercent?: number;
  limit?: number;
}

export interface PeakPerformanceEstimate {
  version: string;
  status: 'resolved' | 'unresolved';
  domain: PeakBenchmarkDomain;
  metric?: string;
  unit?: string;
  baselineExpected?: number;
  baselineMin?: number;
  baselineMax?: number;
  adjustedExpected?: number;
  adjustedMin?: number;
  adjustedMax?: number;
  assumedGenerationUpliftPercent?: number;
  assumptionApplied: boolean;
  confidence?: number;
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
  note?: string;
  unresolvedReason?: string;
}

const metricByDomain: Record<
  PeakBenchmarkDomain,
  string
> = {
  geekbench6_single:
    'geekbench_6_7_single_core',
  geekbench6_multi:
    'geekbench_6_7_multi_core',
  '3dmark_wle':
    '3dmark_wild_life_extreme_unlimited',
  '3dmark_solar_bay':
    '3dmark_solar_bay',
};

function normalizeUnit(value: string) {
  return value.trim().toLowerCase();
}

export function estimatePeakPerformance(
  corpus: DeviceCorpus,
  query: PeakPerformanceQuery,
): PeakPerformanceEstimate {
  const metric = metricByDomain[query.domain];

  const sourceById = new Map(
    corpus.sources.map((source) => [
      source.id,
      source,
    ]),
  );

  const eligibleIds = new Set(
    corpus.measurements
      .filter(
        (measurement) =>
          measurement.workload ===
            'benchmark' &&
          measurement.evidenceKind ===
            'measured' &&
          measurement.metric === metric &&
          Number.isFinite(
            measurement.value,
          ) &&
          measurement.value > 0,
      )
      .map(
        (measurement) =>
          measurement.deviceVariantId,
      ),
  );

  const evidenceCorpus: DeviceCorpus = {
    ...corpus,
    devices: corpus.devices.filter(
      (device) =>
        eligibleIds.has(
          device.variant.id,
        ),
    ),
  };

  const matches =
    findComparableDevices(
      evidenceCorpus,
      {
        batteryMah: query.batteryMah,
        manufacturer:
          query.manufacturer,
        socVendor: query.socVendor,
        socName: query.socName,
        displayDiagonalInches:
          query.displayDiagonalInches,
        refreshRateHz:
          query.refreshRateHz,
        thicknessMm:
          query.thicknessMm,
        weightG: query.weightG,
        bodyVolumeMm3:
          query.bodyVolumeMm3,
        coolingClass:
          query.coolingClass,
        limit: Math.max(
          query.limit ?? 8,
          8,
        ),
      },
    );

  const refs = matches.flatMap(
    (match) =>
      corpus.measurements
        .filter(
          (measurement) =>
            measurement.deviceVariantId ===
              match.device.variant.id &&
            measurement.workload ===
              'benchmark' &&
            measurement.evidenceKind ===
              'measured' &&
            measurement.metric ===
              metric &&
            Number.isFinite(
              measurement.value,
            ) &&
            measurement.value > 0,
        )
        .map((measurement) => {
          const source =
            sourceById.get(
              measurement.sourceId,
            );

          return {
            deviceVariantId:
              match.device.variant.id,
            value:
              measurement.value,
            unit: measurement.unit,
            score: match.score,
            sourceId:
              measurement.sourceId,
            publisher:
              source?.publisher ??
              measurement.sourceId,
            protocolKey: [
              source?.publisher ??
                measurement.sourceId,
              source?.protocolVersion ??
                source?.protocol ??
                'unspecified',
              measurement.metric,
              normalizeUnit(
                measurement.unit,
              ),
            ]
              .join('::')
              .toLowerCase(),
            socVendor:
              match.device.variant.soc
                ?.vendor,
            socName:
              match.device.variant.soc
                ?.name,
          };
        }),
  );

  if (!refs.length) {
    return {
      version:
        PEAK_PERFORMANCE_ESTIMATOR_VERSION,
      status: 'unresolved',
      domain: query.domain,
      assumptionApplied: false,
      referenceCount: 0,
      neighborIds: [],
      sameSocFamilyReferences: 0,
      sameSocVendorReferences: 0,
      sourceRecordCount: 0,
      publisherCount: 0,
      unresolvedReason:
        'No protocol-compatible measured peak benchmark evidence is available for this benchmark domain.',
    };
  }

  const groups = new Map<
    string,
    typeof refs
  >();

  for (const ref of refs) {
    const group =
      groups.get(ref.protocolKey) ??
      [];
    group.push(ref);
    groups.set(
      ref.protocolKey,
      group,
    );
  }

  const compatible =
    [...groups.values()].sort(
      (a, b) => {
        const weightA =
          a.reduce(
            (sum, item) =>
              sum +
              Math.max(
                item.score,
                0.05,
              ) **
                2,
            0,
          );

        const weightB =
          b.reduce(
            (sum, item) =>
              sum +
              Math.max(
                item.score,
                0.05,
              ) **
                2,
            0,
          );

        return weightB - weightA;
      },
    )[0] ?? [];

  const sameFamily =
    query.socName
      ? compatible.filter(
          (ref) =>
            ref.socName &&
            normalizeSocFamily(
              ref.socName,
            ) ===
              normalizeSocFamily(
                query.socName!,
              ),
        )
      : [];

  const sameVendor =
    query.socVendor
      ? compatible.filter(
          (ref) =>
            ref.socVendor ===
            query.socVendor,
        )
      : [];

  const selected =
    sameFamily.length >= 2
      ? sameFamily
      : sameVendor.length >= 2
        ? sameVendor
        : compatible;

  if (!selected.length) {
    return {
      version:
        PEAK_PERFORMANCE_ESTIMATOR_VERSION,
      status: 'unresolved',
      domain: query.domain,
      assumptionApplied: false,
      referenceCount: 0,
      neighborIds: [],
      sameSocFamilyReferences:
        sameFamily.length,
      sameSocVendorReferences:
        sameVendor.length,
      sourceRecordCount: 0,
      publisherCount: 0,
      unresolvedReason:
        'No compatible measured peak benchmark references remained after protocol isolation.',
    };
  }

  const evidenceScope:
    | 'same-soc-family'
    | 'same-soc-vendor'
    | 'protocol-cohort' =
    selected === sameFamily
      ? 'same-soc-family'
      : selected === sameVendor
        ? 'same-soc-vendor'
        : 'protocol-cohort';

  const weighted = selected.map(
    (ref) => ({
      ...ref,
      weight:
        Math.max(
          ref.score,
          0.05,
        ) ** 2,
    }),
  );

  const totalWeight =
    weighted.reduce(
      (sum, ref) =>
        sum + ref.weight,
      0,
    );

  const baselineExpected =
    weighted.reduce(
      (sum, ref) =>
        sum +
        ref.value *
          ref.weight,
      0,
    ) /
    Math.max(
      totalWeight,
      Number.EPSILON,
    );

  const baselineMin =
    Math.min(
      ...selected.map(
        (ref) => ref.value,
      ),
    );

  const baselineMax =
    Math.max(
      ...selected.map(
        (ref) => ref.value,
      ),
    );

  const uplift =
    query.assumedGenerationUpliftPercent;

  const validUplift =
    uplift !== undefined &&
    Number.isFinite(uplift);

  const multiplier =
    validUplift
      ? 1 + uplift! / 100
      : 1;

  return {
    version:
      PEAK_PERFORMANCE_ESTIMATOR_VERSION,
    status: 'resolved',
    domain: query.domain,
    metric,
    unit: selected[0].unit,
    baselineExpected,
    baselineMin,
    baselineMax,
    adjustedExpected:
      baselineExpected *
      multiplier,
    adjustedMin:
      baselineMin *
      multiplier,
    adjustedMax:
      baselineMax *
      multiplier,
    ...(validUplift
      ? {
          assumedGenerationUpliftPercent:
            uplift,
        }
      : {}),
    assumptionApplied:
      validUplift,
    confidence:
      selected.reduce(
        (sum, ref) =>
          sum + ref.score,
        0,
      ) / selected.length,
    referenceCount:
      selected.length,
    neighborIds: [
      ...new Set(
        selected.map(
          (ref) =>
            ref.deviceVariantId,
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
        selected.map(
          (ref) =>
            ref.sourceId,
        ),
      ).size,
    publisherCount:
      new Set(
        selected.map(
          (ref) =>
            ref.publisher,
        ),
      ).size,
    protocolKey:
      selected[0].protocolKey,
    note:
      validUplift
        ? 'Peak benchmark baseline comes only from measured, protocol-compatible references. The final adjusted score applies the user-supplied generation uplift as an explicit assumption, not as measured evidence.'
        : 'Peak benchmark result is a measured evidence baseline only. No hidden architecture, node or generational uplift is applied.',
  };
}

export function estimateLivePeakPerformance(
  query: PeakPerformanceQuery,
) {
  return estimatePeakPerformance(
    buildCalibrationRegistry(),
    query,
  );
}
