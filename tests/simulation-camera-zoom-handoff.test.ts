import { describe, expect, it } from 'vitest';
import {
  CAMERA_ZOOM_HANDOFF_VERSION,
  resolveCameraZoomHandoff,
} from '../src/lib/simulation/modules/camera-zoom-handoff';

describe('camera zoom handoff', () => {
  it('prefers the optical tele module over a heavier main-camera crop when both meet the target', () => {
    const result = resolveCameraZoomHandoff({
      targetEquivalentFocalLengthMm: 72,
      minimumOutputResolutionMp: 12,
      cameras: [
        {
          id: 'main',
          type: 'wide',
          equivalentFocalLengthMm: 24,
          resolutionMp: 200,
        },
        {
          id: 'tele',
          type: 'telephoto',
          equivalentFocalLengthMm: 72,
          resolutionMp: 50,
        },
      ],
    });

    expect(result.version).toBe(
      CAMERA_ZOOM_HANDOFF_VERSION,
    );
    expect(result.status).toBe('resolved');
    expect(result.selectedCameraId).toBe('tele');
    expect(
      result.selected?.requiredCropZoom,
    ).toBeCloseTo(1, 10);
    expect(
      result.selected?.retainedResolutionMp,
    ).toBeCloseTo(50, 10);
  });

  it('uses the main sensor crop before a narrower tele lens can cover the requested field of view', () => {
    const result = resolveCameraZoomHandoff({
      targetEquivalentFocalLengthMm: 48,
      minimumOutputResolutionMp: 12,
      cameras: [
        {
          id: 'main',
          type: 'wide',
          equivalentFocalLengthMm: 24,
          resolutionMp: 200,
        },
        {
          id: 'tele',
          type: 'telephoto',
          equivalentFocalLengthMm: 72,
          resolutionMp: 50,
        },
      ],
    });

    expect(result.status).toBe('resolved');
    expect(result.selectedCameraId).toBe('main');
    expect(
      result.selected?.requiredCropZoom,
    ).toBeCloseTo(2, 10);
    expect(
      result.selected?.retainedResolutionMp,
    ).toBeCloseTo(50, 10);

    const tele = result.candidates.find(
      (candidate) => candidate.id === 'tele',
    );
    expect(
      tele?.canReachTargetFieldOfView,
    ).toBe(false);
  });

  it('falls back to the least-cropped camera when no option can meet the output-resolution floor', () => {
    const result = resolveCameraZoomHandoff({
      targetEquivalentFocalLengthMm: 240,
      minimumOutputResolutionMp: 12,
      cameras: [
        {
          id: 'main',
          type: 'wide',
          equivalentFocalLengthMm: 24,
          resolutionMp: 200,
        },
        {
          id: 'periscope',
          type: 'periscope',
          equivalentFocalLengthMm: 120,
          resolutionMp: 50,
        },
      ],
    });

    expect(result.status).toBe('resolved');
    expect(result.selectedCameraId).toBe('periscope');
    expect(
      result.selected?.requiredCropZoom,
    ).toBeCloseTo(2, 10);
    expect(
      result.selected?.retainedResolutionMp,
    ).toBeCloseTo(12.5, 10);
    expect(
      result.selected?.meetsMinimumOutputResolution,
    ).toBe(true);
  });

  it('treats binned resolution as the source resolution available to deterministic crop', () => {
    const result = resolveCameraZoomHandoff({
      targetEquivalentFocalLengthMm: 48,
      minimumOutputResolutionMp: 12,
      cameras: [
        {
          id: 'main',
          type: 'wide',
          equivalentFocalLengthMm: 24,
          resolutionMp: 200,
          binningLinearFactor: 2,
        },
      ],
    });

    expect(result.status).toBe('resolved');
    expect(
      result.selected?.sourceResolutionMp,
    ).toBeCloseTo(50, 10);
    expect(
      result.selected?.retainedResolutionMp,
    ).toBeCloseTo(12.5, 10);
  });
});
