export const BATTERY_HEALTH_FORECAST_VERSION =
  'battery-health-forecast-0.1.0';

export interface BatteryHealthForecastInput {
  targetRetentionPercent: number;
  currentAgeYears?: number;
  annualCalendarFadePercent?: number;
  cycleFadePercentPer100Cycles?: number;
  equivalentFullCyclesPerYear?: number;
}

export interface BatteryHealthForecastResult {
  version: string;
  status: 'resolved' | 'unresolved';
  targetRetentionPercent?: number;
  annualCombinedRetentionFraction?: number;
  annualCombinedRetentionPercent?: number;
  yearsFromNewToThreshold?: number;
  remainingYearsFromCurrentAge?: number;
  equivalentFullCyclesToThreshold?: number;
  unresolvedReason?: string;
  note: string;
}

function finite(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value)
  );
}

function nonNegative(value: unknown): value is number {
  return finite(value) && value >= 0;
}

function validFade(value: unknown): value is number {
  return nonNegative(value) && value < 100;
}

export function forecastBatteryHealthThreshold(
  input: BatteryHealthForecastInput,
): BatteryHealthForecastResult {
  const targetRetentionPercent =
    finite(input.targetRetentionPercent) &&
    input.targetRetentionPercent > 0 &&
    input.targetRetentionPercent < 100
      ? input.targetRetentionPercent
      : undefined;

  if (targetRetentionPercent === undefined) {
    return {
      version:
        BATTERY_HEALTH_FORECAST_VERSION,
      status: 'unresolved',
      unresolvedReason:
        'Target battery-health retention must be greater than 0% and less than 100%.',
      note:
        'No health-threshold time is calculated from an invalid target.',
    };
  }

  const annualCalendarFadePercent =
    validFade(
      input.annualCalendarFadePercent,
    )
      ? input.annualCalendarFadePercent
      : undefined;

  const cycleFadePercentPer100Cycles =
    validFade(
      input.cycleFadePercentPer100Cycles,
    )
      ? input.cycleFadePercentPer100Cycles
      : undefined;

  const equivalentFullCyclesPerYear =
    nonNegative(
      input.equivalentFullCyclesPerYear,
    )
      ? input.equivalentFullCyclesPerYear
      : undefined;

  const currentAgeYears =
    nonNegative(input.currentAgeYears)
      ? input.currentAgeYears
      : undefined;

  const calendarAnnualRetention =
    annualCalendarFadePercent !== undefined
      ? 1 -
        annualCalendarFadePercent / 100
      : 1;

  const cycleAnnualRetention =
    cycleFadePercentPer100Cycles !==
      undefined &&
    equivalentFullCyclesPerYear !==
      undefined
      ? (
          1 -
          cycleFadePercentPer100Cycles /
            100
        ) **
        (
          equivalentFullCyclesPerYear /
          100
        )
      : 1;

  const hasCalendarFade =
    annualCalendarFadePercent !== undefined &&
    annualCalendarFadePercent > 0;

  const hasCycleFade =
    cycleFadePercentPer100Cycles !==
      undefined &&
    cycleFadePercentPer100Cycles > 0 &&
    equivalentFullCyclesPerYear !==
      undefined &&
    equivalentFullCyclesPerYear > 0;

  if (!hasCalendarFade && !hasCycleFade) {
    return {
      version:
        BATTERY_HEALTH_FORECAST_VERSION,
      status: 'unresolved',
      targetRetentionPercent,
      unresolvedReason:
        'At least one non-zero annualized fade mechanism is required.',
      note:
        'No universal degradation rate is assumed. Supply calendar fade and/or cycle fade with cycle exposure.',
    };
  }

  const annualCombinedRetentionFraction =
    calendarAnnualRetention *
    cycleAnnualRetention;

  if (
    annualCombinedRetentionFraction <= 0 ||
    annualCombinedRetentionFraction >= 1
  ) {
    return {
      version:
        BATTERY_HEALTH_FORECAST_VERSION,
      status: 'unresolved',
      targetRetentionPercent,
      unresolvedReason:
        'The supplied fade assumptions do not define a valid declining annual retention curve.',
      note:
        'Threshold projection is withheld rather than forcing an invalid logarithmic model.',
    };
  }

  const targetFraction =
    targetRetentionPercent / 100;

  const yearsFromNewToThreshold =
    Math.log(targetFraction) /
    Math.log(
      annualCombinedRetentionFraction,
    );

  const remainingYearsFromCurrentAge =
    currentAgeYears !== undefined
      ? Math.max(
          0,
          yearsFromNewToThreshold -
            currentAgeYears,
        )
      : undefined;

  const equivalentFullCyclesToThreshold =
    equivalentFullCyclesPerYear !==
      undefined
      ? yearsFromNewToThreshold *
        equivalentFullCyclesPerYear
      : undefined;

  return {
    version:
      BATTERY_HEALTH_FORECAST_VERSION,
    status: 'resolved',
    targetRetentionPercent,
    annualCombinedRetentionFraction,
    annualCombinedRetentionPercent:
      annualCombinedRetentionFraction *
      100,
    yearsFromNewToThreshold,
    ...(remainingYearsFromCurrentAge !==
    undefined
      ? { remainingYearsFromCurrentAge }
      : {}),
    ...(equivalentFullCyclesToThreshold !==
    undefined
      ? {
          equivalentFullCyclesToThreshold,
        }
      : {}),
    note:
      'Forecast assumes the supplied calendar fade, cycle fade and annual cycle exposure remain constant over time. It is a scenario projection, not a chemistry-specific lifetime guarantee.',
  };
}
