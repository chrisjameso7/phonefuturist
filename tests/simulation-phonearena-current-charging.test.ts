import { describe, expect, it } from 'vitest';
import {
  buildCalibrationRegistry,
  clearCalibrationRegistryCache,
} from '../src/lib/simulation/modules/calibration-registry';
import {
  estimateChargingFromCorpus,
} from '../src/lib/simulation/modules/charging-corpus-estimator';

describe('PhoneArena current charging cohort', () => {
  it('preserves the measured Galaxy S26 Ultra 60W charging mode', () => {
    clearCalibrationRegistryCache();
    const corpus =
      buildCalibrationRegistry();

    const device =
      corpus.devices.find(
        (candidate) =>
          candidate.variant.id ===
          'pa-charge-s26-ultra',
      );

    expect(device).toBeDefined();

    const result =
      estimateChargingFromCorpus(
        corpus,
        {
          deviceVariantId:
            'pa-charge-s26-ultra',
          batteryMah: 5000,
          wiredChargingWatts: 60,
          manufacturer: 'Samsung',
        },
      );

    expect(result.status).toBe(
      'resolved',
    );
    expect(
      result.estimate?.basis,
    ).toBe(
      'exact-measured-mode',
    );
    expect(
      result.estimate?.timeTo100Minutes
        ?.expected,
    ).toBe(49);
    expect(
      result.estimate?.charge30mPercent
        ?.expected,
    ).toBe(78);
  });

  it('uses the new 60W Samsung evidence for a larger hypothetical target without hardcoding S27 Ultra', () => {
    clearCalibrationRegistryCache();
    const corpus =
      buildCalibrationRegistry();

    const result =
      estimateChargingFromCorpus(
        corpus,
        {
          batteryMah: 5700,
          wiredChargingWatts: 60,
          manufacturer: 'Samsung',
        },
      );

    expect(result.status).toBe(
      'resolved',
    );
    expect(
      result.estimate
        ?.timeTo100Minutes
        ?.expected,
    ).toBeGreaterThan(0);
    expect(
      result.estimate
        ?.neighborIds.length,
    ).toBeGreaterThan(0);

    expect(
      result.estimate
        ?.timeTo100Minutes
        ?.expected,
    ).toBeLessThan(120);
  });

  it('keeps PhoneArena charging as its own source protocol', () => {
    clearCalibrationRegistryCache();
    const corpus =
      buildCalibrationRegistry();

    const source =
      corpus.sources.find(
        (candidate) =>
          candidate.id ===
          'phonearena-charging-2025-2026',
      );

    expect(source?.publisher).toBe(
      'PhoneArena',
    );
    expect(source?.protocolVersion).toBe(
      'phonearena-current-charging-2025-2026',
    );
  });
});
