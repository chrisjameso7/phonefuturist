import type { CameraInput, CameraModuleType } from './camera';

export const CAMERA_ZOOM_HANDOFF_VERSION =
  'camera-zoom-handoff-0.1.0';

export interface ZoomCameraCandidate
  extends Pick<
    CameraInput,
    | 'resolutionMp'
    | 'equivalentFocalLengthMm'
    | 'binningLinearFactor'
  > {
  id: string;
  type: CameraModuleType;
}

export interface CameraZoomHandoffInput {
  cameras: ZoomCameraCandidate[];
  targetEquivalentFocalLengthMm: number;
  minimumOutputResolutionMp?: number;
}

export interface CameraZoomCandidateResult {
  id: string;
  type: CameraModuleType;
  baseEquivalentFocalLengthMm?: number;
  sourceResolutionMp?: number;
  requiredCropZoom?: number;
  retainedResolutionMp?: number;
  targetEquivalentFocalLengthMm: number;
  canReachTargetFieldOfView: boolean;
  meetsMinimumOutputResolution?: boolean;
  requiresUpscaling?: boolean;
  reasons: string[];
}

export interface CameraZoomHandoffResult {
  version: string;
  status: 'resolved' | 'unresolved';
  targetEquivalentFocalLengthMm: number;
  minimumOutputResolutionMp?: number;
  selectedCameraId?: string;
  selected?: CameraZoomCandidateResult;
  candidates: CameraZoomCandidateResult[];
  unresolvedReason?: string;
  note: string;
}

function positive(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value > 0
  );
}

function sourceResolution(camera: ZoomCameraCandidate) {
  if (!positive(camera.resolutionMp)) {
    return undefined;
  }

  const binning =
    positive(camera.binningLinearFactor) &&
    Number.isInteger(camera.binningLinearFactor)
      ? camera.binningLinearFactor
      : 1;

  return camera.resolutionMp / (binning * binning);
}

function evaluateCandidate(
  camera: ZoomCameraCandidate,
  targetEquivalentFocalLengthMm: number,
  minimumOutputResolutionMp?: number,
): CameraZoomCandidateResult {
  const reasons: string[] = [];
  const base = camera.equivalentFocalLengthMm;
  const sourceMp = sourceResolution(camera);

  if (!positive(base)) {
    return {
      id: camera.id,
      type: camera.type,
      targetEquivalentFocalLengthMm,
      canReachTargetFieldOfView: false,
      reasons: [
        'Equivalent focal length is required for deterministic zoom handoff.',
      ],
    };
  }

  if (base > targetEquivalentFocalLengthMm) {
    return {
      id: camera.id,
      type: camera.type,
      baseEquivalentFocalLengthMm: base,
      sourceResolutionMp: sourceMp,
      targetEquivalentFocalLengthMm,
      canReachTargetFieldOfView: false,
      reasons: [
        'This lens is optically narrower than the requested field of view. Cropping cannot make it wider.',
      ],
    };
  }

  const requiredCropZoom =
    targetEquivalentFocalLengthMm / base;

  const retainedResolutionMp =
    sourceMp !== undefined
      ? sourceMp / (requiredCropZoom * requiredCropZoom)
      : undefined;

  let meetsMinimumOutputResolution:
    | boolean
    | undefined;

  if (
    positive(minimumOutputResolutionMp) &&
    retainedResolutionMp !== undefined
  ) {
    meetsMinimumOutputResolution =
      retainedResolutionMp >=
      minimumOutputResolutionMp;
  }

  if (requiredCropZoom <= 1.05) {
    reasons.push('target is effectively optical on this module');
  } else {
    reasons.push(
      `requires ${requiredCropZoom.toFixed(2)}× centre crop`,
    );
  }

  if (retainedResolutionMp !== undefined) {
    reasons.push(
      `retains about ${retainedResolutionMp.toFixed(1)} MP before reconstruction`,
    );
  }

  if (meetsMinimumOutputResolution === true) {
    reasons.push('meets the requested native output-resolution floor');
  } else if (meetsMinimumOutputResolution === false) {
    reasons.push('falls below the requested native output-resolution floor');
  }

  return {
    id: camera.id,
    type: camera.type,
    baseEquivalentFocalLengthMm: base,
    sourceResolutionMp: sourceMp,
    requiredCropZoom,
    retainedResolutionMp,
    targetEquivalentFocalLengthMm,
    canReachTargetFieldOfView: true,
    ...(meetsMinimumOutputResolution !== undefined
      ? {
          meetsMinimumOutputResolution,
          requiresUpscaling:
            !meetsMinimumOutputResolution,
        }
      : {}),
    reasons,
  };
}

function candidateRank(
  value: CameraZoomCandidateResult,
  minimumOutputResolutionMp?: number,
) {
  const reaches = value.canReachTargetFieldOfView ? 1 : 0;
  const meets =
    minimumOutputResolutionMp !== undefined
      ? value.meetsMinimumOutputResolution
        ? 1
        : 0
      : 1;
  const crop = value.requiredCropZoom ?? Number.POSITIVE_INFINITY;
  const retained = value.retainedResolutionMp ?? 0;

  return {
    reaches,
    meets,
    crop,
    retained,
  };
}

export function resolveCameraZoomHandoff(
  input: CameraZoomHandoffInput,
): CameraZoomHandoffResult {
  if (
    !positive(input.targetEquivalentFocalLengthMm)
  ) {
    return {
      version: CAMERA_ZOOM_HANDOFF_VERSION,
      status: 'unresolved',
      targetEquivalentFocalLengthMm:
        input.targetEquivalentFocalLengthMm,
      minimumOutputResolutionMp:
        input.minimumOutputResolutionMp,
      candidates: [],
      unresolvedReason:
        'Target equivalent focal length must be a positive finite value.',
      note:
        'No zoom handoff was calculated.',
    };
  }

  if (
    input.minimumOutputResolutionMp !== undefined &&
    !positive(input.minimumOutputResolutionMp)
  ) {
    return {
      version: CAMERA_ZOOM_HANDOFF_VERSION,
      status: 'unresolved',
      targetEquivalentFocalLengthMm:
        input.targetEquivalentFocalLengthMm,
      minimumOutputResolutionMp:
        input.minimumOutputResolutionMp,
      candidates: [],
      unresolvedReason:
        'Minimum output resolution must be a positive finite megapixel value when supplied.',
      note:
        'No zoom handoff was calculated.',
    };
  }

  const candidates = input.cameras.map((camera) =>
    evaluateCandidate(
      camera,
      input.targetEquivalentFocalLengthMm,
      input.minimumOutputResolutionMp,
    ),
  );

  const reachable = candidates.filter(
    (candidate) =>
      candidate.canReachTargetFieldOfView,
  );

  if (!reachable.length) {
    return {
      version: CAMERA_ZOOM_HANDOFF_VERSION,
      status: 'unresolved',
      targetEquivalentFocalLengthMm:
        input.targetEquivalentFocalLengthMm,
      minimumOutputResolutionMp:
        input.minimumOutputResolutionMp,
      candidates,
      unresolvedReason:
        'No supplied camera has a wide-enough native field of view to reach the requested focal length by cropping.',
      note:
        'Cropping can only narrow a field of view. It cannot make a longer lens behave like a wider lens.',
    };
  }

  const selected = [...reachable].sort((a, b) => {
    const ar = candidateRank(
      a,
      input.minimumOutputResolutionMp,
    );
    const br = candidateRank(
      b,
      input.minimumOutputResolutionMp,
    );

    if (br.meets !== ar.meets) {
      return br.meets - ar.meets;
    }

    if (ar.crop !== br.crop) {
      return ar.crop - br.crop;
    }

    return br.retained - ar.retained;
  })[0];

  return {
    version: CAMERA_ZOOM_HANDOFF_VERSION,
    status: 'resolved',
    targetEquivalentFocalLengthMm:
      input.targetEquivalentFocalLengthMm,
    minimumOutputResolutionMp:
      input.minimumOutputResolutionMp,
    selectedCameraId: selected.id,
    selected,
    candidates,
    note:
      'Selection is deterministic and favors a camera that reaches the requested field of view, satisfies the requested native output-resolution floor when possible, and requires the least crop. It does not estimate computational fusion, super-resolution, sharpening, noise reduction or AI reconstruction quality.',
  };
}
