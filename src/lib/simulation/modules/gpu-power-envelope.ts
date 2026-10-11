export const GPU_POWER_ENVELOPE_VERSION =
  'gpu-power-envelope-0.1.0';

export interface GpuPowerEnvelopeInput {
  peakGpuPowerW?: number;
  sustainableSocPowerW?: number;
  /**
   * Optional package power reserved for CPU, memory controller, NPU and
   * other non-GPU blocks during the workload.
   */
  nonGpuPackagePowerW?: number;
  workload:
    | 'gpu_sustained'
    | 'gaming_sustained'
    | 'ray_tracing';
}

export interface GpuPowerEnvelopeResult {
  version: string;
  status: 'resolved' | 'partial' | 'unresolved';
  workload: GpuPowerEnvelopeInput['workload'];
  peakGpuPowerW?: number;
  sustainableSocPowerW?: number;
  sustainableGpuPowerCeilingW?: number;
  nonGpuPackagePowerW?: number;
  allocationMode?: 'package-upper-bound' | 'non-gpu-reserved';
  powerRetentionFraction?: number;
  powerRetentionPercent?: number;
  thermallyPowerLimited?: boolean;
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

export function calculateGpuPowerEnvelope(
  input: GpuPowerEnvelopeInput,
): GpuPowerEnvelopeResult {
  const peakGpuPowerW =
    positive(input.peakGpuPowerW)
      ? input.peakGpuPowerW
      : undefined;

  const sustainableSocPowerW =
    positive(input.sustainableSocPowerW)
      ? input.sustainableSocPowerW
      : undefined;

  const nonGpuPackagePowerW =
    input.nonGpuPackagePowerW === undefined
      ? undefined
      : typeof input.nonGpuPackagePowerW === 'number' &&
          Number.isFinite(input.nonGpuPackagePowerW) &&
          input.nonGpuPackagePowerW >= 0
        ? input.nonGpuPackagePowerW
        : undefined;

  const warnings: string[] = [];

  if (
    input.nonGpuPackagePowerW !== undefined &&
    nonGpuPackagePowerW === undefined
  ) {
    warnings.push(
      'Non-GPU package power must be zero or a positive finite value when supplied.',
    );
  }

  if (
    input.peakGpuPowerW !== undefined &&
    peakGpuPowerW === undefined
  ) {
    warnings.push(
      'Peak GPU power must be a positive finite value when supplied.',
    );
  }

  if (
    input.sustainableSocPowerW !==
      undefined &&
    sustainableSocPowerW === undefined
  ) {
    warnings.push(
      'Sustainable SoC power must be a positive finite value when supplied.',
    );
  }

  if (
    peakGpuPowerW === undefined &&
    sustainableSocPowerW === undefined
  ) {
    return {
      version:
        GPU_POWER_ENVELOPE_VERSION,
      status: 'unresolved',
      workload: input.workload,
      warnings,
      note:
        'GPU power headroom cannot be resolved without peak GPU power or a sustainable SoC power ceiling.',
    };
  }

  if (
    peakGpuPowerW === undefined ||
    sustainableSocPowerW === undefined
  ) {
    return {
      version:
        GPU_POWER_ENVELOPE_VERSION,
      status: 'partial',
      workload: input.workload,
      ...(peakGpuPowerW !== undefined
        ? { peakGpuPowerW }
        : {}),
      ...(sustainableSocPowerW !==
      undefined
        ? { sustainableSocPowerW }
        : {}),
      warnings,
      note:
        'Only one side of the GPU power envelope is known. No retention ratio is calculated.',
    };
  }

  // Without a non-GPU reservation, sustainable SoC power is only an upper
  // bound for GPU power. When an explicit non-GPU package load is supplied,
  // subtract it before applying the GPU peak ceiling.
  const gpuAvailablePackagePowerW =
    nonGpuPackagePowerW !== undefined
      ? Math.max(
          0,
          sustainableSocPowerW -
            nonGpuPackagePowerW,
        )
      : sustainableSocPowerW;

  const sustainableGpuPowerCeilingW =
    Math.min(
      peakGpuPowerW,
      gpuAvailablePackagePowerW,
    );

  const powerRetentionFraction =
    sustainableGpuPowerCeilingW /
    peakGpuPowerW;

  const thermallyPowerLimited =
    sustainableGpuPowerCeilingW <
    peakGpuPowerW;

  if (thermallyPowerLimited) {
    warnings.push(
      'Sustainable SoC power is below the supplied peak GPU power. The GPU is power-envelope constrained, but performance loss is not assumed to scale linearly with watts.',
    );
  }

  return {
    version:
      GPU_POWER_ENVELOPE_VERSION,
    status: 'resolved',
    workload: input.workload,
    peakGpuPowerW,
    sustainableSocPowerW,
    sustainableGpuPowerCeilingW,
    ...(nonGpuPackagePowerW !== undefined
      ? { nonGpuPackagePowerW }
      : {}),
    allocationMode:
      nonGpuPackagePowerW !== undefined
        ? 'non-gpu-reserved'
        : 'package-upper-bound',
    powerRetentionFraction,
    powerRetentionPercent:
      powerRetentionFraction * 100,
    thermallyPowerLimited,
    warnings,
    note:
      nonGpuPackagePowerW !== undefined
        ? 'GPU power ceiling subtracts the explicitly supplied non-GPU package load from sustainable SoC power before applying the GPU peak limit. Power retention is still not a direct FPS or benchmark multiplier.'
        : 'Sustainable SoC power is treated as an upper bound for GPU power because non-GPU package load is unknown. Power retention describes thermal/electrical headroom only and is not a direct FPS or benchmark multiplier.',
  };
}
