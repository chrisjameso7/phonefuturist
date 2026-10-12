import { describe, expect, it } from 'vitest';
import { simulateChargingFromLiveCorpus } from '../src/lib/simulation/live-charging';
import { CALIBRATION_REGISTRY_VERSION } from '../src/lib/simulation/modules/calibration-registry';

describe('live charging simulator', () => {
  it('uses measured 60 W Samsung-class peers for a 5700 mAh future flagship concept', () => {
    const result = simulateChargingFromLiveCorpus({
      batteryMah: 5700,
      wiredChargingWatts: 60,
      manufacturer: 'Samsung',
      limit: 5,
    });

    expect(result.status).toBe('resolved');
    expect(
      result.estimate?.neighborIds,
    ).toContain(
      'legacy-charging-samsung-galaxy-s26-ultra',
    );
    expect(
      result.estimate?.timeTo100Minutes?.expected,
    ).toBeGreaterThan(35);
    expect(
      result.estimate?.timeTo100Minutes?.expected,
    ).toBeLessThan(100);
    expect(
      result.estimate?.referenceCount,
    ).toBeGreaterThanOrEqual(2);

    expect(
      result.observedInputPower.status,
    ).toBe('resolved');

    expect(
      result.observedInputPower.expectedObservedPeakWatts,
    ).toBeGreaterThan(48);

    expect(
      result.observedInputPower.expectedObservedPeakWatts,
    ).toBeLessThan(56);

    expect(
      result.observedInputPower.expectedObservedPeakWatts,
    ).toBeLessThan(60);
  });


  it('uses the unified calibration registry without caller-side corpus assembly', () => {
    const result = simulateChargingFromLiveCorpus({
      batteryMah: 6000,
      wiredChargingWatts: 80,
      limit: 5,
    });

    expect(result.simulatorVersion).toBe('live-charging-simulator-0.1.0');
    expect(result.corpusVersion).toBe(
      CALIBRATION_REGISTRY_VERSION,
    );
    expect(['resolved', 'unresolved']).toContain(result.status);
  });
});
