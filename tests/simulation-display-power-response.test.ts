import { describe, expect, it } from 'vitest';
import {
  resolveDisplayPowerResponse,
} from '../src/lib/simulation/modules/display-power-response';
import type {
  DeviceCorpus,
} from '../src/lib/simulation/modules/device-corpus';

const corpus: DeviceCorpus = {
  version: 'display-response-test',
  sources: [
    {
      id: 'lab',
      publisher: 'Panel Lab',
      url: 'https://example.com/panel',
      protocol: 'isolated panel rail power',
    },
  ],
  devices: [
    {
      variant: {
        id: 'oled',
        identity: {
          manufacturer: 'Example',
          family: 'OLED',
          modelName: 'OLED',
        },
      },
      display: {
        diagonalInches: 6.7,
        resolutionWidthPx: 1440,
        resolutionHeightPx: 3200,
        refreshRateHz: 120,
        panelTechnology: 'LTPO OLED',
      },
    },
  ],
  measurements: [
    {
      id: 'b300',
      deviceVariantId: 'oled',
      workload: 'display',
      metric: 'display_power_w',
      value: 1.2,
      unit: 'W',
      sourceId: 'lab',
      evidenceKind: 'measured',
      componentScope: 'display-panel',
      displayBrightnessNits: 300,
      averagePictureLevelPercent: 50,
      refreshRateHz: 120,
    },
    {
      id: 'b700',
      deviceVariantId: 'oled',
      workload: 'display',
      metric: 'display_power_w',
      value: 2,
      unit: 'W',
      sourceId: 'lab',
      evidenceKind: 'measured',
      componentScope: 'display-panel',
      displayBrightnessNits: 700,
      averagePictureLevelPercent: 50,
      refreshRateHz: 120,
    },
    {
      id: 'apl20',
      deviceVariantId: 'oled',
      workload: 'display',
      metric: 'display_power_w',
      value: 1,
      unit: 'W',
      sourceId: 'lab',
      evidenceKind: 'measured',
      componentScope: 'display-panel',
      displayBrightnessNits: 500,
      averagePictureLevelPercent: 20,
      refreshRateHz: 120,
    },
    {
      id: 'apl80',
      deviceVariantId: 'oled',
      workload: 'display',
      metric: 'display_power_w',
      value: 2.2,
      unit: 'W',
      sourceId: 'lab',
      evidenceKind: 'measured',
      componentScope: 'display-panel',
      displayBrightnessNits: 500,
      averagePictureLevelPercent: 80,
      refreshRateHz: 120,
    },
  ],
};

describe('controlled display power response', () => {
  it('resolves brightness interpolation from same-device controlled measurements', () => {
    const result =
      resolveDisplayPowerResponse(
        corpus,
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

    expect(result.status).toBe('resolved');
    expect(result.expectedPowerW).toBeCloseTo(
      1.6,
      8,
    );
    expect(
      result.references.some(
        (reference) =>
          reference.axis ===
          'brightness-nits',
      ),
    ).toBe(true);
  });

  it('resolves APL interpolation independently when brightness and refresh are held fixed', () => {
    const result =
      resolveDisplayPowerResponse(
        corpus,
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
          reference.axis ===
          'apl-percent',
      ),
    ).toBe(true);
  });

  it('refuses response interpolation when the target lies outside measured intervals', () => {
    const result =
      resolveDisplayPowerResponse(
        corpus,
        {
          panelTechnology: 'OLED',
          diagonalInches: 6.7,
          resolutionWidthPx: 1440,
          resolutionHeightPx: 3200,
          brightnessNits: 900,
          averagePictureLevelPercent: 50,
          operatingRefreshRateHz: 120,
        },
      );

    expect(result.status).toBe('unresolved');
  });
});
