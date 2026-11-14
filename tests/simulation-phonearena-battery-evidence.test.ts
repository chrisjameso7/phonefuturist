import { describe, expect, it } from 'vitest';
import {
  findPhoneArenaBatteryResult,
  findPhoneArenaChargingResult,
  getPhoneArenaEvidenceMetadata,
  listPhoneArenaBatteryResults,
  listPhoneArenaChargingResults,
  phoneArenaBatteryEfficiency,
  phoneArenaChargingEfficiency,
} from '../src/lib/simulation/modules/phonearena-battery-evidence';

describe('PhoneArena battery evidence adapter', () => {
  it('loads the pinned public benchmark snapshot', () => {
    expect(
      listPhoneArenaBatteryResults().length,
    ).toBe(324);

    expect(
      listPhoneArenaChargingResults().length,
    ).toBe(440);

    const metadata =
      getPhoneArenaEvidenceMetadata();

    expect(metadata.batteryRows).toBe(
      324,
    );
    expect(metadata.chargingRows).toBe(
      440,
    );
    expect(
      metadata.source.sourceRole,
    ).toBe('measurement-lab');
  });

  it('resolves Galaxy S26 Ultra workload runtimes exactly', () => {
    const result =
      findPhoneArenaBatteryResult(
        'Samsung',
        'Galaxy S26 Ultra',
      );

    expect(result).toBeDefined();
    expect(result?.batteryMah).toBe(
      5000,
    );
    expect(
      result?.browsingMinutes,
    ).toBe(1210);
    expect(
      result?.videoMinutes,
    ).toBe(594);
    expect(
      result?.gamingMinutes,
    ).toBe(709);
  });

  it('resolves current OnePlus 15 battery results and preserves protocol-specific efficiency', () => {
    const result =
      findPhoneArenaBatteryResult(
        'OnePlus',
        'OnePlus 15',
      );

    expect(result).toBeDefined();

    const efficiency =
      phoneArenaBatteryEfficiency(
        result!,
      );

    expect(
      efficiency.browsingMinutesPer1000Mah,
    ).toBeCloseTo(
      1806 / 7.3,
      8,
    );
    expect(
      efficiency.gamingMinutesPer1000Mah,
    ).toBeCloseTo(
      856 / 7.3,
      8,
    );
  });

  it('keeps charging metrics in the PhoneArena protocol and does not infer missing rows', () => {
    const result =
      findPhoneArenaChargingResult(
        'Samsung',
        'Galaxy S26 Ultra',
      );

    expect(result).toBeDefined();
    expect(
      result?.wiredFullMinutes,
    ).toBe(49);
    expect(
      result?.wiredChargerWatts,
    ).toBe(60);

    const efficiency =
      phoneArenaChargingEfficiency(
        result!,
      );

    expect(
      efficiency.wiredMinutesPer1000Mah,
    ).toBeCloseTo(
      49 / 5,
      8,
    );
  });
});
