import { describe, expect, it } from 'vitest';
import { buildCalibrationRegistry } from '../src/lib/simulation/modules/calibration-registry';
import { validateDeviceCorpus } from '../src/lib/simulation/modules/device-corpus';

describe('calibration registry', () => {
  it('merges legacy, expansion and current-generation evidence', () => {
    const corpus = buildCalibrationRegistry();

    expect(corpus.devices.length).toBeGreaterThan(110);
    expect(corpus.measurements.length).toBeGreaterThan(170);
    expect(corpus.sources.length).toBeGreaterThan(0);
    expect(validateDeviceCorpus(corpus)).toEqual([]);
  });

  it('contains current-generation devices alongside historical calibration', () => {
    const corpus = buildCalibrationRegistry();
    const names = new Set(
      corpus.devices.map((device) => device.variant.identity.modelName),
    );

    expect(names.has('iPhone 18 Pro Max')).toBe(true);
    expect(names.has('Pixel 11 Pro XL')).toBe(true);
    expect(names.has('Galaxy S26 Ultra')).toBe(true);
  });
});
