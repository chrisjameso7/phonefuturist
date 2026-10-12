export const SYSTEM_EFFICIENCY_MODEL_VERSION = 'system-efficiency-0.1.0';

export type SystemEfficiencyWorkload =
  | 'standby'
  | 'web_browsing'
  | 'video_playback'
  | 'gaming'
  | 'camera_use'
  | 'mixed_use';

export type SystemEfficiencyEvidenceKind =
  | 'measured-residual'
  | 'inferred-comparable'
  | 'reported'
  | 'user';

export interface SystemEfficiencyCoefficient {
  /**
   * Relative energy-consumption multiplier after hardware-normalized
   * workload drain is established.
   *
   * < 1.0 = lower consumption than the hardware/reference baseline.
   * > 1.0 = higher consumption than the hardware/reference baseline.
   *
   * This is deliberately not a brand score. It must be supplied from
   * measured residuals, comparable-device inference, a report, or an
   * explicit user assumption.
   */
  consumptionMultiplier: number;
  evidenceKind: SystemEfficiencyEvidenceKind;
  confidence?: number;
  sourceIds?: string[];
  note?: string;
}

export interface SystemEfficiencyProfile {
  /**
   * Human-readable label such as an OS/build/device tuning profile.
   * The simulator does not assign coefficients from this label.
   */
  label?: string;
  coefficients?: Partial<
    Record<SystemEfficiencyWorkload, SystemEfficiencyCoefficient>
  >;
}

export interface ResolvedSystemEfficiency {
  workload: SystemEfficiencyWorkload;
  applied: boolean;
  consumptionMultiplier: number;
  evidenceKind?: SystemEfficiencyEvidenceKind;
  confidence?: number;
  sourceIds?: string[];
  note?: string;
  warning?: string;
}

function validMultiplier(value: number) {
  return Number.isFinite(value) && value > 0;
}

function validConfidence(value: number | undefined) {
  return value === undefined ||
    (Number.isFinite(value) && value >= 0 && value <= 1);
}

/**
 * Resolve one workload-specific software/system efficiency coefficient.
 *
 * Missing evidence is neutral (1.0), never guessed from manufacturer,
 * operating-system name, or product family.
 */
export function resolveSystemEfficiency(
  profile: SystemEfficiencyProfile | undefined,
  workload: SystemEfficiencyWorkload,
): ResolvedSystemEfficiency {
  const coefficient = profile?.coefficients?.[workload];

  if (!coefficient) {
    return {
      workload,
      applied: false,
      consumptionMultiplier: 1,
    };
  }

  if (!validMultiplier(coefficient.consumptionMultiplier)) {
    return {
      workload,
      applied: false,
      consumptionMultiplier: 1,
      warning:
        'System-efficiency consumption multiplier must be a positive finite value.',
    };
  }

  if (!validConfidence(coefficient.confidence)) {
    return {
      workload,
      applied: false,
      consumptionMultiplier: 1,
      warning:
        'System-efficiency confidence must be between 0 and 1 when supplied.',
    };
  }

  return {
    workload,
    applied: true,
    consumptionMultiplier: coefficient.consumptionMultiplier,
    evidenceKind: coefficient.evidenceKind,
    ...(coefficient.confidence !== undefined
      ? { confidence: coefficient.confidence }
      : {}),
    ...(coefficient.sourceIds?.length
      ? { sourceIds: [...coefficient.sourceIds] }
      : {}),
    ...(coefficient.note ? { note: coefficient.note } : {}),
  };
}

export function applySystemEfficiencyToDrain(
  minMahPerHour: number,
  maxMahPerHour: number,
  profile: SystemEfficiencyProfile | undefined,
  workload: SystemEfficiencyWorkload,
) {
  const resolved = resolveSystemEfficiency(profile, workload);

  return {
    baseline: {
      minMahPerHour,
      maxMahPerHour,
    },
    adjusted: {
      minMahPerHour:
        minMahPerHour * resolved.consumptionMultiplier,
      maxMahPerHour:
        maxMahPerHour * resolved.consumptionMultiplier,
    },
    efficiency: resolved,
  };
}
