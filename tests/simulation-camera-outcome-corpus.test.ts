import { describe, expect, it } from 'vitest';
import { buildCalibrationRegistry } from '../src/lib/simulation/modules/calibration-registry';
import { calibrateCameraOutcome } from '../src/lib/simulation/modules/camera-calibration';

describe('measured camera outcome registry', () => {
  it('exposes protocol-safe sharpness timing evidence', () => {
    const registry = buildCalibrationRegistry();
    const measurements = registry.measurements.filter(
      (measurement) =>
        measurement.workload === 'camera' &&
        measurement.metric === 'sharpness_timing_score',
    );

    expect(measurements).toHaveLength(7);
    expect(
      new Set(
        measurements.map(
          (measurement) => measurement.deviceVariantId,
        ),
      ).size,
    ).toBe(7);
  });

  it('resolves a flagship wide-camera sharpness timing estimate', () => {
    const result = calibrateCameraOutcome(
      buildCalibrationRegistry(),
      {
        type: 'wide',
        sensorFormatDenominator: 1.3,
        resolutionMp: 50,
        apertureFNumber: 1.6,
        equivalentFocalLengthMm: 24,
      },
      'sharpness_timing',
    );

    expect(result.status).toBe('resolved');
    expect(result.expected?.unit).toBe('score');
    expect(result.references.length).toBeGreaterThan(0);
  });

  it('populates all current measured camera outcome families', () => {
    const registry = buildCalibrationRegistry();

    const metrics = new Set(
      registry.measurements
        .filter(
          (measurement) =>
            measurement.workload === 'camera',
        )
        .map((measurement) => measurement.metric),
    );

    expect(metrics.has('sharpness_timing_score')).toBe(true);
    expect(metrics.has('video_stabilization_score')).toBe(true);
    expect(metrics.has('photo_texture_score')).toBe(true);
  });
});
