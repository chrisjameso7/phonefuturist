export const GAMING_SESSION_ENVELOPE_VERSION =
  'gaming-session-envelope-0.1.0';

export interface GamingSessionEnvelopeInput {
  sessionDurationMinutes?: number;
  throttleStartSecond?: number;
  sustainedPerformancePercent?: number;
}

export type GamingSessionThermalState =
  | 'unknown'
  | 'no-throttle-observed'
  | 'late-throttle'
  | 'mid-session-throttle'
  | 'early-throttle';

export interface GamingSessionEnvelopeResult {
  version: string;
  status: 'resolved' | 'partial' | 'unresolved';
  sessionDurationMinutes?: number;
  sessionDurationSeconds?: number;
  throttleStartSecond?: number;
  minutesBeforeThrottle?: number;
  fractionOfSessionBeforeThrottle?: number;
  percentOfSessionBeforeThrottle?: number;
  sustainedPerformancePercent?: number;
  thermalState: GamingSessionThermalState;
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

export function calculateGamingSessionEnvelope(
  input: GamingSessionEnvelopeInput,
): GamingSessionEnvelopeResult {
  const warnings: string[] = [];

  const sessionDurationMinutes =
    positive(input.sessionDurationMinutes)
      ? input.sessionDurationMinutes
      : undefined;

  const throttleStartSecond =
    input.throttleStartSecond !== undefined &&
    Number.isFinite(input.throttleStartSecond) &&
    input.throttleStartSecond >= 0
      ? input.throttleStartSecond
      : undefined;

  const sustainedPerformancePercent =
    input.sustainedPerformancePercent !==
      undefined &&
    Number.isFinite(
      input.sustainedPerformancePercent,
    ) &&
    input.sustainedPerformancePercent > 0 &&
    input.sustainedPerformancePercent <= 100
      ? input.sustainedPerformancePercent
      : undefined;

  if (
    input.sessionDurationMinutes !== undefined &&
    sessionDurationMinutes === undefined
  ) {
    warnings.push(
      'Session duration must be a positive finite value when supplied.',
    );
  }

  if (
    input.throttleStartSecond !== undefined &&
    throttleStartSecond === undefined
  ) {
    warnings.push(
      'Throttle start must be zero or a positive finite number of seconds when supplied.',
    );
  }

  if (
    input.sustainedPerformancePercent !==
      undefined &&
    sustainedPerformancePercent === undefined
  ) {
    warnings.push(
      'Sustained performance must be within 0–100% when supplied.',
    );
  }

  if (
    sessionDurationMinutes === undefined &&
    throttleStartSecond === undefined &&
    sustainedPerformancePercent ===
      undefined
  ) {
    return {
      version:
        GAMING_SESSION_ENVELOPE_VERSION,
      status: 'unresolved',
      thermalState: 'unknown',
      warnings,
      note:
        'No gaming-session timing or sustained-performance inputs are available.',
    };
  }

  const sessionDurationSeconds =
    sessionDurationMinutes !== undefined
      ? sessionDurationMinutes * 60
      : undefined;

  const throttleWithinSession =
    sessionDurationSeconds !== undefined &&
    throttleStartSecond !== undefined
      ? throttleStartSecond <
        sessionDurationSeconds
      : undefined;

  const fractionOfSessionBeforeThrottle =
    sessionDurationSeconds !== undefined &&
    throttleStartSecond !== undefined &&
    sessionDurationSeconds > 0
      ? Math.min(
          1,
          Math.max(
            0,
            throttleStartSecond /
              sessionDurationSeconds,
          ),
        )
      : undefined;

  const thermalState:
    GamingSessionThermalState =
    throttleWithinSession === false
      ? 'no-throttle-observed'
      : fractionOfSessionBeforeThrottle ===
          undefined
        ? 'unknown'
        : fractionOfSessionBeforeThrottle >=
            0.75
          ? 'late-throttle'
          : fractionOfSessionBeforeThrottle >=
              0.25
            ? 'mid-session-throttle'
            : 'early-throttle';

  if (
    thermalState === 'early-throttle'
  ) {
    warnings.push(
      'Thermal throttling begins within the first quarter of the supplied gaming session.',
    );
  }

  if (
    sustainedPerformancePercent !==
      undefined &&
    sustainedPerformancePercent < 60
  ) {
    warnings.push(
      'Sustained performance is below 60% of peak/reference behavior for the selected thermal workload.',
    );
  }

  return {
    version:
      GAMING_SESSION_ENVELOPE_VERSION,
    status:
      sessionDurationMinutes !== undefined &&
      (
        throttleStartSecond !== undefined ||
        sustainedPerformancePercent !==
          undefined
      )
        ? 'resolved'
        : 'partial',
    ...(sessionDurationMinutes !== undefined
      ? {
          sessionDurationMinutes,
          sessionDurationSeconds,
        }
      : {}),
    ...(throttleStartSecond !== undefined
      ? {
          throttleStartSecond,
          minutesBeforeThrottle:
            throttleStartSecond / 60,
        }
      : {}),
    ...(fractionOfSessionBeforeThrottle !==
    undefined
      ? {
          fractionOfSessionBeforeThrottle,
          percentOfSessionBeforeThrottle:
            fractionOfSessionBeforeThrottle *
            100,
        }
      : {}),
    ...(sustainedPerformancePercent !==
    undefined
      ? { sustainedPerformancePercent }
      : {}),
    thermalState,
    warnings,
    note:
      'This model describes when thermal throttling arrives within a gaming session. It does not convert sustained-performance percentage directly into FPS.',
  };
}
