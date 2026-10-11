export const CAMERA_VIDEO_WORKLOAD_VERSION =
  'camera-video-workload-0.1.0';

export type VideoChromaSubsampling =
  | '4:2:0'
  | '4:2:2'
  | '4:4:4';

export interface CameraVideoWorkloadInput {
  widthPx?: number;
  heightPx?: number;
  frameRateFps?: number;
  bitDepth?: number;
  chromaSubsampling?: VideoChromaSubsampling;
  encodedBitrateMbps?: number;
  recordingDurationMinutes?: number;
  cameraPipelinePowerW?: number;
}

export interface CameraVideoWorkloadResult {
  version: string;
  status: 'resolved' | 'partial' | 'unresolved';
  widthPx?: number;
  heightPx?: number;
  frameRateFps?: number;
  megapixelsPerFrame?: number;
  megapixelsPerSecond?: number;
  bitDepth?: number;
  chromaSubsampling?: VideoChromaSubsampling;
  uncompressedBitsPerPixel?: number;
  uncompressedDataRateGbps?: number;
  encodedBitrateMbps?: number;
  compressionRatioVsRaw?: number;
  recordingDurationMinutes?: number;
  estimatedFileSizeGb?: number;
  cameraPipelinePowerW?: number;
  estimatedPipelineEnergyWh?: number;
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

function chromaSamplesPerPixel(
  chroma: VideoChromaSubsampling,
) {
  switch (chroma) {
    case '4:2:0':
      return 1.5;
    case '4:2:2':
      return 2;
    case '4:4:4':
      return 3;
  }
}

export function calculateCameraVideoWorkload(
  input: CameraVideoWorkloadInput,
): CameraVideoWorkloadResult {
  const warnings: string[] = [];

  const widthPx =
    positive(input.widthPx)
      ? input.widthPx
      : undefined;
  const heightPx =
    positive(input.heightPx)
      ? input.heightPx
      : undefined;
  const frameRateFps =
    positive(input.frameRateFps)
      ? input.frameRateFps
      : undefined;
  const bitDepth =
    positive(input.bitDepth)
      ? input.bitDepth
      : undefined;
  const chromaSubsampling =
    input.chromaSubsampling;
  const encodedBitrateMbps =
    positive(input.encodedBitrateMbps)
      ? input.encodedBitrateMbps
      : undefined;
  const recordingDurationMinutes =
    positive(input.recordingDurationMinutes)
      ? input.recordingDurationMinutes
      : undefined;
  const cameraPipelinePowerW =
    positive(input.cameraPipelinePowerW)
      ? input.cameraPipelinePowerW
      : undefined;

  const geometryComplete =
    widthPx !== undefined &&
    heightPx !== undefined &&
    frameRateFps !== undefined;

  if (!geometryComplete) {
    return {
      version:
        CAMERA_VIDEO_WORKLOAD_VERSION,
      status:
        widthPx !== undefined ||
        heightPx !== undefined ||
        frameRateFps !== undefined
          ? 'partial'
          : 'unresolved',
      ...(widthPx !== undefined
        ? { widthPx }
        : {}),
      ...(heightPx !== undefined
        ? { heightPx }
        : {}),
      ...(frameRateFps !== undefined
        ? { frameRateFps }
        : {}),
      warnings,
      note:
        'Video width, height and frame rate are required to resolve camera processing throughput.',
    };
  }

  const megapixelsPerFrame =
    widthPx *
    heightPx /
    1_000_000;
  const megapixelsPerSecond =
    megapixelsPerFrame *
    frameRateFps;

  const uncompressedBitsPerPixel =
    bitDepth !== undefined &&
    chromaSubsampling !== undefined
      ? bitDepth *
        chromaSamplesPerPixel(
          chromaSubsampling,
        )
      : undefined;

  const uncompressedDataRateGbps =
    uncompressedBitsPerPixel !==
      undefined
      ? (
          widthPx *
          heightPx *
          frameRateFps *
          uncompressedBitsPerPixel
        ) /
        1_000_000_000
      : undefined;

  const compressionRatioVsRaw =
    uncompressedDataRateGbps !==
      undefined &&
    encodedBitrateMbps !== undefined
      ? (
          uncompressedDataRateGbps *
          1000
        ) /
        encodedBitrateMbps
      : undefined;

  const estimatedFileSizeGb =
    encodedBitrateMbps !== undefined &&
    recordingDurationMinutes !==
      undefined
      ? (
          encodedBitrateMbps *
          recordingDurationMinutes *
          60
        ) /
        8 /
        1000
      : undefined;

  const estimatedPipelineEnergyWh =
    cameraPipelinePowerW !== undefined &&
    recordingDurationMinutes !==
      undefined
      ? cameraPipelinePowerW *
        recordingDurationMinutes /
        60
      : undefined;

  if (
    bitDepth === undefined ||
    chromaSubsampling === undefined
  ) {
    warnings.push(
      'Raw video data rate remains unresolved until bit depth and chroma subsampling are explicitly supplied.',
    );
  }

  if (
    encodedBitrateMbps === undefined
  ) {
    warnings.push(
      'Encoded file size and compression ratio remain unresolved until an encoded bitrate is supplied.',
    );
  }

  if (
    cameraPipelinePowerW === undefined
  ) {
    warnings.push(
      'Camera recording energy remains unresolved until measured or explicitly assumed pipeline power is supplied.',
    );
  }

  return {
    version:
      CAMERA_VIDEO_WORKLOAD_VERSION,
    status: 'resolved',
    widthPx,
    heightPx,
    frameRateFps,
    megapixelsPerFrame,
    megapixelsPerSecond,
    ...(bitDepth !== undefined
      ? { bitDepth }
      : {}),
    ...(chromaSubsampling !== undefined
      ? { chromaSubsampling }
      : {}),
    ...(uncompressedBitsPerPixel !==
    undefined
      ? { uncompressedBitsPerPixel }
      : {}),
    ...(uncompressedDataRateGbps !==
    undefined
      ? { uncompressedDataRateGbps }
      : {}),
    ...(encodedBitrateMbps !== undefined
      ? { encodedBitrateMbps }
      : {}),
    ...(compressionRatioVsRaw !== undefined
      ? { compressionRatioVsRaw }
      : {}),
    ...(recordingDurationMinutes !== undefined
      ? { recordingDurationMinutes }
      : {}),
    ...(estimatedFileSizeGb !== undefined
      ? { estimatedFileSizeGb }
      : {}),
    ...(cameraPipelinePowerW !== undefined
      ? { cameraPipelinePowerW }
      : {}),
    ...(estimatedPipelineEnergyWh !==
    undefined
      ? { estimatedPipelineEnergyWh }
      : {}),
    warnings,
    note:
      'Video processing throughput and storage are deterministic from supplied format settings. Codec efficiency, ISP/NPU load and pipeline power are not inferred from resolution or frame rate.',
  };
}
