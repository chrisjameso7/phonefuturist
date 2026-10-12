import { describe, expect, it } from 'vitest';
import {
  buildTomsGuideCurrentBatteryCorpus,
} from '../src/lib/simulation/modules/tomsguide-current-battery-corpus';
import {
  buildNotebookcheckS26UltraCorpus,
} from '../src/lib/simulation/modules/notebookcheck-s26-ultra-corpus';
import {
  validateDeviceCorpus,
} from '../src/lib/simulation/modules/device-corpus';

describe('additional current lab corpora', () => {
  it('keeps current Tom’s Guide results in their updated cellular web protocol', () => {
    const corpus =
      buildTomsGuideCurrentBatteryCorpus();

    expect(
      validateDeviceCorpus(corpus),
    ).toEqual([]);

    expect(
      corpus.sources[0].sourceRole,
    ).toBe('measurement-lab');

    expect(
      corpus.sources[0].protocolVersion,
    ).toBe('2025-current');

    expect(
      corpus.measurements.every(
        (measurement) =>
          measurement.workload ===
            'web_browsing' &&
          measurement.displayBrightnessNits ===
            150,
      ),
    ).toBe(true);
  });

  it('keeps Notebookcheck runtime and load-power evidence explicitly separated', () => {
    const corpus =
      buildNotebookcheckS26UltraCorpus();

    expect(
      validateDeviceCorpus(corpus),
    ).toEqual([]);

    expect(
      corpus.measurements.some(
        (measurement) =>
          measurement.metric ===
            'loadAveragePowerW' &&
          measurement.unit ===
            'W',
      ),
    ).toBe(true);

    expect(
      corpus.measurements.some(
        (measurement) =>
          measurement.metric ===
            'wifiWebRuntimeHours' &&
          measurement.unit ===
            'hours',
      ),
    ).toBe(true);
  });
});
