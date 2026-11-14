export const GAMING_DISPLAY_ENVELOPE_VERSION =
  'gaming-display-envelope-0.1.0';

export interface GamingDisplayEnvelopeInput {
  targetFps?: number;
  operatingRefreshRateHz?: number;
  maxRefreshRateHz?: number;
}

export interface GamingDisplayEnvelopeResult {
  version: string;
  status: 'resolved' | 'partial' | 'unresolved';
  targetFps?: number;
  operatingRefreshRateHz?: number;
  maxRefreshRateHz?: number;
  visibleFrameRateCeilingFps?: number;
  targetExceedsOperatingRefresh?: boolean;
  targetExceedsPanelMaximum?: boolean;
  refreshHeadroomFps?: number;
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

export function calculateGamingDisplayEnvelope(
  input: GamingDisplayEnvelopeInput,
): GamingDisplayEnvelopeResult {
  const targetFps =
    positive(input.targetFps)
      ? input.targetFps
      : undefined;

  const operatingRefreshRateHz =
    positive(input.operatingRefreshRateHz)
      ? input.operatingRefreshRateHz
      : undefined;

  const maxRefreshRateHz =
    positive(input.maxRefreshRateHz)
      ? input.maxRefreshRateHz
      : undefined;

  const warnings: string[] = [];

  if (
    input.targetFps !== undefined &&
    targetFps === undefined
  ) {
    warnings.push(
      'Target FPS must be a positive finite value when supplied.',
    );
  }

  if (
    input.operatingRefreshRateHz !== undefined &&
    operatingRefreshRateHz === undefined
  ) {
    warnings.push(
      'Operating refresh rate must be a positive finite value when supplied.',
    );
  }

  if (
    input.maxRefreshRateHz !== undefined &&
    maxRefreshRateHz === undefined
  ) {
    warnings.push(
      'Maximum refresh rate must be a positive finite value when supplied.',
    );
  }

  if (
    targetFps === undefined &&
    operatingRefreshRateHz === undefined &&
    maxRefreshRateHz === undefined
  ) {
    return {
      version:
        GAMING_DISPLAY_ENVELOPE_VERSION,
      status: 'unresolved',
      warnings,
      note:
        'No gaming/display timing inputs are available.',
    };
  }

  const visibleFrameRateCeilingFps =
    operatingRefreshRateHz ??
    maxRefreshRateHz;

  const targetExceedsOperatingRefresh =
    targetFps !== undefined &&
    operatingRefreshRateHz !== undefined
      ? targetFps >
        operatingRefreshRateHz
      : undefined;

  const targetExceedsPanelMaximum =
    targetFps !== undefined &&
    maxRefreshRateHz !== undefined
      ? targetFps > maxRefreshRateHz
      : undefined;

  const refreshHeadroomFps =
    targetFps !== undefined &&
    visibleFrameRateCeilingFps !== undefined
      ? visibleFrameRateCeilingFps -
        targetFps
      : undefined;

  if (targetExceedsOperatingRefresh) {
    warnings.push(
      'Target FPS exceeds the supplied operating refresh rate, so extra rendered frames cannot all be presented as distinct display refreshes.',
    );
  }

  if (targetExceedsPanelMaximum) {
    warnings.push(
      'Target FPS exceeds the panel maximum refresh rate.',
    );
  }

  return {
    version:
      GAMING_DISPLAY_ENVELOPE_VERSION,
    status:
      targetFps !== undefined &&
      visibleFrameRateCeilingFps !== undefined
        ? 'resolved'
        : 'partial',
    ...(targetFps !== undefined
      ? { targetFps }
      : {}),
    ...(operatingRefreshRateHz !== undefined
      ? { operatingRefreshRateHz }
      : {}),
    ...(maxRefreshRateHz !== undefined
      ? { maxRefreshRateHz }
      : {}),
    ...(visibleFrameRateCeilingFps !== undefined
      ? { visibleFrameRateCeilingFps }
      : {}),
    ...(targetExceedsOperatingRefresh !==
    undefined
      ? { targetExceedsOperatingRefresh }
      : {}),
    ...(targetExceedsPanelMaximum !== undefined
      ? { targetExceedsPanelMaximum }
      : {}),
    ...(refreshHeadroomFps !== undefined
      ? { refreshHeadroomFps }
      : {}),
    warnings,
    note:
      'This model checks render-target FPS against display refresh capability only. It does not predict whether the GPU can actually achieve the target FPS.',
  };
}
