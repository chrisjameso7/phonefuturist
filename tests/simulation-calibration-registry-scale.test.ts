import { describe, expect, it } from 'vitest';
import {
  buildCalibrationRegistry,
  clearCalibrationRegistryCache,
} from '../src/lib/simulation/modules/calibration-registry';
import {
  techApiCatalogCount,
} from '../src/lib/simulation/modules/techapi-device-catalog';

describe('calibration registry scale and source integrity', () => {
  it('loads at least one thousand unique catalog devices', () => {
    clearCalibrationRegistryCache();

    const registry =
      buildCalibrationRegistry();

    const ids =
      registry.devices.map(
        (device) =>
          device.variant.id,
      );

    expect(
      techApiCatalogCount().devices,
    ).toBe(1000);

    expect(
      new Set(ids).size,
    ).toBe(ids.length);

    expect(
      registry.devices.length,
    ).toBeGreaterThanOrEqual(1000);
  });

  it('keeps major external evidence publishers present in the merged registry', () => {
    clearCalibrationRegistryCache();

    const registry =
      buildCalibrationRegistry();

    const publishers =
      new Set(
        registry.sources.map(
          (source) =>
            source.publisher,
        ),
      );

    expect(
      publishers.has('TechAPI'),
    ).toBe(true);
    expect(
      publishers.has('PhoneArena'),
    ).toBe(true);
    expect(
      publishers.has('Geekerwan'),
    ).toBe(true);
  });

  it('does not turn TechAPI catalog rows into measured calibration evidence', () => {
    clearCalibrationRegistryCache();

    const registry =
      buildCalibrationRegistry();

    const techApiSourceIds =
      new Set(
        registry.sources
          .filter(
            (source) =>
              source.publisher ===
              'TechAPI',
          )
          .map(
            (source) =>
              source.id,
          ),
      );

    expect(
      registry.measurements.some(
        (measurement) =>
          techApiSourceIds.has(
            measurement.sourceId,
          ),
      ),
    ).toBe(false);
  });
});
