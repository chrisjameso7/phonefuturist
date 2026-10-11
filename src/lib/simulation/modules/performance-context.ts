import type {
  PeakPerformanceEstimate,
  PeakBenchmarkDomain,
} from './peak-performance-estimator';
import type {
  SocArchitectureResult,
} from './soc-architecture';

export const PERFORMANCE_CONTEXT_VERSION =
  'performance-context-0.1.0';

export type PerformanceScoreDisposition =
  | 'measured-family'
  | 'explicit-assumption'
  | 'withheld';

export type PerformanceArchitectureRelevance =
  | 'cpu-single-thread'
  | 'cpu-multi-thread'
  | 'gpu'
  | 'gpu-ray-tracing';

export interface PerformanceContextInput {
  peak: PeakPerformanceEstimate;
  architecture?: SocArchitectureResult;
}

export interface PerformanceContextResult {
  version: string;
  status: 'resolved' | 'partial' | 'unresolved';
  domain: PeakBenchmarkDomain;
  scoreDisposition: PerformanceScoreDisposition;
  benchmarkRelevance: PerformanceArchitectureRelevance;
  benchmarkScore?: number;
  benchmarkUnit?: string;
  architectureAvailable: boolean;
  architectureCanExplainDirection: boolean;
  architectureSignals: Array<{
    key:
      | 'ipc_single_thread'
      | 'ipc_aggregate'
      | 'ipc_aggregate_per_w'
      | 'memory_bandwidth_per_core'
      | 'fabrication_node';
    label: string;
    value: number;
    unit: string;
  }>;
  warnings: string[];
  note: string;
}

function relevance(
  domain: PeakBenchmarkDomain,
): PerformanceArchitectureRelevance {
  switch (domain) {
    case 'geekbench6_single':
      return 'cpu-single-thread';
    case 'geekbench6_multi':
      return 'cpu-multi-thread';
    case '3dmark_solar_bay':
      return 'gpu-ray-tracing';
    case '3dmark_wle':
      return 'gpu';
  }
}

export function buildPerformanceContext(
  input: PerformanceContextInput,
): PerformanceContextResult {
  const benchmarkRelevance =
    relevance(input.peak.domain);

  const scoreDisposition:
    PerformanceScoreDisposition =
    input.peak.status !== 'resolved'
      ? 'withheld'
      : input.peak.assumptionApplied
        ? 'explicit-assumption'
        : input.peak.evidenceScope ===
            'same-soc-family'
          ? 'measured-family'
          : 'withheld';

  const architecture =
    input.architecture;

  const signals:
    PerformanceContextResult['architectureSignals'] =
    [];

  if (
    architecture
      ?.ipcAdjustedSingleThreadIndex !==
    undefined
  ) {
    signals.push({
      key: 'ipc_single_thread',
      label:
        'IPC-adjusted single-thread index',
      value:
        architecture
          .ipcAdjustedSingleThreadIndex,
      unit: 'index',
    });
  }

  if (
    architecture
      ?.ipcAdjustedAggregateIndex !==
    undefined
  ) {
    signals.push({
      key: 'ipc_aggregate',
      label:
        'IPC-adjusted aggregate CPU index',
      value:
        architecture
          .ipcAdjustedAggregateIndex,
      unit: 'index',
    });
  }

  if (
    architecture
      ?.ipcAdjustedAggregatePerWIndex !==
    undefined
  ) {
    signals.push({
      key: 'ipc_aggregate_per_w',
      label:
        'IPC-adjusted aggregate per-watt index',
      value:
        architecture
          .ipcAdjustedAggregatePerWIndex,
      unit: 'index/W',
    });
  }

  if (
    architecture
      ?.memoryBandwidthPerCoreGbps !==
    undefined
  ) {
    signals.push({
      key: 'memory_bandwidth_per_core',
      label:
        'Memory bandwidth per CPU core',
      value:
        architecture
          .memoryBandwidthPerCoreGbps,
      unit: 'GB/s',
    });
  }

  if (
    architecture?.fabricationNodeNm !==
    undefined
  ) {
    signals.push({
      key: 'fabrication_node',
      label: 'Fabrication node metadata',
      value:
        architecture.fabricationNodeNm,
      unit: 'nm',
    });
  }

  const architectureAvailable =
    Boolean(architecture) &&
    architecture?.status !== 'unresolved';

  const architectureCanExplainDirection =
    architectureAvailable &&
    (
      (
        benchmarkRelevance ===
          'cpu-single-thread' &&
        architecture
          ?.ipcAdjustedSingleThreadIndex !==
          undefined
      ) ||
      (
        benchmarkRelevance ===
          'cpu-multi-thread' &&
        architecture
          ?.ipcAdjustedAggregateIndex !==
          undefined
      )
    );

  const warnings: string[] = [];

  if (
    architectureAvailable &&
    (
      benchmarkRelevance === 'gpu' ||
      benchmarkRelevance ===
        'gpu-ray-tracing'
    )
  ) {
    warnings.push(
      'CPU cluster geometry does not predict 3DMark GPU or ray-tracing performance. A GPU architecture/power model is still required.',
    );
  }

  if (
    architecture
      ?.fabricationNodeNm !== undefined
  ) {
    warnings.push(
      'Fabrication node is context only and is not converted into a performance or efficiency multiplier.',
    );
  }

  if (
    scoreDisposition === 'withheld' &&
    architectureCanExplainDirection
  ) {
    warnings.push(
      'Architecture signals can describe structural direction, but they cannot manufacture a benchmark score without target-family measurements or an explicit scenario assumption.',
    );
  }

  return {
    version: PERFORMANCE_CONTEXT_VERSION,
    status:
      scoreDisposition !== 'withheld'
        ? 'resolved'
        : architectureAvailable
          ? 'partial'
          : 'unresolved',
    domain: input.peak.domain,
    scoreDisposition,
    benchmarkRelevance,
    ...(scoreDisposition !== 'withheld' &&
    input.peak.adjustedExpected !== undefined
      ? {
          benchmarkScore:
            input.peak.adjustedExpected,
          benchmarkUnit:
            input.peak.unit ??
            'points',
        }
      : {}),
    architectureAvailable,
    architectureCanExplainDirection,
    architectureSignals: signals,
    warnings,
    note:
      scoreDisposition === 'measured-family'
        ? 'Benchmark score is grounded in measured exact-family evidence. Architecture indices are explanatory context only.'
        : scoreDisposition ===
            'explicit-assumption'
          ? 'Benchmark score is an explicitly labelled what-if scenario built from measured reference evidence plus a caller-supplied uplift. Architecture indices do not alter the score.'
          : architectureCanExplainDirection
            ? 'Peak benchmark score is withheld. CPU architecture indices may explain structural direction, but no benchmark points are derived from them.'
            : 'Peak benchmark score is withheld. Available architecture inputs are not sufficient to predict this benchmark domain.',
  };
}
