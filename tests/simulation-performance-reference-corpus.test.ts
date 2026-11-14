import { describe, expect, it } from 'vitest';
import { buildCalibrationRegistry } from '../src/lib/simulation/modules/calibration-registry';

describe('sustained GPU performance corpus', () => {
  it('exposes one protocol-compatible flagship stability family', () => {
    const registry = buildCalibrationRegistry();

    const rows = registry.measurements.filter(
      (measurement) =>
        measurement.workload === 'benchmark' &&
        measurement.metric === 'gpu_stability_percent',
    );

    expect(rows).toHaveLength(11);
    expect(
      new Set(
        rows.map(
          (measurement) => measurement.deviceVariantId,
        ),
      ).size,
    ).toBe(11);
    expect(
      rows.every(
        (measurement) =>
          measurement.unit === 'percent',
      ),
    ).toBe(true);

    expect(
      rows.some(
        (measurement) =>
          measurement.deviceVariantId ===
          'oneplus-15-global-7300',
      ),
    ).toBe(true);

    expect(
      rows.some(
        (measurement) =>
          measurement.deviceVariantId ===
          'honor-magic8-pro-eu-6270',
      ),
    ).toBe(true);

    const snapdragonGen5 =
      registry.devices.filter(
        (device) =>
          device.variant.soc?.name
            .toLowerCase()
            .replace(' for galaxy', '') ===
          'snapdragon 8 elite gen 5',
      );

    expect(
      snapdragonGen5.length,
    ).toBeGreaterThanOrEqual(3);

    const exynos2600 =
      registry.devices.filter(
        (device) =>
          device.variant.soc?.vendor ===
            'Samsung' &&
          device.variant.soc?.name ===
            'Exynos 2600',
      );

    expect(
      exynos2600.length,
    ).toBeGreaterThanOrEqual(2);
  });
});
