import { describe, expect, it } from 'vitest';
import {
  findTomsGuideBatteryResult,
  getTomsGuideEvidenceMetadata,
  getTomsGuideS26UltraDisplayScenarios,
  listTomsGuideBatteryResults,
} from '../src/lib/simulation/modules/tomsguide-battery-evidence';

describe("Tom's Guide battery scenario evidence", () => {
  it('loads the pinned 2026 battery comparison protocol', () => {
    expect(
      listTomsGuideBatteryResults(),
    ).toHaveLength(5);

    const metadata =
      getTomsGuideEvidenceMetadata();

    expect(
      metadata.protocol,
    ).toContain(
      'continuous web surfing over 5G at 150 nits',
    );
    expect(
      metadata.baselinePublishedDate,
    ).toBe('2026-03-03');
  });

  it('resolves Samsung Galaxy aliases without changing the measured runtime', () => {
    const result =
      findTomsGuideBatteryResult(
        'Samsung',
        'Samsung Galaxy S26 Ultra',
      );

    expect(result).toBeDefined();
    expect(
      result?.runtimeMinutes,
    ).toBe(970);
    expect(result?.batteryMah).toBe(
      5000,
    );
  });

  it('preserves controlled S26 Ultra privacy-display and refresh deltas as whole-device runtime evidence', () => {
    const result =
      getTomsGuideS26UltraDisplayScenarios();

    const privacyOn =
      result.scenarios.find(
        (row) =>
          row.id ===
          'adaptive_privacy_on',
      );

    const maximum =
      result.scenarios.find(
        (row) =>
          row.id ===
          'adaptive_privacy_maximum',
      );

    const sixtyHz =
      result.scenarios.find(
        (row) =>
          row.id ===
          '60hz_privacy_off',
      );

    expect(
      privacyOn
        ?.deltaMinutesVsAdaptivePrivacyOff,
    ).toBe(-5);

    expect(
      maximum
        ?.deltaMinutesVsAdaptivePrivacyOff,
    ).toBe(-14);

    expect(
      sixtyHz
        ?.deltaMinutesVsAdaptivePrivacyOff,
    ).toBe(30);

    expect(result.note).toContain(
      'Do not reinterpret',
    );
  });
});
