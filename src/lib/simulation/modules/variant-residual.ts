export const VARIANT_RESIDUAL_MODEL_VERSION = 'variant-residual-0.1.0';

export interface VariantRuntimeObservation {
  runtimeHours: number;
  batteryMah: number;
}

export interface PairwiseVariantResidual {
  modelVersion: string;
  referenceMahPerHour: number;
  candidateMahPerHour: number;
  consumptionRatio: number;
  runtimeRatio: number;
  capacityRatio: number;
  interpretation: 'candidate_lower_consumption' | 'near_equal' | 'candidate_higher_consumption';
}

/**
 * Capacity-normalized pairwise residual for variants tested under the
 * same protocol. This is a system/platform observation, not a pure
 * software coefficient.
 *
 * consumptionRatio < 1 means candidate consumed fewer mAh per hour
 * than the reference under the matched protocol.
 */
export function calculatePairwiseVariantResidual(
  reference: VariantRuntimeObservation,
  candidate: VariantRuntimeObservation,
): PairwiseVariantResidual | undefined {
  const values = [
    reference.runtimeHours,
    reference.batteryMah,
    candidate.runtimeHours,
    candidate.batteryMah,
  ];

  if (!values.every((v) => Number.isFinite(v) && v > 0)) {
    return undefined;
  }

  const referenceMahPerHour = reference.batteryMah / reference.runtimeHours;
  const candidateMahPerHour = candidate.batteryMah / candidate.runtimeHours;
  const consumptionRatio = candidateMahPerHour / referenceMahPerHour;
  const runtimeRatio = candidate.runtimeHours / reference.runtimeHours;
  const capacityRatio = candidate.batteryMah / reference.batteryMah;

  const interpretation =
    consumptionRatio < 0.98
      ? 'candidate_lower_consumption'
      : consumptionRatio > 1.02
        ? 'candidate_higher_consumption'
        : 'near_equal';

  return {
    modelVersion: VARIANT_RESIDUAL_MODEL_VERSION,
    referenceMahPerHour,
    candidateMahPerHour,
    consumptionRatio,
    runtimeRatio,
    capacityRatio,
    interpretation,
  };
}
