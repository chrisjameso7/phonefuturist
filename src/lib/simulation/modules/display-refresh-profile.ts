export const DISPLAY_REFRESH_PROFILE_VERSION =
  'display-refresh-profile-0.1.0';

export interface DisplayRefreshState {
  refreshRateHz: number;
  dutyFraction: number;
  label?: string;
}

export interface DisplayRefreshProfileInput {
  resolutionWidthPx?: number;
  resolutionHeightPx?: number;
  states: DisplayRefreshState[];
}

export interface DisplayRefreshProfileResult {
  version: string;
  status: 'resolved' | 'unresolved';
  stateCount: number;
  dutySum?: number;
  minimumRefreshRateHz?: number;
  maximumRefreshRateHz?: number;
  weightedAverageRefreshRateHz?: number;
  megapixelsPerFrame?: number;
  weightedPixelThroughputMpxPerSecond?: number;
  highRefreshDutyFraction?: number;
  highRefreshDutyPercent?: number;
  states: Array<
    DisplayRefreshState & {
      pixelThroughputMpxPerSecond?: number;
    }
  >;
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

export function calculateDisplayRefreshProfile(
  input: DisplayRefreshProfileInput,
): DisplayRefreshProfileResult {
  const validStates =
    input.states.filter(
      (state) =>
        positive(
          state.refreshRateHz,
        ) &&
        Number.isFinite(
          state.dutyFraction,
        ) &&
        state.dutyFraction >= 0 &&
        state.dutyFraction <= 1,
    );

  if (
    !validStates.length ||
    validStates.length !==
      input.states.length
  ) {
    return {
      version:
        DISPLAY_REFRESH_PROFILE_VERSION,
      status: 'unresolved',
      stateCount:
        validStates.length,
      states: [],
      unresolvedReason:
        'Every refresh state must have a positive refresh rate and a duty fraction between 0 and 1.',
      note:
        'Invalid adaptive-refresh states are not silently normalized.',
    };
  }

  const dutySum =
    validStates.reduce(
      (sum, state) =>
        sum +
        state.dutyFraction,
      0,
    );

  if (
    Math.abs(
      dutySum - 1,
    ) > 0.005
  ) {
    return {
      version:
        DISPLAY_REFRESH_PROFILE_VERSION,
      status: 'unresolved',
      stateCount:
        validStates.length,
      dutySum,
      states: validStates,
      unresolvedReason:
        'Refresh-state duty fractions must sum to 1.0 within ±0.005.',
      note:
        'Duty fractions are kept explicit rather than automatically renormalized.',
    };
  }

  const megapixelsPerFrame =
    positive(
      input.resolutionWidthPx,
    ) &&
    positive(
      input.resolutionHeightPx,
    )
      ? (
          input.resolutionWidthPx *
          input.resolutionHeightPx
        ) /
        1_000_000
      : undefined;

  const states =
    validStates.map(
      (state) => ({
        ...state,
        ...(megapixelsPerFrame !==
        undefined
          ? {
              pixelThroughputMpxPerSecond:
                megapixelsPerFrame *
                state.refreshRateHz,
            }
          : {}),
      }),
    );

  const weightedAverageRefreshRateHz =
    states.reduce(
      (sum, state) =>
        sum +
        state.refreshRateHz *
          state.dutyFraction,
      0,
    );

  const weightedPixelThroughputMpxPerSecond =
    megapixelsPerFrame !== undefined
      ? megapixelsPerFrame *
        weightedAverageRefreshRateHz
      : undefined;

  const highRefreshDutyFraction =
    states
      .filter(
        (state) =>
          state.refreshRateHz > 60,
      )
      .reduce(
        (sum, state) =>
          sum +
          state.dutyFraction,
        0,
      );

  return {
    version:
      DISPLAY_REFRESH_PROFILE_VERSION,
    status: 'resolved',
    stateCount:
      states.length,
    dutySum,
    minimumRefreshRateHz:
      Math.min(
        ...states.map(
          (state) =>
            state.refreshRateHz,
        ),
      ),
    maximumRefreshRateHz:
      Math.max(
        ...states.map(
          (state) =>
            state.refreshRateHz,
        ),
      ),
    weightedAverageRefreshRateHz,
    ...(megapixelsPerFrame !== undefined
      ? {
          megapixelsPerFrame,
          weightedPixelThroughputMpxPerSecond,
        }
      : {}),
    highRefreshDutyFraction,
    highRefreshDutyPercent:
      highRefreshDutyFraction * 100,
    states,
    note:
      'Adaptive refresh is represented as an explicit time distribution across refresh states. Weighted refresh and pixel throughput describe scan demand only; they are not substituted into electrical panel-power calibration.',
  };
}
