import { describe, expect, it } from 'vitest';
import { simulateCameraExperience } from '../src/lib/simulation/live-camera-experience';
import type { DeviceCorpus } from '../src/lib/simulation/modules/device-corpus';

const corpus: DeviceCorpus = {
  version: 'empty',
  sources: [],
  devices: [],
  measurements: [],
};

const input = {
  type: 'wide' as const,
  sensorFormatDenominator: 1.3,
  resolutionMp: 50,
  equivalentFocalLengthMm: 24,
  apertureFNumber: 1.8,
};

describe('camera optical sensitivity scenarios', () => {
  it('shows larger sensor gains in area and geometric light capture', () => {
    const result = simulateCameraExperience(corpus, input);
    const larger = result.sensitivity.find(
      (row) => row.scenario === 'larger-sensor',
    );

    expect(larger).toBeDefined();
    expect(larger!.deltaSensorAreaPercent).toBeGreaterThan(0);
    expect(larger!.deltaTotalLightPercent).toBeGreaterThan(0);
    expect(larger!.deltaPerPixelLightPercent).toBeGreaterThan(0);
    expect(larger!.sensorFootprintPressurePercent).toBeGreaterThan(0);
  });

  it('shows faster aperture gains without changing sensor area', () => {
    const result = simulateCameraExperience(corpus, input);
    const faster = result.sensitivity.find(
      (row) => row.scenario === 'faster-aperture',
    );

    expect(faster).toBeDefined();
    expect(faster!.deltaSensorAreaPercent).toBeCloseTo(0, 8);
    expect(faster!.deltaTotalLightPercent).toBeGreaterThan(0);
    expect(faster!.deltaPerPixelLightPercent).toBeGreaterThan(0);
    expect(faster!.deltaEquivalentAperturePercent).toBeLessThan(0);
  });

  it('shows higher resolution shrinking pixel pitch without changing total-light geometry', () => {
    const result = simulateCameraExperience(corpus, input);
    const higherResolution = result.sensitivity.find(
      (row) => row.scenario === 'higher-resolution',
    );

    expect(higherResolution).toBeDefined();
    expect(higherResolution!.deltaPixelPitchPercent).toBeLessThan(0);
    expect(higherResolution!.deltaPerPixelLightPercent).toBeLessThan(0);
    expect(higherResolution!.deltaTotalLightPercent).toBeCloseTo(0, 8);
  });
});
