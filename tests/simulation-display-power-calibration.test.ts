import { describe, expect, it } from 'vitest';
import {
  calibrateDisplayPower,
} from '../src/lib/simulation/modules/display-power-calibration';
import type { DeviceCorpus } from '../src/lib/simulation/modules/device-corpus';

function corpus(): DeviceCorpus {
  return {
    version: 'display-power-test',
    sources: [
      {
        id: 'lab',
        publisher: 'Display Lab',
        url: 'https://example.com/display',
        protocol: 'isolated panel rail power',
      },
      {
        id: 'device-lab',
        publisher: 'Device Lab',
        url: 'https://example.com/device',
        protocol: 'whole device power',
      },
    ],
    devices: [
      {
        variant: {
          id: 'oled-a',
          identity: {
            manufacturer: 'Example',
            family: 'OLED A',
            modelName: 'OLED A',
          },
        },
        display: {
          diagonalInches: 6.7,
          resolutionWidthPx: 1440,
          resolutionHeightPx: 3200,
          refreshRateHz: 120,
          panelTechnology: 'LTPO AMOLED',
        },
      },
      {
        variant: {
          id: 'oled-b',
          identity: {
            manufacturer: 'Example',
            family: 'OLED B',
            modelName: 'OLED B',
          },
        },
        display: {
          diagonalInches: 6.8,
          resolutionWidthPx: 1440,
          resolutionHeightPx: 3168,
          refreshRateHz: 120,
          panelTechnology: 'OLED',
        },
      },
      {
        variant: {
          id: 'lcd-a',
          identity: {
            manufacturer: 'Example',
            family: 'LCD A',
            modelName: 'LCD A',
          },
        },
        display: {
          diagonalInches: 6.7,
          resolutionWidthPx: 1080,
          resolutionHeightPx: 2400,
          refreshRateHz: 120,
          panelTechnology: 'IPS LCD',
        },
      },
    ],
    measurements: [
      {
        id: 'oled-a-panel',
        deviceVariantId: 'oled-a',
        workload: 'display',
        metric: 'display_power_w',
        value: 1.8,
        unit: 'W',
        sourceId: 'lab',
        evidenceKind: 'measured',
        componentScope: 'display-panel',
        displayBrightnessNits: 500,
        averagePictureLevelPercent: 50,
        refreshRateHz: 120,
      },
      {
        id: 'oled-b-panel',
        deviceVariantId: 'oled-b',
        workload: 'display',
        metric: 'display_power_w',
        value: 2,
        unit: 'W',
        sourceId: 'lab',
        evidenceKind: 'measured',
        componentScope: 'display-panel',
        displayBrightnessNits: 520,
        averagePictureLevelPercent: 50,
        refreshRateHz: 120,
      },
      {
        id: 'oled-a-whole-device',
        deviceVariantId: 'oled-a',
        workload: 'display',
        metric: 'display_power_w',
        value: 6,
        unit: 'W',
        sourceId: 'device-lab',
        evidenceKind: 'measured',
        componentScope: 'whole-device',
        displayBrightnessNits: 500,
        averagePictureLevelPercent: 50,
        refreshRateHz: 120,
      },
      {
        id: 'oled-b-display-network',
        deviceVariantId: 'oled-b',
        workload: 'display',
        metric: 'display_power_w',
        value: 4,
        unit: 'W',
        sourceId: 'device-lab',
        evidenceKind: 'measured',
        componentScope: 'display-plus-network',
        displayBrightnessNits: 500,
        averagePictureLevelPercent: 50,
        refreshRateHz: 120,
      },
      {
        id: 'lcd-a-panel',
        deviceVariantId: 'lcd-a',
        workload: 'display',
        metric: 'display_power_w',
        value: 2.4,
        unit: 'W',
        sourceId: 'lab',
        evidenceKind: 'measured',
        componentScope: 'display-panel',
        displayBrightnessNits: 500,
        averagePictureLevelPercent: 50,
        refreshRateHz: 120,
      },
    ],
  };
}

describe('display power calibration', () => {
  it('resolves only from isolated panel-power measurements at similar conditions', () => {
    const result = calibrateDisplayPower(
      corpus(),
      {
        panelTechnology: 'LTPO OLED',
        diagonalInches: 6.75,
        resolutionWidthPx: 1440,
        resolutionHeightPx: 3200,
        brightnessNits: 500,
        averagePictureLevelPercent: 50,
        operatingRefreshRateHz: 120,
      },
    );

    expect(result.status).toBe('resolved');
    expect(result.referenceCount).toBe(2);
    expect(
      result.references.map(
        (reference) =>
          reference.deviceVariantId,
      ),
    ).toEqual(
      expect.arrayContaining([
        'oled-a',
        'oled-b',
      ]),
    );

    expect(
      result.expectedPowerW,
    ).toBeGreaterThan(1.79);
    expect(
      result.expectedPowerW,
    ).toBeLessThan(2.01);

    expect(
      result.references.some(
        (reference) =>
          reference.powerW >= 4,
      ),
    ).toBe(false);
  });

  it('keeps LCD panel evidence out of an OLED calibration cohort', () => {
    const result = calibrateDisplayPower(
      corpus(),
      {
        panelTechnology: 'OLED',
        diagonalInches: 6.7,
        resolutionWidthPx: 1440,
        resolutionHeightPx: 3200,
        brightnessNits: 500,
        averagePictureLevelPercent: 50,
        operatingRefreshRateHz: 120,
      },
    );

    expect(
      result.references.some(
        (reference) =>
          reference.deviceVariantId ===
          'lcd-a',
      ),
    ).toBe(false);
  });

  it('fails closed when target operating conditions are incomplete', () => {
    const result = calibrateDisplayPower(
      corpus(),
      {
        panelTechnology: 'OLED',
        brightnessNits: 500,
      },
    );

    expect(result.status).toBe('unresolved');
    expect(result.referenceCount).toBe(0);
  });

  it('fails closed when only non-isolated power evidence is available', () => {
    const dirty = corpus();

    dirty.measurements =
      dirty.measurements.filter(
        (measurement) =>
          measurement.componentScope !==
          'display-panel',
      );

    const result = calibrateDisplayPower(
      dirty,
      {
        panelTechnology: 'OLED',
        diagonalInches: 6.7,
        resolutionWidthPx: 1440,
        resolutionHeightPx: 3200,
        brightnessNits: 500,
        averagePictureLevelPercent: 50,
        operatingRefreshRateHz: 120,
      },
    );

    expect(result.status).toBe('unresolved');
    expect(result.expectedPowerW).toBeUndefined();
  });
});
