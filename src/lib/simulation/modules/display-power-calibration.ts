import { buildCalibrationRegistry } from './calibration-registry';
import type {
  CorpusMeasurement,
  DeviceCorpus,
  DeviceCorpusRecord,
} from './device-corpus';

export const DISPLAY_POWER_CALIBRATION_VERSION =
  'display-power-calibration-0.1.0';

export interface DisplayPowerCalibrationQuery {
  panelTechnology?: string;
  diagonalInches?: number;
  resolutionWidthPx?: number;
  resolutionHeightPx?: number;
  brightnessNits?: number;
  averagePictureLevelPercent?: number;
  operatingRefreshRateHz?: number;
  limit?: number;
}

export interface DisplayPowerReference {
  deviceVariantId: string;
  powerW: number;
  panelTechnology?: string;
  brightnessNits: number;
  averagePictureLevelPercent: number;
  refreshRateHz: number;
  areaCm2?: number;
  sourceId: string;
  publisher: string;
  score: number;
  reasons: string[];
}

export interface DisplayPowerCalibrationResult {
  version: string;
  status: 'resolved' | 'unresolved';
  expectedPowerW?: number;
  minPowerW?: number;
  maxPowerW?: number;
  confidence?: number;
  referenceCount: number;
  sourceRecordCount: number;
  publisherCount: number;
  references: DisplayPowerReference[];
  unresolvedReason?: string;
  note: string;
}

function positive(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value > 0
  );
}

function normalize(value?: string) {
  return value
    ?.trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function panelClass(value?: string) {
  const normalized = normalize(value);
  if (!normalized) return 'unknown';

  if (
    normalized.includes('oled') ||
    normalized.includes('amoled')
  ) {
    return 'oled';
  }

  if (
    normalized.includes('lcd') ||
    normalized.includes('ips') ||
    normalized.includes('mini-led') ||
    normalized.includes('mini led')
  ) {
    return 'lcd';
  }

  return 'other';
}

function displayAreaCm2(
  display: DeviceCorpusRecord['display'],
) {
  if (
    !positive(display?.diagonalInches) ||
    !positive(display?.resolutionWidthPx) ||
    !positive(display?.resolutionHeightPx)
  ) {
    return undefined;
  }

  const width =
    display.resolutionWidthPx;
  const height =
    display.resolutionHeightPx;
  const ratio =
    width / height;

  const diagonalCm =
    display.diagonalInches * 2.54;

  const heightCm =
    diagonalCm /
    Math.sqrt(
      1 + ratio * ratio,
    );

  const widthCm =
    ratio * heightCm;

  return widthCm * heightCm;
}

function isIsolatedDisplayPower(
  measurement: CorpusMeasurement,
) {
  return (
    measurement.workload === 'display' &&
    measurement.evidenceKind === 'measured' &&
    measurement.componentScope === 'display-panel' &&
    measurement.metric === 'display_power_w' &&
    normalize(measurement.unit) === 'w' &&
    positive(measurement.value) &&
    positive(measurement.displayBrightnessNits) &&
    measurement.averagePictureLevelPercent !== undefined &&
    Number.isFinite(measurement.averagePictureLevelPercent) &&
    measurement.averagePictureLevelPercent >= 0 &&
    measurement.averagePictureLevelPercent <= 100 &&
    positive(measurement.refreshRateHz)
  );
}

function closeness(
  target: number,
  reference: number,
  toleranceFraction: number,
) {
  const relative =
    Math.abs(target - reference) /
    Math.max(
      Math.abs(reference),
      0.001,
    );

  return Math.max(
    0,
    1 -
      relative /
        toleranceFraction,
  );
}

export function calibrateDisplayPower(
  corpus: DeviceCorpus,
  query: DisplayPowerCalibrationQuery,
): DisplayPowerCalibrationResult {
  if (
    !positive(query.brightnessNits) ||
    query.averagePictureLevelPercent === undefined ||
    !Number.isFinite(query.averagePictureLevelPercent) ||
    query.averagePictureLevelPercent < 0 ||
    query.averagePictureLevelPercent > 100 ||
    !positive(query.operatingRefreshRateHz)
  ) {
    return {
      version: DISPLAY_POWER_CALIBRATION_VERSION,
      status: 'unresolved',
      referenceCount: 0,
      sourceRecordCount: 0,
      publisherCount: 0,
      references: [],
      unresolvedReason:
        'Display watts require target brightness, average picture level and operating refresh rate.',
      note:
        'Electrical display power is withheld until both target conditions and isolated panel-power evidence are available.',
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

  const targetAreaCm2 =
    displayAreaCm2({
      diagonalInches:
        query.diagonalInches,
      resolutionWidthPx:
        query.resolutionWidthPx,
      resolutionHeightPx:
        query.resolutionHeightPx,
    });

  const targetPanelClass =
    panelClass(
      query.panelTechnology,
    );

  const references =
    corpus.measurements
      .filter(isIsolatedDisplayPower)
      .flatMap((measurement) => {
        const device =
          deviceById.get(
            measurement.deviceVariantId,
          );

        if (!device) return [];

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
          return [];
        }

        const brightnessScore =
          closeness(
            query.brightnessNits!,
            measurement.displayBrightnessNits!,
            0.25,
          );

        const aplDifference =
          Math.abs(
            query.averagePictureLevelPercent! -
            measurement.averagePictureLevelPercent!,
          );

        const aplScore =
          Math.max(
            0,
            1 -
              aplDifference /
                20,
          );

        const refreshScore =
          closeness(
            query.operatingRefreshRateHz!,
            measurement.refreshRateHz!,
            0.35,
          );

        const referenceAreaCm2 =
          displayAreaCm2(
            device.display,
          );

        const areaScore =
          targetAreaCm2 !== undefined &&
          referenceAreaCm2 !== undefined
            ? closeness(
                targetAreaCm2,
                referenceAreaCm2,
                0.25,
              )
            : 0.5;

        // Strict v0.1: do not extrapolate measured watts far outside the
        // measured operating point. This is calibration, not a universal
        // OLED/LCD power equation.
        if (
          brightnessScore <= 0 ||
          aplScore <= 0 ||
          refreshScore <= 0 ||
          areaScore <= 0
        ) {
          return [];
        }

        const reasons: string[] = [];
        if (brightnessScore > 0.7) {
          reasons.push('similar brightness');
        }
        if (aplScore > 0.7) {
          reasons.push('similar APL');
        }
        if (refreshScore > 0.7) {
          reasons.push('similar refresh rate');
        }
        if (areaScore > 0.7) {
          reasons.push('similar panel area');
        }
        if (
          targetPanelClass !== 'unknown' &&
          targetPanelClass ===
            referencePanelClass
        ) {
          reasons.push('same panel class');
        }

        const score =
          (
            brightnessScore *
            aplScore *
            refreshScore *
            areaScore
          ) **
          0.25;

        const source =
          sourceById.get(
            measurement.sourceId,
          );

        return [{
          deviceVariantId:
            measurement.deviceVariantId,
          powerW:
            measurement.value,
          panelTechnology:
            device.display
              ?.panelTechnology,
          brightnessNits:
            measurement.displayBrightnessNits!,
          averagePictureLevelPercent:
            measurement.averagePictureLevelPercent!,
          refreshRateHz:
            measurement.refreshRateHz!,
          areaCm2:
            referenceAreaCm2,
          sourceId:
            measurement.sourceId,
          publisher:
            source?.publisher ??
            measurement.sourceId,
          score,
          reasons,
        }];
      })
      .sort(
        (a, b) =>
          b.score - a.score,
      )
      .slice(
        0,
        Math.max(
          1,
          query.limit ?? 5,
        ),
      );

  if (!references.length) {
    return {
      version: DISPLAY_POWER_CALIBRATION_VERSION,
      status: 'unresolved',
      referenceCount: 0,
      sourceRecordCount: 0,
      publisherCount: 0,
      references: [],
      unresolvedReason:
        'No sufficiently similar isolated display-panel power measurements exist in the calibration corpus.',
      note:
        'Whole-device power and combined display-plus-network measurements are intentionally excluded from panel-watt calibration.',
    };
  }

  const weighted =
    references.map(
      (reference) => ({
        ...reference,
        weight:
          Math.max(
            reference.score,
            0.05,
          ) ** 2,
      }),
    );

  const totalWeight =
    weighted.reduce(
      (sum, reference) =>
        sum +
        reference.weight,
      0,
    );

  const expectedPowerW =
    weighted.reduce(
      (sum, reference) =>
        sum +
        reference.powerW *
          reference.weight,
      0,
    ) /
    Math.max(
      totalWeight,
      Number.EPSILON,
    );

  return {
    version: DISPLAY_POWER_CALIBRATION_VERSION,
    status: 'resolved',
    expectedPowerW,
    minPowerW:
      Math.min(
        ...references.map(
          (reference) =>
            reference.powerW,
        ),
      ),
    maxPowerW:
      Math.max(
        ...references.map(
          (reference) =>
            reference.powerW,
        ),
      ),
    confidence:
      references.reduce(
        (sum, reference) =>
          sum +
          reference.score,
        0,
      ) /
      references.length,
    referenceCount:
      references.length,
    sourceRecordCount:
      new Set(
        references.map(
          (reference) =>
            reference.sourceId,
        ),
      ).size,
    publisherCount:
      new Set(
        references.map(
          (reference) =>
            reference.publisher,
        ),
      ).size,
    references,
    note:
      'Electrical panel watts are calibrated only from explicitly isolated, measured display-panel power taken at similar brightness, APL, refresh rate and panel size. No deterministic load index is converted to watts.',
  };
}

export function calibrateLiveDisplayPower(
  query: DisplayPowerCalibrationQuery,
) {
  return calibrateDisplayPower(
    buildCalibrationRegistry(),
    query,
  );
}
