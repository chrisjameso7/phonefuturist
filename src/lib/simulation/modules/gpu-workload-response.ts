import type {
  GpuArchitectureResult,
} from './gpu-architecture';
import type {
  GpuPowerEnvelopeResult,
} from './gpu-power-envelope';
import type {
  GpuWorkloadDemandResult,
} from './gpu-workload-demand';

export const GPU_WORKLOAD_RESPONSE_VERSION =
  'gpu-workload-response-0.1.0';

export type GpuWorkloadResponseState =
  | 'unresolved'
  | 'demand-only'
  | 'architecture-context'
  | 'power-constrained'
  | 'fully-contextualized';

export interface GpuWorkloadResponseInput {
  architecture?: GpuArchitectureResult;
  powerEnvelope?: GpuPowerEnvelopeResult;
  demand?: GpuWorkloadDemandResult;
}

export interface GpuWorkloadResponseResult {
  version: string;
  status: 'resolved' | 'partial' | 'unresolved';
  state: GpuWorkloadResponseState;
  workload?: string;
  frameBudgetMs?: number;
  megapixelsPerSecond?: number;
  complexityWeightedMegapixelsPerSecond?: number;
  megaRaysPerSecondDemand?: number;
  gpuComputeClockIndex?: number;
  gpuMemoryBandwidthGbps?: number;
  gpuBandwidthPerComputeUnit?: number;
  theoreticalBandwidthBytesPerRenderedPixel?: number;
  structuralComputeIndexPerWeightedMegapixelPerSecond?: number;
  estimatedRequiredMemoryBandwidthGbps?: number;
  memoryBandwidthHeadroomGbps?: number;
  memoryBandwidthHeadroomRatio?: number;
  memoryBandwidthPressure:
    | 'unknown'
    | 'ample'
    | 'tight'
    | 'over-budget';
  peakGpuPowerW?: number;
  sustainableGpuPowerCeilingW?: number;
  powerRetentionPercent?: number;
  powerPressure:
    | 'unknown'
    | 'none'
    | 'mild'
    | 'moderate'
    | 'severe';
  architectureCoverage:
    | 'none'
    | 'raster'
    | 'ray-tracing';
  bottleneckSignals: string[];
  warnings: string[];
  note: string;
}

function powerPressure(
  retention: number | undefined,
): GpuWorkloadResponseResult['powerPressure'] {
  if (
    retention === undefined ||
    !Number.isFinite(retention)
  ) {
    return 'unknown';
  }

  if (retention >= 95) return 'none';
  if (retention >= 80) return 'mild';
  if (retention >= 60) return 'moderate';
  return 'severe';
}

export function interpretGpuWorkloadResponse(
  input: GpuWorkloadResponseInput,
): GpuWorkloadResponseResult {
  const architecture =
    input.architecture;
  const envelope =
    input.powerEnvelope;
  const demand =
    input.demand;

  const bottleneckSignals: string[] = [];
  const warnings: string[] = [];

  const rasterArchitectureAvailable =
    architecture?.status !== 'unresolved' &&
    architecture?.rawComputeClockIndex !==
      undefined &&
    architecture?.memoryBandwidthGbps !==
      undefined;

  const rtArchitectureAvailable =
    rasterArchitectureAvailable &&
    architecture?.rayTracingUnits !==
      undefined;

  const architectureCoverage:
    GpuWorkloadResponseResult['architectureCoverage'] =
    rtArchitectureAvailable
      ? 'ray-tracing'
      : rasterArchitectureAvailable
        ? 'raster'
        : 'none';

  const pressure = powerPressure(
    envelope?.powerRetentionPercent,
  );

  if (
    envelope?.thermallyPowerLimited
  ) {
    bottleneckSignals.push(
      'The sustainable package power ceiling is below supplied peak GPU power.',
    );
  }

  if (
    pressure === 'moderate' ||
    pressure === 'severe'
  ) {
    bottleneckSignals.push(
      'Sustained GPU power headroom is materially below the supplied peak envelope.',
    );
  }

  if (
    demand?.workload === 'ray-tracing' &&
    architectureCoverage !==
      'ray-tracing'
  ) {
    bottleneckSignals.push(
      'Ray-tracing workload demand is present, but RT-unit geometry is missing.',
    );
  }

  if (
    architecture?.memoryBandwidthGbps !==
      undefined &&
    demand?.estimatedRequiredMemoryBandwidthGbps !==
      undefined &&
    architecture.memoryBandwidthGbps <
      demand.estimatedRequiredMemoryBandwidthGbps
  ) {
    bottleneckSignals.push(
      'The explicit workload memory-traffic estimate exceeds the supplied GPU memory bandwidth.',
    );
  }

  if (
    demand?.status === 'resolved' &&
    architectureCoverage === 'none'
  ) {
    bottleneckSignals.push(
      'Workload demand is known, but GPU supply-side architecture is not sufficiently specified.',
    );
  }

  if (
    architectureCoverage !== 'none' &&
    demand?.status !== 'resolved'
  ) {
    bottleneckSignals.push(
      'GPU architecture is available, but workload resolution/FPS demand is incomplete.',
    );
  }

  if (
    envelope?.powerRetentionPercent !==
      undefined
  ) {
    warnings.push(
      'Power retention is not converted linearly into FPS or benchmark-score retention.',
    );
  }

  if (
    architecture?.computeGeometrySource ===
      'execution-units' ||
    architecture?.computeGeometrySource ===
      'shader-cores'
  ) {
    warnings.push(
      'Structural compute-density ratios are meaningful only within a consistent GPU geometry convention; shader cores and execution units are not treated as cross-vendor equivalents.',
    );
  }

  if (
    architecture
      ?.efficiencyAdjustedComputeIndex ===
      undefined &&
    architecture?.rawComputeClockIndex !==
      undefined
  ) {
    warnings.push(
      'Architecture efficiency is unknown, so only raw structural GPU indices are available.',
    );
  }

  const state:
    GpuWorkloadResponseState =
    !architecture &&
    !envelope &&
    !demand
      ? 'unresolved'
      : demand?.status === 'resolved' &&
        architectureCoverage === 'none' &&
        envelope?.status !== 'resolved'
        ? 'demand-only'
        : architectureCoverage !== 'none' &&
          envelope?.thermallyPowerLimited
          ? 'power-constrained'
          : architectureCoverage !== 'none' &&
            demand?.status === 'resolved' &&
            envelope?.status === 'resolved'
            ? 'fully-contextualized'
            : 'architecture-context';

  return {
    version:
      GPU_WORKLOAD_RESPONSE_VERSION,
    status:
      state === 'unresolved'
        ? 'unresolved'
        : state === 'fully-contextualized' ||
            state === 'power-constrained'
          ? 'resolved'
          : 'partial',
    state,
    workload: demand?.workload,
    frameBudgetMs: demand?.frameBudgetMs,
    megapixelsPerSecond:
      demand?.megapixelsPerSecond,
    complexityWeightedMegapixelsPerSecond:
      demand
        ?.complexityWeightedMegapixelsPerSecond,
    megaRaysPerSecondDemand:
      demand?.megaRaysPerSecondDemand,
    gpuComputeClockIndex:
      architecture?.rawComputeClockIndex,
    gpuMemoryBandwidthGbps:
      architecture?.memoryBandwidthGbps,
    gpuBandwidthPerComputeUnit:
      architecture?.bandwidthPerComputeUnit,
    ...(architecture?.memoryBandwidthGbps !==
      undefined &&
    demand?.megapixelsPerSecond !== undefined &&
    demand.megapixelsPerSecond > 0
      ? {
          theoreticalBandwidthBytesPerRenderedPixel:
            architecture.memoryBandwidthGbps *
            1000 /
            demand.megapixelsPerSecond,
        }
      : {}),
    ...(architecture?.rawComputeClockIndex !==
      undefined &&
    demand?.complexityWeightedMegapixelsPerSecond !==
      undefined &&
    demand.complexityWeightedMegapixelsPerSecond >
      0
      ? {
          structuralComputeIndexPerWeightedMegapixelPerSecond:
            architecture.rawComputeClockIndex /
            demand.complexityWeightedMegapixelsPerSecond,
        }
      : {}),
    ...(demand?.estimatedRequiredMemoryBandwidthGbps !==
      undefined
      ? {
          estimatedRequiredMemoryBandwidthGbps:
            demand.estimatedRequiredMemoryBandwidthGbps,
        }
      : {}),
    ...(architecture?.memoryBandwidthGbps !==
      undefined &&
    demand?.estimatedRequiredMemoryBandwidthGbps !==
      undefined
      ? {
          memoryBandwidthHeadroomGbps:
            architecture.memoryBandwidthGbps -
            demand.estimatedRequiredMemoryBandwidthGbps,
          memoryBandwidthHeadroomRatio:
            architecture.memoryBandwidthGbps /
            demand.estimatedRequiredMemoryBandwidthGbps,
        }
      : {}),
    memoryBandwidthPressure:
      architecture?.memoryBandwidthGbps !==
          undefined &&
        demand?.estimatedRequiredMemoryBandwidthGbps !==
          undefined
        ? architecture.memoryBandwidthGbps <
          demand.estimatedRequiredMemoryBandwidthGbps
          ? 'over-budget'
          : architecture.memoryBandwidthGbps /
                demand.estimatedRequiredMemoryBandwidthGbps <
              1.25
            ? 'tight'
            : 'ample'
        : 'unknown',
    peakGpuPowerW:
      envelope?.peakGpuPowerW ??
      architecture?.peakGpuPowerW,
    sustainableGpuPowerCeilingW:
      envelope?.sustainableGpuPowerCeilingW,
    powerRetentionPercent:
      envelope?.powerRetentionPercent,
    powerPressure: pressure,
    architectureCoverage,
    bottleneckSignals,
    warnings,
    note:
      'This layer interprets demand, GPU structure and sustainable power together. It surfaces constraints and missing evidence but deliberately does not estimate FPS or benchmark points until compatible measured workload-response curves exist.',
  };
}
