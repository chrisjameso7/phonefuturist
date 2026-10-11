export const GPU_POWER_ENVELOPE_VERSION =
  'gpu-power-envelope-0.1.0';

export interface GpuPowerEnvelopeInput {
  peakGpuPowerW?: number;
  sustainableSocPowerW?: number;
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

  const warnings: string[] = [];

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

  // The GPU cannot sustainably consume more than the whole SoC package power
  // available to the workload. This is an upper ceiling, not an assertion that
  // all package power belongs to the GPU.
  const sustainableGpuPowerCeilingW =
    Math.min(
      peakGpuPowerW,
      sustainableSocPowerW,
    );

  const powerRetentionFraction =
    sustainableGpuPowerCeilingW /
    peakGpuPowerW;

  const thermallyPowerLimited =
    sustainableSocPowerW <
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
    powerRetentionFraction,
    powerRetentionPercent:
      powerRetentionFraction * 100,
    thermallyPowerLimited,
    warnings,
    note:
      'Power retention describes thermal/electrical headroom only. It is not a sustained-performance percentage, FPS estimate or benchmark-score multiplier.',
  };
}
