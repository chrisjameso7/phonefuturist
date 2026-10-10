import { calculateDisplay } from './modules/display';
import {
  calculateDisplayLoad,
  type DisplayLoadResult,
} from './modules/display-load';

export const LIVE_DISPLAY_EXPERIENCE_VERSION =
  'live-display-experience-0.1.0';

export interface LiveDisplayExperienceInput {
  diagonalInches?: number;
  resolutionWidthPx?: number;
  resolutionHeightPx?: number;
  aspectWidth?: number;
  aspectHeight?: number;
  refreshRateHz?: number;
  brightnessNits?: number;
  panelTechnology?: string;
  averagePictureLevelPercent?: number;
  operatingRefreshRateHz?: number;
}

export interface LiveDisplayExperienceResult {
  version: string;
  status: 'resolved' | 'partial' | 'unresolved';
  megapixelsPerFrame?: number;
  pixelThroughputMpxPerSecond?: number;
  refreshMultiplierVs60?: number;
  rasterLoadIndex?: number;
  luminanceAreaNitCm2?: number;
  panelTechnology?: string;
  load: DisplayLoadResult;
  scenarios: Array<{
    scenario: '60hz' | '1080-class';
    label: string;
    pixelThroughputMpxPerSecond: number;
    deltaPixelThroughputPercent: number;
  }>;
  warnings: string[];
  note: string;
}

const REFERENCE_WIDTH = 1080;
const REFERENCE_HEIGHT = 2400;
const REFERENCE_REFRESH_HZ = 60;

function positive(value: number | undefined): value is number {
  return value !== undefined &&
    Number.isFinite(value) &&
    value > 0;
}

export function simulateLiveDisplayExperience(
  input: LiveDisplayExperienceInput,
): LiveDisplayExperienceResult {
  const warnings: string[] = [];
  const display = calculateDisplay({
    diagonalInches: input.diagonalInches,
    resolutionWidthPx: input.resolutionWidthPx,
    resolutionHeightPx: input.resolutionHeightPx,
    aspectWidth: input.aspectWidth,
    aspectHeight: input.aspectHeight,
  }).result;

  const width = input.resolutionWidthPx;
  const height = input.resolutionHeightPx;
  const refresh = input.refreshRateHz;

  const load = calculateDisplayLoad({
    areaMm2: display.areaMm2,
    resolutionWidthPx:
      input.resolutionWidthPx,
    resolutionHeightPx:
      input.resolutionHeightPx,
    maximumRefreshRateHz:
      input.refreshRateHz,
    operatingRefreshRateHz:
      input.operatingRefreshRateHz,
    brightnessNits:
      input.brightnessNits,
    averagePictureLevelPercent:
      input.averagePictureLevelPercent,
    panelTechnology:
      input.panelTechnology,
  });

  let megapixelsPerFrame: number | undefined;
  let pixelThroughputMpxPerSecond: number | undefined;
  let refreshMultiplierVs60: number | undefined;
  let rasterLoadIndex: number | undefined;
  let luminanceAreaNitCm2: number | undefined;

  if (positive(width) && positive(height)) {
    megapixelsPerFrame =
      (width * height) / 1_000_000;

    if (positive(refresh)) {
      pixelThroughputMpxPerSecond =
        megapixelsPerFrame * refresh;

      refreshMultiplierVs60 =
        refresh / REFERENCE_REFRESH_HZ;

      const referenceThroughput =
        (
          REFERENCE_WIDTH *
          REFERENCE_HEIGHT /
          1_000_000
        ) *
        REFERENCE_REFRESH_HZ;

      rasterLoadIndex =
        pixelThroughputMpxPerSecond /
        referenceThroughput;
    }
  }

  if (
    positive(input.brightnessNits) &&
    display.areaMm2 !== undefined &&
    display.areaMm2 > 0
  ) {
    const areaCm2 = display.areaMm2 / 100;
    luminanceAreaNitCm2 =
      input.brightnessNits * areaCm2;
  }

  if (
    input.refreshRateHz !== undefined &&
    !positive(input.refreshRateHz)
  ) {
    warnings.push(
      'Refresh rate must be a positive finite value.',
    );
  }

  if (
    input.brightnessNits !== undefined &&
    !positive(input.brightnessNits)
  ) {
    warnings.push(
      'Brightness must be a positive finite value.',
    );
  }

  const scenarios: LiveDisplayExperienceResult['scenarios'] = [];

  if (
    pixelThroughputMpxPerSecond !== undefined &&
    megapixelsPerFrame !== undefined &&
    positive(refresh) &&
    refresh > 60
  ) {
    const scenarioThroughput =
      megapixelsPerFrame * 60;

    scenarios.push({
      scenario: '60hz',
      label: 'Refresh rate → 60 Hz',
      pixelThroughputMpxPerSecond:
        scenarioThroughput,
      deltaPixelThroughputPercent:
        (
          scenarioThroughput /
          pixelThroughputMpxPerSecond -
          1
        ) * 100,
    });
  }

  if (
    pixelThroughputMpxPerSecond !== undefined &&
    positive(width) &&
    positive(height) &&
    positive(refresh) &&
    width > 1080
  ) {
    const targetWidth = 1080;
    const targetHeight =
      height * (targetWidth / width);
    const targetMegapixels =
      (targetWidth * targetHeight) / 1_000_000;
    const scenarioThroughput =
      targetMegapixels * refresh;

    scenarios.push({
      scenario: '1080-class',
      label: 'Resolution → 1080-class',
      pixelThroughputMpxPerSecond:
        scenarioThroughput,
      deltaPixelThroughputPercent:
        (
          scenarioThroughput /
          pixelThroughputMpxPerSecond -
          1
        ) * 100,
    });
  }

  const resolvedCount = [
    megapixelsPerFrame,
    pixelThroughputMpxPerSecond,
    luminanceAreaNitCm2,
  ].filter((value) => value !== undefined).length;

  return {
    version: LIVE_DISPLAY_EXPERIENCE_VERSION,
    status:
      resolvedCount >= 3
        ? 'resolved'
        : resolvedCount > 0
          ? 'partial'
          : 'unresolved',
    megapixelsPerFrame,
    pixelThroughputMpxPerSecond,
    refreshMultiplierVs60,
    rasterLoadIndex,
    luminanceAreaNitCm2,
    panelTechnology:
      input.panelTechnology?.trim() || undefined,
    load,
    scenarios,
    warnings: [
      ...warnings,
      ...load.warnings,
    ],
    note:
      'Pixel throughput and content-aware display load are deterministic workload proxies, not direct electrical power estimates. OLED/AMOLED average-picture-level scaling is only applied when panel technology and APL are explicitly supplied.',
  };
}
