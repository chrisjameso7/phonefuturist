import { describe, expect, it } from 'vitest';
import {
  buildCalibrationRegistry,
  clearCalibrationRegistryCache,
} from '../src/lib/simulation/modules/calibration-registry';
import {
  techApiCatalogCount,
} from '../src/lib/simulation/modules/techapi-device-catalog';
import {
  buildPhoneArenaCurrentBatteryCorpus,
} from '../src/lib/simulation/modules/phonearena-current-battery-corpus';
import {
  buildPhoneArenaCurrentChargingCorpus,
} from '../src/lib/simulation/modules/phonearena-current-charging-corpus';
import {
  geekerwanBatteryRowCount,
} from '../src/lib/simulation/modules/geekerwan-battery-corpus';
import {
  geekerwanChargingCurveCount,
  geekerwanDetailedCurveCount,
} from '../src/lib/simulation/modules/geekerwan-charging-curve-corpus';

describe('large corpus expansion quality gate', () => {
  it('keeps catalog breadth above one thousand devices', () => {
    expect(
      techApiCatalogCount().devices,
    ).toBe(1000);
  });

  it('keeps modern battery and charging lab cohorts substantial', () => {
    expect(
      buildPhoneArenaCurrentBatteryCorpus()
        .devices.length,
    ).toBeGreaterThanOrEqual(90);

    expect(
      buildPhoneArenaCurrentChargingCorpus()
        .devices.length,
    ).toBeGreaterThanOrEqual(90);

    expect(
      geekerwanBatteryRowCount(),
    ).toBeGreaterThanOrEqual(80);

    expect(
      geekerwanChargingCurveCount(),
    ).toBeGreaterThanOrEqual(74);

    expect(
      geekerwanDetailedCurveCount(),
    ).toBeGreaterThanOrEqual(12);
  });

  it('keeps catalog sources from masquerading as measured evidence', () => {
    clearCalibrationRegistryCache();

    const registry =
      buildCalibrationRegistry();

    const catalogIds =
      new Set(
        registry.sources
          .filter(
            (source) =>
              source.sourceRole ===
              'catalog',
          )
          .map(
            (source) =>
              source.id,
          ),
      );

    const contaminated =
      registry.measurements.filter(
        (measurement) =>
          catalogIds.has(
            measurement.sourceId,
          ),
      );

    expect(contaminated).toEqual([]);
  });

  it('retains multiple independent measurement publishers', () => {
    clearCalibrationRegistryCache();

    const registry =
      buildCalibrationRegistry();

    const labs =
      new Set(
        registry.sources
          .filter(
            (source) =>
              source.sourceRole ===
              'measurement-lab',
          )
          .map(
            (source) =>
              source.publisher,
          ),
      );

    expect(
      labs.size,
    ).toBeGreaterThanOrEqual(4);

    expect(
      [...labs],
    ).toEqual(
      expect.arrayContaining([
        'Geekerwan',
        'PhoneArena',
        'GSMArena',
        'Notebookcheck',
      ]),
    );
  });
});
