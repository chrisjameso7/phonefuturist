import { describe, expect, it } from 'vitest';
import {
  calculatePairwiseVariantResidual,
  VARIANT_RESIDUAL_MODEL_VERSION,
} from '../src/lib/simulation/modules/variant-residual';

describe('pairwise device-variant residuals', () => {
  it('captures the S23 FE same-capacity runtime split without calling it software', () => {
    const result = calculatePairwiseVariantResidual(
      { runtimeHours: 9.75, batteryMah: 4500 },
      { runtimeHours: 8 + 28 / 60, batteryMah: 4500 },
    );

    expect(result?.modelVersion).toBe(VARIANT_RESIDUAL_MODEL_VERSION);
    expect(result?.capacityRatio).toBeCloseTo(1, 8);
    expect(result?.consumptionRatio).toBeGreaterThan(1);
    expect(result?.interpretation).toBe('candidate_higher_consumption');
  });

  it('normalizes different battery capacities before comparing runtime', () => {
    const result = calculatePairwiseVariantResidual(
      { runtimeHours: 10, batteryMah: 5000 },
      { runtimeHours: 11, batteryMah: 6000 },
    );

    expect(result?.runtimeRatio).toBeCloseTo(1.1, 8);
    expect(result?.capacityRatio).toBeCloseTo(1.2, 8);
    expect(result?.consumptionRatio).toBeGreaterThan(1);
  });

  it('fails closed on invalid observations', () => {
    expect(
      calculatePairwiseVariantResidual(
        { runtimeHours: 0, batteryMah: 5000 },
        { runtimeHours: 10, batteryMah: 5000 },
      ),
    ).toBeUndefined();
  });
});
