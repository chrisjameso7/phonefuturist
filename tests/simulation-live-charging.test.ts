import { describe, expect, it } from 'vitest';
import { simulateChargingFromLiveCorpus } from '../src/lib/simulation/live-charging';

describe('live charging simulator', () => {
  it('uses the unified calibration registry without caller-side corpus assembly', () => {
    const result = simulateChargingFromLiveCorpus({
      batteryMah: 6000,
      wiredChargingWatts: 80,
      limit: 5,
    });

    expect(result.simulatorVersion).toBe('live-charging-simulator-0.1.0');
    expect(result.corpusVersion).toBe('calibration-registry-0.1.0');
    expect(['resolved', 'unresolved']).toContain(result.status);
  });
});
