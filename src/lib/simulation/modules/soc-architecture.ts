export const SOC_ARCHITECTURE_MODEL_VERSION =
  'soc-architecture-0.1.0';

export interface SocCpuClusterInput {
  label?: string;
  cores: number;
  maxClockGhz: number;
  /**
   * Relative IPC multiplier supplied by the user or evidence source.
   * 1.0 means reference IPC. It is never inferred from process node.
   */
  relativeIpc?: number;
}

export interface SocArchitectureInput {
  cpuClusters: SocCpuClusterInput[];
  peakSocPowerW?: number;
  memoryBandwidthGbps?: number;
  fabricationNodeNm?: number;
}

export interface SocArchitectureResult {
  version: string;
  status: 'resolved' | 'partial' | 'unresolved';
  totalCpuCores?: number;
  maximumCpuClockGhz?: number;
  clockCapacityIndex?: number;
  clockCapacityPerWIndex?: number;
  ipcAdjustedSingleThreadIndex?: number;
  ipcAdjustedAggregateIndex?: number;
  ipcAdjustedAggregatePerWIndex?: number;
  memoryBandwidthPerCoreGbps?: number;
  fabricationNodeNm?: number;
  completeIpcCoverage: boolean;
  warnings: string[];
  note: string;
}

function positive(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value > 0
  );
}

export function calculateSocArchitecture(
  input: SocArchitectureInput,
): SocArchitectureResult {
  const warnings: string[] = [];

  const validClusters =
    input.cpuClusters.filter(
      (cluster) =>
        Number.isInteger(cluster.cores) &&
        cluster.cores > 0 &&
        positive(cluster.maxClockGhz),
    );

  if (
    validClusters.length !==
    input.cpuClusters.length
  ) {
    warnings.push(
      'One or more CPU clusters have invalid core counts or clock values and were excluded.',
    );
  }

  if (!validClusters.length) {
    return {
      version: SOC_ARCHITECTURE_MODEL_VERSION,
      status: 'unresolved',
      completeIpcCoverage: false,
      warnings,
      note:
        'No valid CPU cluster geometry is available. No architecture indices were calculated.',
    };
  }

  const totalCpuCores =
    validClusters.reduce(
      (sum, cluster) =>
        sum + cluster.cores,
      0,
    );

  const maximumCpuClockGhz =
    Math.max(
      ...validClusters.map(
        (cluster) =>
          cluster.maxClockGhz,
      ),
    );

  const clockCapacityIndex =
    validClusters.reduce(
      (sum, cluster) =>
        sum +
        cluster.cores *
          cluster.maxClockGhz,
      0,
    );

  const completeIpcCoverage =
    validClusters.every(
      (cluster) =>
        positive(cluster.relativeIpc),
    );

  const ipcAdjustedSingleThreadIndex =
    completeIpcCoverage
      ? Math.max(
          ...validClusters.map(
            (cluster) =>
              cluster.maxClockGhz *
              cluster.relativeIpc!,
          ),
        )
      : undefined;

  const ipcAdjustedAggregateIndex =
    completeIpcCoverage
      ? validClusters.reduce(
          (sum, cluster) =>
            sum +
            cluster.cores *
              cluster.maxClockGhz *
              cluster.relativeIpc!,
          0,
        )
      : undefined;

  if (
    input.peakSocPowerW !== undefined &&
    !positive(input.peakSocPowerW)
  ) {
    warnings.push(
      'Peak SoC power must be a positive finite value when supplied.',
    );
  }

  if (
    input.memoryBandwidthGbps !== undefined &&
    !positive(input.memoryBandwidthGbps)
  ) {
    warnings.push(
      'Memory bandwidth must be a positive finite value when supplied.',
    );
  }

  if (
    input.fabricationNodeNm !== undefined &&
    !positive(input.fabricationNodeNm)
  ) {
    warnings.push(
      'Fabrication node must be a positive finite value when supplied.',
    );
  }

  const peakPower =
    positive(input.peakSocPowerW)
      ? input.peakSocPowerW
      : undefined;

  const bandwidth =
    positive(input.memoryBandwidthGbps)
      ? input.memoryBandwidthGbps
      : undefined;

  const fabricationNodeNm =
    positive(input.fabricationNodeNm)
      ? input.fabricationNodeNm
      : undefined;

  if (fabricationNodeNm !== undefined) {
    warnings.push(
      'Fabrication node is recorded as metadata only. The model does not infer performance or efficiency gains from node size without measured evidence.',
    );
  }

  const resolvedSignals = [
    clockCapacityIndex,
    ipcAdjustedAggregateIndex,
    peakPower,
    bandwidth,
  ].filter(
    (value) => value !== undefined,
  ).length;

  return {
    version: SOC_ARCHITECTURE_MODEL_VERSION,
    status:
      resolvedSignals >= 3
        ? 'resolved'
        : 'partial',
    totalCpuCores,
    maximumCpuClockGhz,
    clockCapacityIndex,
    ...(peakPower !== undefined
      ? {
          clockCapacityPerWIndex:
            clockCapacityIndex /
            peakPower,
        }
      : {}),
    ...(ipcAdjustedSingleThreadIndex !==
    undefined
      ? {
          ipcAdjustedSingleThreadIndex,
        }
      : {}),
    ...(ipcAdjustedAggregateIndex !==
    undefined
      ? {
          ipcAdjustedAggregateIndex,
          ...(peakPower !== undefined
            ? {
                ipcAdjustedAggregatePerWIndex:
                  ipcAdjustedAggregateIndex /
                  peakPower,
              }
            : {}),
        }
      : {}),
    ...(bandwidth !== undefined
      ? {
          memoryBandwidthPerCoreGbps:
            bandwidth /
            totalCpuCores,
        }
      : {}),
    ...(fabricationNodeNm !== undefined
      ? { fabricationNodeNm }
      : {}),
    completeIpcCoverage,
    warnings,
    note:
      completeIpcCoverage
        ? 'Clock/core geometry and explicitly supplied relative IPC produce transparent dimensionless architecture indices. These are comparison aids, not benchmark-score predictions.'
        : 'Clock/core geometry is available, but IPC-adjusted indices are withheld because relative IPC was not supplied for every valid cluster. No IPC values are guessed.',
  };
}

export interface SocArchitectureComparison {
  clockCapacityDeltaPercent?: number;
  ipcAdjustedSingleThreadDeltaPercent?: number;
  ipcAdjustedAggregateDeltaPercent?: number;
  clockCapacityPerWDeltaPercent?: number;
  ipcAdjustedAggregatePerWDeltaPercent?: number;
  note: string;
}

function deltaPercent(
  target: number | undefined,
  reference: number | undefined,
) {
  if (
    target === undefined ||
    reference === undefined ||
    !Number.isFinite(target) ||
    !Number.isFinite(reference) ||
    reference === 0
  ) {
    return undefined;
  }

  return (
    (target / reference - 1) *
    100
  );
}

export function compareSocArchitectures(
  target: SocArchitectureResult,
  reference: SocArchitectureResult,
): SocArchitectureComparison {
  return {
    clockCapacityDeltaPercent:
      deltaPercent(
        target.clockCapacityIndex,
        reference.clockCapacityIndex,
      ),
    ipcAdjustedSingleThreadDeltaPercent:
      deltaPercent(
        target.ipcAdjustedSingleThreadIndex,
        reference.ipcAdjustedSingleThreadIndex,
      ),
    ipcAdjustedAggregateDeltaPercent:
      deltaPercent(
        target.ipcAdjustedAggregateIndex,
        reference.ipcAdjustedAggregateIndex,
      ),
    clockCapacityPerWDeltaPercent:
      deltaPercent(
        target.clockCapacityPerWIndex,
        reference.clockCapacityPerWIndex,
      ),
    ipcAdjustedAggregatePerWDeltaPercent:
      deltaPercent(
        target.ipcAdjustedAggregatePerWIndex,
        reference.ipcAdjustedAggregatePerWIndex,
      ),
    note:
      'Architecture deltas compare supplied structural assumptions only. They do not automatically translate into Geekbench, 3DMark, gaming FPS or real application performance.',
  };
}
