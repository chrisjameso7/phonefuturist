import { buildCalibrationRegistry } from './calibration-registry';
import type {
  CorpusMeasurement,
  DeviceCorpus,
  DeviceCorpusRecord,
} from './device-corpus';
import {
  interpolateDisplayPower,
  type DisplayPowerInterpolationAxis,
} from './display-power-interpolation';
import type {
  DisplayPowerCalibrationQuery,
} from './display-power-calibration';

export const DISPLAY_POWER_RESPONSE_VERSION =
  'display-power-response-0.1.0';

export interface DisplayPowerResponseReference {
  deviceVariantId: string;
  axis: DisplayPowerInterpolationAxis;
  expectedPowerW: number;
  targetValue: number;
  lowValue: number;
  highValue: number;
  lowPowerW: number;
  highPowerW: number;
  areaScore: number;
  sourceIds: string[];
  publishers: string[];
}

export interface DisplayPowerResponseResult {
  version: string;
  status: 'resolved' | 'unresolved';
  expectedPowerW?: number;
  minPowerW?: number;
  maxPowerW?: number;
  referenceCount: number;
  sourceRecordCount: number;
  publisherCount: number;
  references: DisplayPowerResponseReference[];
  unresolvedReason?: string;
  note: string;
}

function normalize(value?: string) {
  return value
    ?.trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function panelClass(value?: string) {
  const v = normalize(value);
  if (!v) return 'unknown';
  if (
    v.includes('oled') ||
    v.includes('amoled')
  ) return 'oled';
  if (
    v.includes('lcd') ||
    v.includes('ips') ||
    v.includes('mini-led') ||
    v.includes('mini led')
  ) return 'lcd';
  return 'other';
}

function positive(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value > 0
  );
}

function isolated(
  measurement: CorpusMeasurement,
) {
  return (
    measurement.workload === 'display' &&
    measurement.evidenceKind === 'measured' &&
    measurement.componentScope ===
      'display-panel' &&
    measurement.metric ===
      'display_power_w' &&
    normalize(measurement.unit) === 'w' &&
    positive(measurement.value) &&
    positive(
      measurement.displayBrightnessNits,
    ) &&
    measurement.averagePictureLevelPercent !==
      undefined &&
    Number.isFinite(
      measurement.averagePictureLevelPercent,
    ) &&
    measurement.averagePictureLevelPercent >=
      0 &&
    measurement.averagePictureLevelPercent <=
      100 &&
    positive(measurement.refreshRateHz)
  );
}

function areaCm2(
  display: DeviceCorpusRecord['display'],
) {
  if (
    !positive(display?.diagonalInches) ||
    !positive(display?.resolutionWidthPx) ||
    !positive(display?.resolutionHeightPx)
  ) return undefined;

  const ratio =
    display.resolutionWidthPx /
    display.resolutionHeightPx;
  const diagonalCm =
    display.diagonalInches * 2.54;
  const heightCm =
    diagonalCm /
    Math.sqrt(1 + ratio * ratio);
  const widthCm =
    heightCm * ratio;
  return widthCm * heightCm;
}

function targetAreaCm2(
  query: DisplayPowerCalibrationQuery,
) {
  return areaCm2({
    diagonalInches:
      query.diagonalInches,
    resolutionWidthPx:
      query.resolutionWidthPx,
    resolutionHeightPx:
      query.resolutionHeightPx,
  });
}

function closeness(
  a: number,
  b: number,
  toleranceFraction: number,
) {
  const relative =
    Math.abs(a - b) /
    Math.max(
      Math.abs(b),
      0.001,
    );
  return Math.max(
    0,
    1 -
      relative /
        toleranceFraction,
  );
}

function operatingPoint(
  measurement: CorpusMeasurement,
) {
  return {
    powerW: measurement.value,
    brightnessNits:
      measurement.displayBrightnessNits!,
    averagePictureLevelPercent:
      measurement.averagePictureLevelPercent!,
    refreshRateHz:
      measurement.refreshRateHz!,
  };
}

function near(
  a: number,
  b: number,
  tolerance: number,
) {
  return Math.abs(a - b) <= tolerance;
}

function candidateAxis(
  a: CorpusMeasurement,
  b: CorpusMeasurement,
  query: DisplayPowerCalibrationQuery,
):
  | {
      axis: DisplayPowerInterpolationAxis;
      targetValue: number;
    }
  | undefined {
  const brightnessSame =
    near(
      a.displayBrightnessNits!,
      b.displayBrightnessNits!,
      0.01,
    );
  const aplSame =
    near(
      a.averagePictureLevelPercent!,
      b.averagePictureLevelPercent!,
      0.01,
    );
  const refreshSame =
    near(
      a.refreshRateHz!,
      b.refreshRateHz!,
      0.01,
    );

  const changed =
    [
      !brightnessSame,
      !aplSame,
      !refreshSame,
    ].filter(Boolean).length;

  if (changed !== 1) return undefined;

  if (
    !brightnessSame &&
    query.brightnessNits !== undefined &&
    query.averagePictureLevelPercent !==
      undefined &&
    query.operatingRefreshRateHz !==
      undefined &&
    near(
      query.averagePictureLevelPercent,
      a.averagePictureLevelPercent!,
      0.5,
    ) &&
    near(
      query.operatingRefreshRateHz,
      a.refreshRateHz!,
      1,
    )
  ) {
    return {
      axis: 'brightness-nits',
      targetValue:
        query.brightnessNits,
    };
  }

  if (
    !aplSame &&
    query.averagePictureLevelPercent !==
      undefined &&
    query.brightnessNits !== undefined &&
    query.operatingRefreshRateHz !==
      undefined &&
    near(
      query.brightnessNits,
      a.displayBrightnessNits!,
      5,
    ) &&
    near(
      query.operatingRefreshRateHz,
      a.refreshRateHz!,
      1,
    )
  ) {
    return {
      axis: 'apl-percent',
      targetValue:
        query.averagePictureLevelPercent,
    };
  }

  if (
    !refreshSame &&
    query.operatingRefreshRateHz !==
      undefined &&
    query.brightnessNits !== undefined &&
    query.averagePictureLevelPercent !==
      undefined &&
    near(
      query.brightnessNits,
      a.displayBrightnessNits!,
      5,
    ) &&
    near(
      query.averagePictureLevelPercent,
      a.averagePictureLevelPercent!,
      0.5,
    )
  ) {
    return {
      axis: 'refresh-hz',
      targetValue:
        query.operatingRefreshRateHz,
    };
  }

  return undefined;
}

function axisValue(
  measurement: CorpusMeasurement,
  axis: DisplayPowerInterpolationAxis,
) {
  switch (axis) {
    case 'brightness-nits':
      return measurement
        .displayBrightnessNits!;
    case 'apl-percent':
      return measurement
        .averagePictureLevelPercent!;
    case 'refresh-hz':
      return measurement
        .refreshRateHz!;
  }
}

export function resolveDisplayPowerResponse(
  corpus: DeviceCorpus,
  query: DisplayPowerCalibrationQuery,
): DisplayPowerResponseResult {
  if (
    !positive(query.brightnessNits) ||
    query.averagePictureLevelPercent ===
      undefined ||
    !Number.isFinite(
      query.averagePictureLevelPercent,
    ) ||
    query.averagePictureLevelPercent < 0 ||
    query.averagePictureLevelPercent > 100 ||
    !positive(
      query.operatingRefreshRateHz,
    )
  ) {
    return {
      version:
        DISPLAY_POWER_RESPONSE_VERSION,
      status: 'unresolved',
      referenceCount: 0,
      sourceRecordCount: 0,
      publisherCount: 0,
      references: [],
      unresolvedReason:
        'Display response interpolation requires brightness, APL and operating refresh.',
      note:
        'No electrical watts are derived from incomplete target operating conditions.',
    };
  }

  const sourceById =
    new Map(
      corpus.sources.map(
        (source) => [
          source.id,
          source,
        ],
      ),
    );
  const deviceById =
    new Map(
      corpus.devices.map(
        (device) => [
          device.variant.id,
          device,
        ],
      ),
    );

  const targetPanelClass =
    panelClass(
      query.panelTechnology,
    );
  const targetArea =
    targetAreaCm2(query);

  const grouped =
    new Map<
      string,
      CorpusMeasurement[]
    >();

  for (
    const measurement of
    corpus.measurements.filter(isolated)
  ) {
    const list =
      grouped.get(
        measurement.deviceVariantId,
      ) ?? [];
    list.push(measurement);
    grouped.set(
      measurement.deviceVariantId,
      list,
    );
  }

  const references:
    DisplayPowerResponseReference[] =
    [];

  for (
    const [
      deviceVariantId,
      measurements,
    ] of grouped
  ) {
    const device =
      deviceById.get(
        deviceVariantId,
      );
    if (!device) continue;

    const referencePanelClass =
      panelClass(
        device.display
          ?.panelTechnology,
      );

    if (
      targetPanelClass !== 'unknown' &&
      referencePanelClass !== 'unknown' &&
      targetPanelClass !==
        referencePanelClass
    ) {
      continue;
    }

    const referenceArea =
      areaCm2(
        device.display,
      );

    const areaScore =
      targetArea !== undefined &&
      referenceArea !== undefined
        ? closeness(
            targetArea,
            referenceArea,
            0.25,
          )
        : 0.5;

    if (areaScore <= 0) continue;

    for (
      let i = 0;
      i < measurements.length;
      i += 1
    ) {
      for (
        let j = i + 1;
        j < measurements.length;
        j += 1
      ) {
        const a =
          measurements[i];
        const b =
          measurements[j];

        const axis =
          candidateAxis(
            a,
            b,
            query,
          );
        if (!axis) continue;

        const interpolated =
          interpolateDisplayPower({
            axis: axis.axis,
            low: operatingPoint(a),
            high: operatingPoint(b),
            targetValue:
              axis.targetValue,
          });

        if (
          interpolated.status !==
            'resolved' ||
          interpolated.expectedPowerW ===
            undefined
        ) {
          continue;
        }

        references.push({
          deviceVariantId,
          axis: axis.axis,
          expectedPowerW:
            interpolated.expectedPowerW,
          targetValue:
            axis.targetValue,
          lowValue:
            axisValue(
              a,
              axis.axis,
            ),
          highValue:
            axisValue(
              b,
              axis.axis,
            ),
          lowPowerW: a.value,
          highPowerW: b.value,
          areaScore,
          sourceIds: [
            ...new Set([
              a.sourceId,
              b.sourceId,
            ]),
          ],
          publishers: [
            ...new Set([
              sourceById.get(
                a.sourceId,
              )?.publisher ??
                a.sourceId,
              sourceById.get(
                b.sourceId,
              )?.publisher ??
                b.sourceId,
            ]),
          ],
        });
      }
    }
  }

  if (!references.length) {
    return {
      version:
        DISPLAY_POWER_RESPONSE_VERSION,
      status: 'unresolved',
      referenceCount: 0,
      sourceRecordCount: 0,
      publisherCount: 0,
      references: [],
      unresolvedReason:
        'No controlled isolated panel-power pair brackets the target operating point.',
      note:
        'Response interpolation requires two measured points from the same device that vary only one of brightness, APL or refresh and bracket the target.',
    };
  }

  const selected =
    references
      .sort(
        (a, b) =>
          b.areaScore -
          a.areaScore,
      )
      .slice(
        0,
        Math.max(
          1,
          query.limit ?? 5,
        ),
      );

  const totalWeight =
    selected.reduce(
      (sum, reference) =>
        sum +
        Math.max(
          reference.areaScore,
          0.05,
        ) ** 2,
      0,
    );

  const expectedPowerW =
    selected.reduce(
      (sum, reference) =>
        sum +
        reference.expectedPowerW *
          Math.max(
            reference.areaScore,
            0.05,
          ) ** 2,
      0,
    ) /
    Math.max(
      totalWeight,
      Number.EPSILON,
    );

  return {
    version:
      DISPLAY_POWER_RESPONSE_VERSION,
    status: 'resolved',
    expectedPowerW,
    minPowerW:
      Math.min(
        ...selected.map(
          (reference) =>
            reference.expectedPowerW,
        ),
      ),
    maxPowerW:
      Math.max(
        ...selected.map(
          (reference) =>
            reference.expectedPowerW,
        ),
      ),
    referenceCount:
      selected.length,
    sourceRecordCount:
      new Set(
        selected.flatMap(
          (reference) =>
            reference.sourceIds,
        ),
      ).size,
    publisherCount:
      new Set(
        selected.flatMap(
          (reference) =>
            reference.publishers,
        ),
      ).size,
    references: selected,
    note:
      'Display watts come from controlled interpolation between isolated measured panel-power points. Interpolation is one-axis-at-a-time and never extrapolates outside the measured interval.',
  };
}

export function resolveLiveDisplayPowerResponse(
  query: DisplayPowerCalibrationQuery,
) {
  return resolveDisplayPowerResponse(
    buildCalibrationRegistry(),
    query,
  );
}
