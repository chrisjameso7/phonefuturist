import { isSelectableSoc } from '../soc-model-catalog';
import { buildCalibrationRegistry } from './calibration-registry';
import {
  findComparableDevices,
  normalizeSocFamily,
} from './comparable-devices';
import type { DeviceCorpus } from './device-corpus';

export const PEAK_PERFORMANCE_ESTIMATOR_VERSION =
  'peak-performance-estimator-0.2.0';

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
  /** Optional specific measured predecessor to use for a what-if projection. */
  referenceSocName?: string;
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

export const PEAK_METRIC_BY_DOMAIN: Record<
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
  const metric = PEAK_METRIC_BY_DOMAIN[query.domain];

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
            // The canonical measurement metric carries the benchmark
            // family/version identity. Do not split compatible Geekbench or
            // 3DMark rows merely because review pages describe their full
            // benchmark suites differently.
            protocolKey: [
              measurement.metric,
              source?.protocolVersion ??
                'canonical-metric-version',
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

  const rankedGroups = [...groups.values()].sort((a, b) => {
    const weight = (rows: typeof refs) => rows.reduce(
      (sum, item) => sum + Math.max(item.score, 0.05) ** 2, 0,
    );
    return weight(b) - weight(a);
  });
  const familyMatches = (rows: typeof refs) => query.socName
    ? rows.filter(ref => ref.socName &&
        normalizeSocFamily(ref.socName) === normalizeSocFamily(query.socName!))
    : [];
  const vendorMatches = (rows: typeof refs) => query.socVendor
    ? rows.filter(ref => ref.socVendor === query.socVendor)
    : [];

  // Never let a large unrelated benchmark protocol group mask actual
  // exact-family measured evidence in another compatible metric group.
  const compatible = rankedGroups.find(group => familyMatches(group).length > 0)
    ?? rankedGroups.find(group => vendorMatches(group).length > 0)
    ?? rankedGroups[0] ?? [];
  const sameFamily = familyMatches(compatible);
  const sameVendor = vendorMatches(compatible);
  const requestedReference = query.referenceSocName?.trim();
  const namedReferences = requestedReference
    ? sameVendor.filter(ref => ref.socName &&
        normalizeSocFamily(ref.socName) === normalizeSocFamily(requestedReference))
    : [];
  const uplift = query.assumedGenerationUpliftPercent;
  const validUplift = uplift !== undefined && Number.isFinite(uplift) &&
    uplift > -100 && uplift <= 300;
  // Curated, selectable models can always run an explicitly identified
  // same-vendor baseline scenario. Unknown chip names remain unresolved.
  const canProject = !!query.socVendor && !!query.socName &&
    isSelectableSoc(query.socVendor, query.socName) &&
    sameVendor.length > 0;
  const automaticScenario = sameFamily.length === 0 && canProject && !validUplift;
  // Explicit references cannot silently fall back to an unrelated generation.
  const referenceCandidates = requestedReference ? namedReferences : sameVendor;
  const selected = sameFamily.length > 0 ? sameFamily
    : (validUplift || automaticScenario) && referenceCandidates.length > 0
      ? referenceCandidates : [];

  if (!selected.length) {
    return {
      version: PEAK_PERFORMANCE_ESTIMATOR_VERSION,
      status: 'unresolved',
      domain: query.domain,
      metric,
      unit: compatible[0]?.unit,
      assumptionApplied: false,
      referenceCount: 0,
      neighborIds: [],
      sameSocFamilyReferences: sameFamily.length,
      sameSocVendorReferences: sameVendor.length,
      sourceRecordCount: 0,
      publisherCount: 0,
      unresolvedReason: requestedReference && !namedReferences.length
        ? 'The selected predecessor has no compatible measured benchmark evidence in this protocol.'
        : sameVendor.length > 0
        ? 'This chip has no exact-family measurements; select a supported chip or supply a generation uplift for a same-vendor scenario.'
        : 'No compatible measured peak benchmark evidence exists for this exact SoC family.',
      note: 'No unrelated vendor or benchmark protocol is substituted.',
    };
  }

  const evidenceScope: 'same-soc-family' | 'same-soc-vendor' | 'protocol-cohort' =
    sameFamily.length > 0 ? 'same-soc-family' : 'same-soc-vendor';

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
      validUplift || automaticScenario,
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
      automaticScenario && requestedReference
        ? `Simulated baseline from the selected measured predecessor ${requestedReference} with 0% assumed uplift. This is not a measurement of the target SoC.`
        : automaticScenario
        ? 'Simulated baseline scenario for a selectable chip without exact measured benchmarks: same-vendor reference performance with 0% assumed uplift. This is not a measurement or a claim of equal real-world performance.'
        : validUplift && evidenceScope === 'same-soc-vendor'
        ? 'Scenario only: the baseline comes from measured same-vendor predecessor/reference chips, then the caller-supplied generation uplift is applied explicitly. This is not measured evidence for the target SoC.'
        : validUplift
          ? 'Peak benchmark baseline comes from measured exact-family references. The final adjusted score applies the caller-supplied uplift as an explicit what-if assumption.'
          : 'Peak benchmark result is resolved only from measured exact-family evidence. No hidden architecture, node or generational uplift is applied.',
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
