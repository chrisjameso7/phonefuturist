export const BATTERY_AGING_ENVELOPE_VERSION =
  'battery-aging-envelope-0.1.0';

export interface BatteryAgingInput {
  initialCapacityMah?: number;
  initialEnergyWh?: number;
  ageYears?: number;
  equivalentFullCycles?: number;
  annualCalendarFadePercent?: number;
  cycleFadePercentPer100Cycles?: number;
}

export interface BatteryAgingResult {
  version: string;
  status: 'resolved' | 'partial' | 'unresolved';
  ageYears?: number;
  equivalentFullCycles?: number;
  calendarRetentionFraction?: number;
  cycleRetentionFraction?: number;
  combinedRetentionFraction?: number;
  combinedRetentionPercent?: number;
  estimatedCapacityMah?: number;
  estimatedEnergyWh?: number;
  warnings: string[];
  note: string;
}

function nonNegative(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= 0
  );
}

function positive(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value > 0
  );
}

function validFade(value: unknown): value is number {
  return (
    nonNegative(value) &&
    value < 100
  );
}

export function calculateBatteryAgingEnvelope(
  input: BatteryAgingInput,
): BatteryAgingResult {
  const warnings: string[] = [];

  const initialCapacityMah =
    positive(input.initialCapacityMah)
      ? input.initialCapacityMah
      : undefined;

  const initialEnergyWh =
    positive(input.initialEnergyWh)
      ? input.initialEnergyWh
      : undefined;

  const ageYears =
    nonNegative(input.ageYears)
      ? input.ageYears
      : undefined;

  const equivalentFullCycles =
    nonNegative(input.equivalentFullCycles)
      ? input.equivalentFullCycles
      : undefined;

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

  if (
    input.annualCalendarFadePercent !==
      undefined &&
    annualCalendarFadePercent === undefined
  ) {
    warnings.push(
      'Annual calendar fade must be between 0% and less than 100% when supplied.',
    );
  }

  if (
    input.cycleFadePercentPer100Cycles !==
      undefined &&
    cycleFadePercentPer100Cycles ===
      undefined
  ) {
    warnings.push(
      'Cycle fade per 100 equivalent full cycles must be between 0% and less than 100% when supplied.',
    );
  }

  const calendarRetentionFraction =
    ageYears !== undefined &&
    annualCalendarFadePercent !== undefined
      ? (
          1 -
          annualCalendarFadePercent /
            100
        ) ** ageYears
      : undefined;

  const cycleRetentionFraction =
    equivalentFullCycles !== undefined &&
    cycleFadePercentPer100Cycles !== undefined
      ? (
          1 -
          cycleFadePercentPer100Cycles /
            100
        ) **
        (
          equivalentFullCycles /
          100
        )
      : undefined;

  const retentionFactors = [
    calendarRetentionFraction,
    cycleRetentionFraction,
  ].filter(
    (value): value is number =>
      value !== undefined,
  );

  if (!retentionFactors.length) {
    return {
      version:
        BATTERY_AGING_ENVELOPE_VERSION,
      status:
        ageYears !== undefined ||
        equivalentFullCycles !== undefined ||
        initialCapacityMah !== undefined ||
        initialEnergyWh !== undefined
          ? 'partial'
          : 'unresolved',
      ...(ageYears !== undefined
        ? { ageYears }
        : {}),
      ...(equivalentFullCycles !== undefined
        ? { equivalentFullCycles }
        : {}),
      warnings,
      note:
        'Battery aging remains unresolved until explicit calendar-fade and/or cycle-fade evidence or assumptions are supplied. No chemistry-specific degradation rate is guessed.',
    };
  }

  const combinedRetentionFraction =
    retentionFactors.reduce(
      (product, factor) =>
        product * factor,
      1,
    );

  return {
    version:
      BATTERY_AGING_ENVELOPE_VERSION,
    status:
      initialCapacityMah !== undefined ||
      initialEnergyWh !== undefined
        ? 'resolved'
        : 'partial',
    ...(ageYears !== undefined
      ? { ageYears }
      : {}),
    ...(equivalentFullCycles !== undefined
      ? { equivalentFullCycles }
      : {}),
    ...(calendarRetentionFraction !== undefined
      ? { calendarRetentionFraction }
      : {}),
    ...(cycleRetentionFraction !== undefined
      ? { cycleRetentionFraction }
      : {}),
    combinedRetentionFraction,
    combinedRetentionPercent:
      combinedRetentionFraction * 100,
    ...(initialCapacityMah !== undefined
      ? {
          estimatedCapacityMah:
            initialCapacityMah *
            combinedRetentionFraction,
        }
      : {}),
    ...(initialEnergyWh !== undefined
      ? {
          estimatedEnergyWh:
            initialEnergyWh *
            combinedRetentionFraction,
        }
      : {}),
    warnings,
    note:
      'Calendar and cycle fade are compounded only from explicit user/evidence inputs. Temperature, charge ceiling, fast-charging exposure and chemistry effects are not silently inferred.',
  };
}

export function equivalentFullCyclesFromUsage(
  days: number,
  averageDailyDepthOfDischargePercent: number,
) {
  if (
    !nonNegative(days) ||
    !nonNegative(
      averageDailyDepthOfDischargePercent,
    ) ||
    averageDailyDepthOfDischargePercent > 100
  ) {
    return undefined;
  }

  return (
    days *
    averageDailyDepthOfDischargePercent /
    100
  );
}
