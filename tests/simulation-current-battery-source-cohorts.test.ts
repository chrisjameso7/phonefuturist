import { describe, expect, it } from 'vitest';
import {
  buildPhoneArenaCurrentBatteryCorpus,
} from '../src/lib/simulation/modules/phonearena-current-battery-corpus';
import {
  buildGsmaBatteryV2ReferenceCorpus,
} from '../src/lib/simulation/modules/gsmarena-battery-v2-reference-corpus';

describe('current battery source cohorts', () => {
  it('adds a broad PhoneArena 200-nit Wi-Fi cohort', () => {
    const corpus =
      buildPhoneArenaCurrentBatteryCorpus();

    expect(corpus.devices.length).toBe(13);
    expect(corpus.measurements.length).toBe(
      52,
    );

    expect(
      corpus.measurements
        .filter(
          (measurement) =>
            measurement.workload !==
            'benchmark',
        )
        .every(
          (measurement) =>
            measurement.displayBrightnessNits ===
              200,
        ),
    ).toBe(true);
  });

  it('keeps GSMArena v2 workload rows under a dedicated protocol source', () => {
    const corpus =
      buildGsmaBatteryV2ReferenceCorpus();

    expect(corpus.devices.length).toBe(6);
    expect(corpus.measurements.length).toBe(
      18,
    );

    expect(
      corpus.sources[0].protocolVersion,
    ).toBe('2.0');

    expect(
      corpus.measurements.every(
        (measurement) =>
          measurement.sourceId ===
          'gsmarena-battery-test-v2-current',
      ),
    ).toBe(true);
  });

  it('does not collapse the same OnePlus 15 into one cross-protocol measurement identity', () => {
    const phoneArena =
      buildPhoneArenaCurrentBatteryCorpus();
    const gsma =
      buildGsmaBatteryV2ReferenceCorpus();

    const phoneArenaWeb =
      phoneArena.measurements.find(
        (measurement) =>
          measurement.deviceVariantId ===
            'phonearena-oneplus15-7300-current' &&
          measurement.workload ===
            'web_browsing',
      );

    const gsmaWeb =
      gsma.measurements.find(
        (measurement) =>
          measurement.deviceVariantId ===
            'gsmarena-v2-oneplus15' &&
          measurement.workload ===
            'web_browsing',
      );

    expect(phoneArenaWeb?.sourceId).not.toBe(
      gsmaWeb?.sourceId,
    );
    expect(phoneArenaWeb?.value).not.toBe(
      gsmaWeb?.value,
    );
  });
});
