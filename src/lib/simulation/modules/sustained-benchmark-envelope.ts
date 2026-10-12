import type {
  PeakPerformanceEstimate,
} from './peak-performance-estimator';
import type {
  SustainedPerformanceEstimate,
} from './sustained-performance-estimator';

export const SUSTAINED_BENCHMARK_ENVELOPE_VERSION =
  'sustained-benchmark-envelope-0.1.0';

export interface SustainedBenchmarkEnvelopeInput {
  peak: PeakPerformanceEstimate;
  sustained?: SustainedPerformanceEstimate;
  finalSustainedPerformancePercent?: number;
}

export interface SustainedBenchmarkEnvelopeResult {
  version: string;
  status: 'resolved' | 'unresolved';
  compatibleFamily?: '3dmark-wild-life-extreme';
  peakScore?: number;
  sustainedRetentionPercent?: number;
  derivedSustainedScore?: number;
  derivedMinScore?: number;
  derivedMaxScore?: number;
  reason?: string;
  note: string;
}

function validPercent(
  value: unknown,
): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value > 0 &&
    value <= 100
  );
}

export function calculateSustainedBenchmarkEnvelope(
  input: SustainedBenchmarkEnvelopeInput,
): SustainedBenchmarkEnvelopeResult {
  const peak = input.peak;
  const sustained = input.sustained;

  if (
    peak.domain !== '3dmark_wle'
  ) {
    return {
      version:
        SUSTAINED_BENCHMARK_ENVELOPE_VERSION,
      status: 'unresolved',
      reason:
        'Only the 3DMark Wild Life Extreme family is currently approved for peak-to-sustained score derivation.',
      note:
        'Geekbench, Solar Bay and unrelated stability percentages are never multiplied together.',
    };
  }

  if (
    peak.status !== 'resolved' ||
    peak.evidenceScope !==
      'same-soc-family' ||
    peak.assumptionApplied ||
    peak.adjustedExpected === undefined
  ) {
    return {
      version:
        SUSTAINED_BENCHMARK_ENVELOPE_VERSION,
      status: 'unresolved',
      reason:
        'Peak Wild Life Extreme evidence must be measured for the exact SoC family with no generation-uplift assumption.',
      note:
        'Future-chip or same-vendor scenario scores are intentionally excluded from sustained-score derivation.',
    };
  }

  if (
    !sustained ||
    sustained.status !== 'resolved' ||
    sustained.domain !==
      'gpu_sustained' ||
    sustained.evidenceScope !==
      'same-soc-family'
  ) {
    return {
      version:
        SUSTAINED_BENCHMARK_ENVELOPE_VERSION,
      status: 'unresolved',
      reason:
        'Sustained GPU stability must also come from exact-family measured evidence.',
      note:
        'Cross-vendor, same-vendor and generic protocol-cohort stability are not used to derive an absolute sustained score.',
    };
  }

  const retentionPercent =
    validPercent(
      input.finalSustainedPerformancePercent,
    )
      ? input.finalSustainedPerformancePercent
      : validPercent(
            sustained.expectedPercent,
          )
        ? sustained.expectedPercent
        : undefined;

  if (
    retentionPercent === undefined
  ) {
    return {
      version:
        SUSTAINED_BENCHMARK_ENVELOPE_VERSION,
      status: 'unresolved',
      reason:
        'No valid sustained-retention percentage is available.',
      note:
        'A score is withheld rather than filling a missing retention value.',
    };
  }

  const retention =
    retentionPercent / 100;

  return {
    version:
      SUSTAINED_BENCHMARK_ENVELOPE_VERSION,
    status: 'resolved',
    compatibleFamily:
      '3dmark-wild-life-extreme',
    peakScore:
      peak.adjustedExpected,
    sustainedRetentionPercent:
      retentionPercent,
    derivedSustainedScore:
      peak.adjustedExpected *
      retention,
    ...(peak.baselineMin !== undefined
      ? {
          derivedMinScore:
            peak.baselineMin *
            retention,
        }
      : {}),
    ...(peak.baselineMax !== undefined
      ? {
          derivedMaxScore:
            peak.baselineMax *
            retention,
        }
      : {}),
    note:
      'Derived sustained score is a PhoneFuturist Wild Life Extreme-family envelope: exact-family measured peak score multiplied by exact-family measured/calibrated retention. It is not claimed to be an official 3DMark Stress Test loop score.',
  };
}
