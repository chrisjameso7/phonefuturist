import { describe, expect, it } from 'vitest';
import {
  WORKLOAD_POWER_REFERENCES,
  WORKLOAD_RUNTIME_VERSION,
  resolveWorkloadPowerBand,
  simulateActiveUseRuntime,
} from '../src/lib/simulation/workload-runtime';
import type { SimulationInput } from '../src/lib/simulation/types';

const iphone: SimulationInput = {
  name: 'iPhone 16 Pro Max',
  formFactor: 'phone',
  displays: { primary: { diagonalInches: 6.9, resolutionWidthPx: 1320, resolutionHeightPx: 2868 } },
  battery: { cells: [{ capacityMah: 4685, nominalVoltageV: 3.878 }] },
};

const concept: SimulationInput = {
  name: 'Future flagship',
  formFactor: 'phone',
  displays: { primary: { diagonalInches: 6.8, resolutionWidthPx: 1440, resolutionHeightPx: 3200 } },
  battery: { cells: [{ capacityMah: 5500, nominalVoltageV: 3.88 }] },
};

describe('v0.5.1 active workload runtime', () => {
  it('ships calibrated web, video and gaming references', () => {
    expect(WORKLOAD_RUNTIME_VERSION).toBe('0.5.1');
    expect(WORKLOAD_POWER_REFERENCES.filter(r => r.workload === 'web_browsing')).toHaveLength(3);
    expect(WORKLOAD_POWER_REFERENCES.filter(r => r.workload === 'video_playback')).toHaveLength(3);
    expect(WORKLOAD_POWER_REFERENCES.filter(r => r.workload === 'gaming')).toHaveLength(3);
  });

  it('uses a matching released-device reference without asking for watts', () => {
    const web = resolveWorkloadPowerBand(iphone, 'web_browsing');
    expect(web?.basis).toBe('matched-reference');
    expect(web?.minW).toBeCloseTo(web!.maxW, 10);

    const result = simulateActiveUseRuntime(iphone, {
      web_browsing: 2,
      video_playback: 2,
      gaming: 1,
      camera_use: 0,
    });

    expect(result.status).toBe('resolved');
    expect(result.estimate?.activeHoursPerDay).toBe(5);
    expect(result.estimate?.runtimeHours.min).toBeGreaterThan(0);
    expect(result.estimate?.equivalentDaysPerCharge.min).toBeGreaterThan(0);
    expect(result.estimate?.workloads.map(w => w.workload)).toEqual([
      'web_browsing',
      'video_playback',
      'gaming',
    ]);
  });

  it('uses the reference-population power band for an unreleased concept', () => {
    const gaming = resolveWorkloadPowerBand(concept, 'gaming');
    expect(gaming?.basis).toBe('reference-population');
    expect(gaming?.referenceCount).toBe(3);
    expect(gaming!.maxW).toBeGreaterThanOrEqual(gaming!.minW);

    const result = simulateActiveUseRuntime(concept, {
      web_browsing: 2,
      video_playback: 1,
      gaming: 1,
    });

    expect(result.status).toBe('resolved');
    expect(result.estimate!.runtimeHours.max).toBeGreaterThanOrEqual(
      result.estimate!.runtimeHours.min,
    );
  });

  it('fails closed for camera hours until isolated camera evidence exists', () => {
    const result = simulateActiveUseRuntime(concept, {
      web_browsing: 2,
      camera_use: 0.5,
    });

    expect(result.status).toBe('unresolved');
    expect(result.unresolved?.code).toBe('CAMERA_UNCALIBRATED');
    expect(result.unresolved?.message).toContain('Camera');
  });

  it('rejects impossible daily usage instead of normalizing it away', () => {
    const result = simulateActiveUseRuntime(concept, {
      web_browsing: 12,
      video_playback: 10,
      gaming: 4,
    });

    expect(result.status).toBe('unresolved');
    expect(result.unresolved?.code).toBe('INVALID_HOURS');
  });

  it('requires battery energy but never battery dimensions', () => {
    const noEnergy: SimulationInput = {
      name: 'No pack',
      formFactor: 'phone',
      displays: { primary: {} },
    };

    const result = simulateActiveUseRuntime(noEnergy, { web_browsing: 2 });
    expect(result.status).toBe('unresolved');
    expect(result.unresolved?.code).toBe('MISSING_ENERGY');

    const withEnergyNoDimensions = simulateActiveUseRuntime(concept, {
      video_playback: 2,
    });
    expect(withEnergyNoDimensions.status).toBe('resolved');
  });
});
