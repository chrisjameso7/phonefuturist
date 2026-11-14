export const UNCERTAINTY_INTERVAL_VERSION =
  'uncertainty-interval-0.1.0';

export interface UncertaintyInterval {
  min: number;
  expected: number;
  max: number;
}

export interface UncertaintyIntervalResult {
  version: string;
  status: 'resolved' | 'unresolved';
  interval?: UncertaintyInterval;
  relativeHalfRangePercent?: number;
  unresolvedReason?: string;
  note: string;
}

function finite(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value)
  );
}

function validInterval(
  interval: UncertaintyInterval,
) {
  return (
    finite(interval.min) &&
    finite(interval.expected) &&
    finite(interval.max) &&
    interval.min <=
      interval.expected &&
    interval.expected <=
      interval.max
  );
}

export function normalizeUncertaintyInterval(
  interval: UncertaintyInterval,
): UncertaintyIntervalResult {
  if (!validInterval(interval)) {
    return {
      version:
        UNCERTAINTY_INTERVAL_VERSION,
      status: 'unresolved',
      unresolvedReason:
        'Uncertainty interval must satisfy min ≤ expected ≤ max with finite values.',
      note:
        'Invalid leak/spec ranges are not reordered or silently repaired.',
    };
  }

  const halfRange =
    (
      interval.max -
      interval.min
    ) / 2;

  const relativeHalfRangePercent =
    interval.expected !== 0
      ? halfRange /
        Math.abs(
          interval.expected,
        ) *
        100
      : undefined;

  return {
    version:
      UNCERTAINTY_INTERVAL_VERSION,
    status: 'resolved',
    interval,
    ...(relativeHalfRangePercent !==
    undefined
      ? {
          relativeHalfRangePercent,
        }
      : {}),
    note:
      'Interval is preserved exactly as supplied. The expected value is not forced to the midpoint.',
  };
}

export function multiplyPositiveIntervals(
  a: UncertaintyInterval,
  b: UncertaintyInterval,
): UncertaintyIntervalResult {
  if (
    !validInterval(a) ||
    !validInterval(b) ||
    a.min < 0 ||
    b.min < 0
  ) {
    return {
      version:
        UNCERTAINTY_INTERVAL_VERSION,
      status: 'unresolved',
      unresolvedReason:
        'Positive interval multiplication requires valid non-negative intervals.',
      note:
        'Range propagation is withheld outside the supported positive domain.',
    };
  }

  return normalizeUncertaintyInterval({
    min:
      a.min *
      b.min,
    expected:
      a.expected *
      b.expected,
    max:
      a.max *
      b.max,
  });
}

export function dividePositiveIntervals(
  numerator: UncertaintyInterval,
  denominator: UncertaintyInterval,
): UncertaintyIntervalResult {
  if (
    !validInterval(numerator) ||
    !validInterval(denominator) ||
    numerator.min < 0 ||
    denominator.min <= 0
  ) {
    return {
      version:
        UNCERTAINTY_INTERVAL_VERSION,
      status: 'unresolved',
      unresolvedReason:
        'Positive interval division requires a valid non-negative numerator and strictly positive denominator.',
      note:
        'Range propagation is withheld when division could cross or touch zero.',
    };
  }

  return normalizeUncertaintyInterval({
    min:
      numerator.min /
      denominator.max,
    expected:
      numerator.expected /
      denominator.expected,
    max:
      numerator.max /
      denominator.min,
  });
}

export function scaleInterval(
  interval: UncertaintyInterval,
  scalar: number,
): UncertaintyIntervalResult {
  if (
    !validInterval(interval) ||
    !finite(scalar)
  ) {
    return {
      version:
        UNCERTAINTY_INTERVAL_VERSION,
      status: 'unresolved',
      unresolvedReason:
        'Interval and scalar must be finite and ordered.',
      note:
        'Invalid uncertainty inputs are not repaired.',
    };
  }

  const values = [
    interval.min * scalar,
    interval.expected *
      scalar,
    interval.max * scalar,
  ];

  return normalizeUncertaintyInterval({
    min:
      Math.min(...values),
    expected:
      interval.expected *
      scalar,
    max:
      Math.max(...values),
  });
}
