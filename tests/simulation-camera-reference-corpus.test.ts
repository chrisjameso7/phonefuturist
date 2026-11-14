import { describe, expect, it } from 'vitest';
import { buildCameraReferenceCorpus } from '../src/lib/simulation/modules/camera-reference-corpus';
import { buildCalibrationRegistry } from '../src/lib/simulation/modules/calibration-registry';

describe('camera reference corpus', () => {
  it('contains a cross-brand current-generation camera hardware set', () => {
    const corpus = buildCameraReferenceCorpus();
    const manufacturers = new Set(
      corpus.devices.map(
        (device) => device.variant.identity.manufacturer,
      ),
    );
    const moduleCount = corpus.devices.reduce(
      (sum, device) => sum + (device.cameras?.length ?? 0),
      0,
    );

    expect(corpus.devices.length).toBeGreaterThanOrEqual(7);
    expect(manufacturers.size).toBeGreaterThanOrEqual(7);
    expect(moduleCount).toBeGreaterThanOrEqual(20);
  });

  it('is merged into the live calibration registry', () => {
    const registry = buildCalibrationRegistry();

    expect(
      registry.devices.some(
        (device) =>
          device.variant.id === 'vivo-x300-pro-camera',
      ),
    ).toBe(true);

    expect(
      registry.devices.some(
        (device) =>
          device.variant.id === 'google-pixel-10-pro-xl-camera',
      ),
    ).toBe(true);
  });
});
