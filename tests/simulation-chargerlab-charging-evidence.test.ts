import { describe, expect, it } from 'vitest';
import {
  chargerLabPeakPowerContext,
  findChargerLabChargingResult,
  findChargerLabManufacturerClass,
  getChargerLabEvidenceMetadata,
  listChargerLabChargingResults,
} from '../src/lib/simulation/modules/chargerlab-charging-evidence';

describe('ChargerLAB charging evidence adapter', () => {
  it('loads current measured charging evidence', () => {
    expect(
      listChargerLabChargingResults(),
    ).toHaveLength(6);

    const metadata =
      getChargerLabEvidenceMetadata();

    expect(metadata.deviceCount).toBe(6);
    expect(metadata.publisher).toBe(
      'ChargerLAB',
    );
  });

  it('resolves Samsung Galaxy aliases and preserves measured S26 Ultra input power', () => {
    const result =
      findChargerLabChargingResult(
        'Samsung',
        'Samsung Galaxy S26 Ultra',
      );

    expect(result).toBeDefined();
    expect(
      result?.advertisedWiredWatts,
    ).toBe(60);
    expect(
      result?.observedInputPowerW,
    ).toBeCloseTo(51.54, 8);

    const context =
      chargerLabPeakPowerContext(
        result!,
      );

    expect(
      context.advertisedUtilizationPercent,
    ).toBeCloseTo(
      51.54 / 60 * 100,
      8,
    );
    expect(context.note).toContain(
      'not assumed to be sustained',
    );
  });

  it('keeps full-charge milestones separate from peak power', () => {
    const result =
      findChargerLabChargingResult(
        'OnePlus',
        'OnePlus 13T',
      );

    expect(
      result?.fullChargeMinutes,
    ).toBe(61);
    expect(
      result?.fiftyPercentMinutes,
    ).toBe(21);
    expect(
      result?.eightyPercentMinutes,
    ).toBe(35);
    expect(
      result?.maximumObservedTemperatureC,
    ).toBeCloseTo(39.1, 8);
  });

  it('returns same-manufacturer charger classes without synthesizing a future full-charge time', () => {
    const peers =
      findChargerLabManufacturerClass(
        'Samsung',
        60,
        20,
      );

    expect(
      peers.map(
        (peer) =>
          peer.result.model,
      ),
    ).toEqual(
      expect.arrayContaining([
        'Galaxy S26 Ultra',
        'Galaxy S25 Ultra',
      ]),
    );

    expect(
      peers.every(
        (peer) =>
          !('estimatedFullChargeMinutes' in
            peer),
      ),
    ).toBe(true);
  });
});
