export const GPU_ARCHITECTURE_MODEL_VERSION =
  'gpu-architecture-0.1.0';

export interface GpuArchitectureInput {
  executionUnits?: number;
  shaderCores?: number;
  peakClockGhz?: number;
  peakGpuPowerW?: number;
  memoryBandwidthGbps?: number;
  renderOutputUnits?: number;
  textureUnits?: number;
  rayTracingUnits?: number;
  /**
   * Optional relative architecture efficiency supplied by the user or an
   * evidence source. 1.0 is the chosen reference architecture.
   * It is never inferred from process node, vendor or generation name.
   */
  relativeArchitectureEfficiency?: number;
  fabricationNodeNm?: number;
}

export interface GpuArchitectureResult {
  version: string;
  status: 'resolved' | 'partial' | 'unresolved';
  computeGeometrySource?:
    | 'shader-cores'
    | 'execution-units';
  computeGeometryCount?: number;
  peakClockGhz?: number;
  rawComputeClockIndex?: number;
  efficiencyAdjustedComputeIndex?: number;
  rawComputePerWIndex?: number;
  efficiencyAdjustedComputePerWIndex?: number;
  memoryBandwidthGbps?: number;
  bandwidthPerComputeUnit?: number;
  textureUnits?: number;
  renderOutputUnits?: number;
  rayTracingUnits?: number;
  rayTracingDensityPerComputeUnit?: number;
  peakGpuPowerW?: number;
  fabricationNodeNm?: number;
  completeEfficiencyCoverage: boolean;
  warnings: string[];
  note: string;
}

function positive(
  value: unknown,
): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value > 0
  );
}

function positiveInteger(
  value: unknown,
): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value > 0
  );
}

export function calculateGpuArchitecture(
  input: GpuArchitectureInput,
): GpuArchitectureResult {
  const warnings: string[] = [];

  const shaderCores =
    positiveInteger(input.shaderCores)
      ? input.shaderCores
      : undefined;

  const executionUnits =
    positiveInteger(input.executionUnits)
      ? input.executionUnits
      : undefined;

  const computeGeometryCount =
    shaderCores ?? executionUnits;

  const computeGeometrySource =
    shaderCores !== undefined
      ? 'shader-cores' as const
      : executionUnits !== undefined
        ? 'execution-units' as const
        : undefined;

  if (
    input.shaderCores !== undefined &&
    shaderCores === undefined
  ) {
    warnings.push(
      'Shader-core count must be a positive integer when supplied.',
    );
  }

  if (
    input.executionUnits !== undefined &&
    executionUnits === undefined
  ) {
    warnings.push(
      'Execution-unit count must be a positive integer when supplied.',
    );
  }

  if (
    shaderCores !== undefined &&
    executionUnits !== undefined
  ) {
    warnings.push(
      'Both shader cores and execution units were supplied. Shader-core count is used as the primary compute geometry because the two quantities are not assumed to be directly equivalent.',
    );
  }

  const peakClockGhz =
    positive(input.peakClockGhz)
      ? input.peakClockGhz
      : undefined;

  const peakGpuPowerW =
    positive(input.peakGpuPowerW)
      ? input.peakGpuPowerW
      : undefined;

  const memoryBandwidthGbps =
    positive(input.memoryBandwidthGbps)
      ? input.memoryBandwidthGbps
      : undefined;

  const renderOutputUnits =
    positiveInteger(input.renderOutputUnits)
      ? input.renderOutputUnits
      : undefined;

  const textureUnits =
    positiveInteger(input.textureUnits)
      ? input.textureUnits
      : undefined;

  const rayTracingUnits =
    positiveInteger(input.rayTracingUnits)
      ? input.rayTracingUnits
      : undefined;

  const relativeArchitectureEfficiency =
    positive(
      input.relativeArchitectureEfficiency,
    )
      ? input.relativeArchitectureEfficiency
      : undefined;

  const fabricationNodeNm =
    positive(input.fabricationNodeNm)
      ? input.fabricationNodeNm
      : undefined;

  if (
    input.peakGpuPowerW !== undefined &&
    peakGpuPowerW === undefined
  ) {
    warnings.push(
      'Peak GPU power must be a positive finite value when supplied.',
    );
  }

  if (
    input.memoryBandwidthGbps !== undefined &&
    memoryBandwidthGbps === undefined
  ) {
    warnings.push(
      'Memory bandwidth must be a positive finite value when supplied.',
    );
  }

  if (
    input.relativeArchitectureEfficiency !==
      undefined &&
    relativeArchitectureEfficiency === undefined
  ) {
    warnings.push(
      'Relative GPU architecture efficiency must be a positive finite value when supplied.',
    );
  }

  if (
    fabricationNodeNm !== undefined
  ) {
    warnings.push(
      'Fabrication node is recorded as metadata only. It does not create an automatic GPU performance or efficiency multiplier.',
    );
  }

  const rawComputeClockIndex =
    computeGeometryCount !== undefined &&
    peakClockGhz !== undefined
      ? computeGeometryCount *
        peakClockGhz
      : undefined;

  const efficiencyAdjustedComputeIndex =
    rawComputeClockIndex !== undefined &&
    relativeArchitectureEfficiency !==
      undefined
      ? rawComputeClockIndex *
        relativeArchitectureEfficiency
      : undefined;

  const rawComputePerWIndex =
    rawComputeClockIndex !== undefined &&
    peakGpuPowerW !== undefined
      ? rawComputeClockIndex /
        peakGpuPowerW
      : undefined;

  const efficiencyAdjustedComputePerWIndex =
    efficiencyAdjustedComputeIndex !==
      undefined &&
    peakGpuPowerW !== undefined
      ? efficiencyAdjustedComputeIndex /
        peakGpuPowerW
      : undefined;

  const bandwidthPerComputeUnit =
    memoryBandwidthGbps !== undefined &&
    computeGeometryCount !== undefined
      ? memoryBandwidthGbps /
        computeGeometryCount
      : undefined;

  const rayTracingDensityPerComputeUnit =
    rayTracingUnits !== undefined &&
    computeGeometryCount !== undefined
      ? rayTracingUnits /
        computeGeometryCount
      : undefined;

  if (
    rayTracingUnits === undefined
  ) {
    warnings.push(
      'Ray-tracing throughput remains unresolved because no ray-tracing unit geometry was supplied.',
    );
  }

  const availableSignals = [
    rawComputeClockIndex,
    memoryBandwidthGbps,
    peakGpuPowerW,
    textureUnits,
    renderOutputUnits,
    rayTracingUnits,
  ].filter(
    (value) => value !== undefined,
  ).length;

  if (
    availableSignals === 0
  ) {
    return {
      version:
        GPU_ARCHITECTURE_MODEL_VERSION,
      status: 'unresolved',
      completeEfficiencyCoverage: false,
      warnings,
      note:
        'No usable GPU architecture geometry is available. No GPU indices were calculated.',
    };
  }

  return {
    version:
      GPU_ARCHITECTURE_MODEL_VERSION,
    status:
      rawComputeClockIndex !== undefined &&
      (
        memoryBandwidthGbps !== undefined ||
        peakGpuPowerW !== undefined
      )
        ? 'resolved'
        : 'partial',
    ...(computeGeometrySource
      ? { computeGeometrySource }
      : {}),
    ...(computeGeometryCount !== undefined
      ? { computeGeometryCount }
      : {}),
    ...(peakClockGhz !== undefined
      ? { peakClockGhz }
      : {}),
    ...(rawComputeClockIndex !== undefined
      ? { rawComputeClockIndex }
      : {}),
    ...(efficiencyAdjustedComputeIndex !==
    undefined
      ? {
          efficiencyAdjustedComputeIndex,
        }
      : {}),
    ...(rawComputePerWIndex !== undefined
      ? { rawComputePerWIndex }
      : {}),
    ...(efficiencyAdjustedComputePerWIndex !==
    undefined
      ? {
          efficiencyAdjustedComputePerWIndex,
        }
      : {}),
    ...(memoryBandwidthGbps !== undefined
      ? { memoryBandwidthGbps }
      : {}),
    ...(bandwidthPerComputeUnit !== undefined
      ? { bandwidthPerComputeUnit }
      : {}),
    ...(textureUnits !== undefined
      ? { textureUnits }
      : {}),
    ...(renderOutputUnits !== undefined
      ? { renderOutputUnits }
      : {}),
    ...(rayTracingUnits !== undefined
      ? { rayTracingUnits }
      : {}),
    ...(rayTracingDensityPerComputeUnit !==
    undefined
      ? {
          rayTracingDensityPerComputeUnit,
        }
      : {}),
    ...(peakGpuPowerW !== undefined
      ? { peakGpuPowerW }
      : {}),
    ...(fabricationNodeNm !== undefined
      ? { fabricationNodeNm }
      : {}),
    completeEfficiencyCoverage:
      relativeArchitectureEfficiency !==
      undefined,
    warnings,
    note:
      relativeArchitectureEfficiency !==
      undefined
        ? 'GPU geometry, clock, memory bandwidth and explicitly supplied relative architecture efficiency produce transparent comparison indices. They are not benchmark-score predictions.'
        : 'GPU geometry, clock and memory bandwidth produce transparent structural indices. Architecture efficiency remains unknown because no explicit relative efficiency value was supplied.',
  };
}
