export const DISPLAY_LOAD_MODEL_VERSION =
  'display-load-0.1.0';

export interface DisplayLoadInput {
  areaMm2?: number;
  resolutionWidthPx?: number;
  resolutionHeightPx?: number;
  maximumRefreshRateHz?: number;
  operatingRefreshRateHz?: number;
  brightnessNits?: number;
  averagePictureLevelPercent?: number;
  panelTechnology?: string;
}

export interface DisplayLoadResult {
  version: string;
  status: 'resolved' | 'partial' | 'unresolved';
  emissivePanel: boolean | 'unknown';
  areaCm2?: number;
  megapixelsPerFrame?: number;
  operatingRefreshRateHz?: number;
  refreshDutyVsMaximum?: number;
  pixelScanMpxPerSecond?: number;
  luminanceAreaNitCm2?: number;
  aplFraction?: number;
  emissiveContentLoadIndex?: number;
  normalizedEmissionLoadVs1000Nit100Apl?: number;
  scenarios: Array<{
    scenario:
      | 'dark-content'
      | 'half-brightness'
      | '60hz-operating';
    label: string;
    emissiveContentLoadIndex?: number;
    pixelScanMpxPerSecond?: number;
    deltaEmissionLoadPercent?: number;
    deltaPixelScanPercent?: number;
  }>;
  warnings: string[];
  note: string;
}

function positive(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value > 0
  );
}

function panelIsEmissive(
  technology: string | undefined,
): boolean | 'unknown' {
  if (!technology?.trim()) return 'unknown';

  const value =
    technology.trim().toLowerCase();

  if (
    value.includes('oled') ||
    value.includes('amoled')
  ) {
    return true;
  }

  if (
    value.includes('lcd') ||
    value.includes('ips') ||
    value.includes('mini-led') ||
    value.includes('mini led')
  ) {
    return false;
  }

  return 'unknown';
}

function percentDelta(
  next: number | undefined,
  baseline: number | undefined,
) {
  if (
    next === undefined ||
    baseline === undefined ||
    !Number.isFinite(next) ||
    !Number.isFinite(baseline) ||
    baseline === 0
  ) {
    return undefined;
  }

  return (
    (next / baseline - 1) *
    100
  );
}

export function calculateDisplayLoad(
  input: DisplayLoadInput,
): DisplayLoadResult {
  const warnings: string[] = [];
  const emissivePanel =
    panelIsEmissive(input.panelTechnology);

  if (
    input.averagePictureLevelPercent !== undefined &&
    (
      !Number.isFinite(
        input.averagePictureLevelPercent,
      ) ||
      input.averagePictureLevelPercent < 0 ||
      input.averagePictureLevelPercent > 100
    )
  ) {
    warnings.push(
      'Average picture level must be between 0 and 100 percent.',
    );
  }

  if (
    input.operatingRefreshRateHz !== undefined &&
    !positive(input.operatingRefreshRateHz)
  ) {
    warnings.push(
      'Operating refresh rate must be a positive finite value.',
    );
  }

  if (
    input.maximumRefreshRateHz !== undefined &&
    !positive(input.maximumRefreshRateHz)
  ) {
    warnings.push(
      'Maximum refresh rate must be a positive finite value.',
    );
  }

  if (
    positive(input.operatingRefreshRateHz) &&
    positive(input.maximumRefreshRateHz) &&
    input.operatingRefreshRateHz >
      input.maximumRefreshRateHz
  ) {
    warnings.push(
      'Operating refresh rate exceeds the supplied maximum refresh rate.',
    );
  }

  const areaCm2 =
    positive(input.areaMm2)
      ? input.areaMm2 / 100
      : undefined;

  const megapixelsPerFrame =
    positive(input.resolutionWidthPx) &&
    positive(input.resolutionHeightPx)
      ? (
          input.resolutionWidthPx *
          input.resolutionHeightPx
        ) /
        1_000_000
      : undefined;

  const operatingRefreshRateHz =
    positive(input.operatingRefreshRateHz)
      ? input.operatingRefreshRateHz
      : positive(input.maximumRefreshRateHz)
        ? input.maximumRefreshRateHz
        : undefined;

  const refreshDutyVsMaximum =
    operatingRefreshRateHz !== undefined &&
    positive(input.maximumRefreshRateHz)
      ? operatingRefreshRateHz /
        input.maximumRefreshRateHz
      : undefined;

  const pixelScanMpxPerSecond =
    megapixelsPerFrame !== undefined &&
    operatingRefreshRateHz !== undefined
      ? megapixelsPerFrame *
        operatingRefreshRateHz
      : undefined;

  const luminanceAreaNitCm2 =
    areaCm2 !== undefined &&
    positive(input.brightnessNits)
      ? areaCm2 *
        input.brightnessNits
      : undefined;

  const validApl =
    input.averagePictureLevelPercent !== undefined &&
    Number.isFinite(
      input.averagePictureLevelPercent,
    ) &&
    input.averagePictureLevelPercent >= 0 &&
    input.averagePictureLevelPercent <= 100
      ? input.averagePictureLevelPercent / 100
      : undefined;

  const emissiveContentLoadIndex =
    emissivePanel === true &&
    luminanceAreaNitCm2 !== undefined &&
    validApl !== undefined
      ? luminanceAreaNitCm2 *
        validApl
      : undefined;

  const normalizedEmissionLoadVs1000Nit100Apl =
    emissiveContentLoadIndex !== undefined &&
    areaCm2 !== undefined &&
    areaCm2 > 0
      ? emissiveContentLoadIndex /
        (areaCm2 * 1000)
      : undefined;

  const scenarios: DisplayLoadResult['scenarios'] =
    [];

  if (
    emissiveContentLoadIndex !== undefined &&
    luminanceAreaNitCm2 !== undefined &&
    validApl !== undefined &&
    validApl > 0.2
  ) {
    const darkApl = 0.2;
    const next =
      luminanceAreaNitCm2 *
      darkApl;

    scenarios.push({
      scenario: 'dark-content',
      label: 'Average picture level → 20%',
      emissiveContentLoadIndex: next,
      deltaEmissionLoadPercent:
        percentDelta(
          next,
          emissiveContentLoadIndex,
        ),
    });
  }

  if (
    emissivePanel === true &&
    areaCm2 !== undefined &&
    positive(input.brightnessNits) &&
    validApl !== undefined
  ) {
    const next =
      areaCm2 *
      (input.brightnessNits / 2) *
      validApl;

    scenarios.push({
      scenario: 'half-brightness',
      label: 'Brightness → 50%',
      emissiveContentLoadIndex: next,
      deltaEmissionLoadPercent:
        percentDelta(
          next,
          emissiveContentLoadIndex,
        ),
    });
  }

  if (
    megapixelsPerFrame !== undefined &&
    operatingRefreshRateHz !== undefined &&
    operatingRefreshRateHz > 60
  ) {
    const next =
      megapixelsPerFrame * 60;

    scenarios.push({
      scenario: '60hz-operating',
      label: 'Operating refresh → 60 Hz',
      pixelScanMpxPerSecond: next,
      deltaPixelScanPercent:
        percentDelta(
          next,
          pixelScanMpxPerSecond,
        ),
    });
  }

  const resolvedSignals = [
    pixelScanMpxPerSecond,
    luminanceAreaNitCm2,
    emissiveContentLoadIndex,
  ].filter(
    (value) => value !== undefined,
  ).length;

  return {
    version: DISPLAY_LOAD_MODEL_VERSION,
    status:
      resolvedSignals >= 3
        ? 'resolved'
        : resolvedSignals > 0
          ? 'partial'
          : 'unresolved',
    emissivePanel,
    areaCm2,
    megapixelsPerFrame,
    operatingRefreshRateHz,
    refreshDutyVsMaximum,
    pixelScanMpxPerSecond,
    luminanceAreaNitCm2,
    aplFraction: validApl,
    emissiveContentLoadIndex,
    normalizedEmissionLoadVs1000Nit100Apl,
    scenarios,
    warnings,
    note:
      emissivePanel === true
        ? 'OLED/AMOLED emissive-content load is modeled from physical screen area, supplied brightness and average picture level. Pixel scan load is modeled separately from resolution and operating refresh. These are deterministic load indices, not electrical watts.'
        : emissivePanel === false
          ? 'This panel is not treated as directly emissive per pixel, so OLED-style APL emission scaling is not applied. Pixel scan load remains available. No electrical watts are invented.'
          : 'Panel technology is unresolved. Pixel scan load can still be calculated, but emissive APL scaling is withheld until the panel type is known.',
  };
}
