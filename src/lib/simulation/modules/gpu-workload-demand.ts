export const GPU_WORKLOAD_DEMAND_VERSION =
  'gpu-workload-demand-0.1.0';

export type GpuWorkloadKind =
  | 'raster'
  | 'gaming'
  | 'ray-tracing';

export interface GpuWorkloadDemandInput {
  workload: GpuWorkloadKind;
  renderWidthPx?: number;
  renderHeightPx?: number;
  targetFps?: number;
  renderScaleFraction?: number;
  relativeComplexity?: number;
  raysPerPixel?: number;
  /**
   * Optional workload traffic assumption. This is deliberately explicit
   * because real bytes-per-pixel traffic depends on overdraw, compression,
   * tiling, cache behavior, textures and render passes.
   */
  estimatedMemoryTrafficBytesPerPixel?: number;
}

export interface GpuWorkloadDemandResult {
  version: string;
  status: 'resolved' | 'partial' | 'unresolved';
  workload: GpuWorkloadKind;
  renderWidthPx?: number;
  renderHeightPx?: number;
  effectiveRenderWidthPx?: number;
  effectiveRenderHeightPx?: number;
  targetFps?: number;
  frameBudgetMs?: number;
  megapixelsPerFrame?: number;
  megapixelsPerSecond?: number;
  relativeComplexity?: number;
  complexityWeightedMegapixelsPerSecond?: number;
  raysPerPixel?: number;
  megaRaysPerSecondDemand?: number;
  estimatedMemoryTrafficBytesPerPixel?: number;
  estimatedRequiredMemoryBandwidthGbps?: number;
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

export function calculateGpuWorkloadDemand(
  input: GpuWorkloadDemandInput,
): GpuWorkloadDemandResult {
  const warnings: string[] = [];

  const width =
    positive(input.renderWidthPx)
      ? input.renderWidthPx
      : undefined;
  const height =
    positive(input.renderHeightPx)
      ? input.renderHeightPx
      : undefined;
  const targetFps =
    positive(input.targetFps)
      ? input.targetFps
      : undefined;

  const renderScaleFraction =
    input.renderScaleFraction === undefined
      ? 1
      : positive(input.renderScaleFraction)
        ? input.renderScaleFraction
        : undefined;

  if (
    input.renderScaleFraction !== undefined &&
    renderScaleFraction === undefined
  ) {
    warnings.push(
      'Render scale must be a positive finite fraction when supplied.',
    );
  }

  const relativeComplexity =
    input.relativeComplexity === undefined
      ? 1
      : positive(input.relativeComplexity)
        ? input.relativeComplexity
        : undefined;

  if (
    input.relativeComplexity !== undefined &&
    relativeComplexity === undefined
  ) {
    warnings.push(
      'Relative workload complexity must be a positive finite value when supplied.',
    );
  }

  const raysPerPixel =
    positive(input.raysPerPixel)
      ? input.raysPerPixel
      : undefined;

  const estimatedMemoryTrafficBytesPerPixel =
    positive(
      input.estimatedMemoryTrafficBytesPerPixel,
    )
      ? input.estimatedMemoryTrafficBytesPerPixel
      : undefined;

  if (
    input.raysPerPixel !== undefined &&
    raysPerPixel === undefined
  ) {
    warnings.push(
      'Rays per pixel must be a positive finite value when supplied.',
    );
  }

  if (
    input.estimatedMemoryTrafficBytesPerPixel !==
      undefined &&
    estimatedMemoryTrafficBytesPerPixel ===
      undefined
  ) {
    warnings.push(
      'Estimated memory traffic must be a positive finite number of bytes per rendered pixel when supplied.',
    );
  }

  if (
    width === undefined ||
    height === undefined ||
    targetFps === undefined ||
    renderScaleFraction === undefined
  ) {
    return {
      version: GPU_WORKLOAD_DEMAND_VERSION,
      status:
        width !== undefined ||
        height !== undefined ||
        targetFps !== undefined
          ? 'partial'
          : 'unresolved',
      workload: input.workload,
      ...(width !== undefined
        ? { renderWidthPx: width }
        : {}),
      ...(height !== undefined
        ? { renderHeightPx: height }
        : {}),
      ...(targetFps !== undefined
        ? {
            targetFps,
            frameBudgetMs: 1000 / targetFps,
          }
        : {}),
      warnings,
      note:
        'Render width, render height and target FPS are all required to resolve GPU workload demand.',
    };
  }

  const effectiveRenderWidthPx =
    width * renderScaleFraction;
  const effectiveRenderHeightPx =
    height * renderScaleFraction;
  const megapixelsPerFrame =
    (
      effectiveRenderWidthPx *
      effectiveRenderHeightPx
    ) / 1_000_000;
  const megapixelsPerSecond =
    megapixelsPerFrame * targetFps;

  const complexityWeightedMegapixelsPerSecond =
    relativeComplexity !== undefined
      ? megapixelsPerSecond *
        relativeComplexity
      : undefined;

  const megaRaysPerSecondDemand =
    input.workload === 'ray-tracing' &&
    raysPerPixel !== undefined
      ? megapixelsPerSecond *
        raysPerPixel
      : undefined;

  const estimatedRequiredMemoryBandwidthGbps =
    estimatedMemoryTrafficBytesPerPixel !==
      undefined
      ? (
          megapixelsPerSecond *
          estimatedMemoryTrafficBytesPerPixel
        ) / 1000
      : undefined;

  if (
    input.workload === 'ray-tracing' &&
    raysPerPixel === undefined
  ) {
    warnings.push(
      'Ray-tracing pixel throughput is resolved, but ray demand remains unknown because rays per pixel was not supplied.',
    );
  }

  return {
    version: GPU_WORKLOAD_DEMAND_VERSION,
    status: 'resolved',
    workload: input.workload,
    renderWidthPx: width,
    renderHeightPx: height,
    effectiveRenderWidthPx,
    effectiveRenderHeightPx,
    targetFps,
    frameBudgetMs: 1000 / targetFps,
    megapixelsPerFrame,
    megapixelsPerSecond,
    ...(relativeComplexity !== undefined
      ? {
          relativeComplexity,
          complexityWeightedMegapixelsPerSecond,
        }
      : {}),
    ...(raysPerPixel !== undefined
      ? { raysPerPixel }
      : {}),
    ...(megaRaysPerSecondDemand !== undefined
      ? { megaRaysPerSecondDemand }
      : {}),
    ...(estimatedMemoryTrafficBytesPerPixel !==
    undefined
      ? {
          estimatedMemoryTrafficBytesPerPixel,
        }
      : {}),
    ...(estimatedRequiredMemoryBandwidthGbps !==
    undefined
      ? {
          estimatedRequiredMemoryBandwidthGbps,
        }
      : {}),
    warnings,
    note:
      'This is a deterministic workload-demand model. Pixel throughput, frame budget, optional relative complexity and explicit memory-traffic assumptions describe demand only; they do not predict FPS without a compatible measured GPU response curve.',
  };
}
