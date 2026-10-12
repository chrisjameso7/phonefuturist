export const CAMERA_SENSOR_NOISE_VERSION =
  'camera-sensor-noise-0.1.0';

export interface CameraSensorNoiseInput {
  fullWellElectrons?: number;
  readNoiseElectrons?: number;
  darkCurrentElectronsPerSecond?: number;
  exposureTimeSeconds?: number;
  signalElectrons?: number;
}

export interface CameraSensorNoiseResult {
  version: string;
  status: 'resolved' | 'partial' | 'unresolved';
  fullWellElectrons?: number;
  readNoiseElectrons?: number;
  darkCurrentElectronsPerSecond?: number;
  exposureTimeSeconds?: number;
  darkElectronsDuringExposure?: number;
  darkShotNoiseElectrons?: number;
  effectiveNoiseFloorElectrons?: number;
  dynamicRangeStops?: number;
  dynamicRangeDb?: number;
  signalElectrons?: number;
  signalShotNoiseElectrons?: number;
  totalSignalNoiseElectrons?: number;
  signalToNoiseRatio?: number;
  signalToNoiseDb?: number;
  saturationHeadroomElectrons?: number;
  saturationFraction?: number;
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

function nonNegative(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= 0
  );
}

export function calculateCameraSensorNoise(
  input: CameraSensorNoiseInput,
): CameraSensorNoiseResult {
  const warnings: string[] = [];

  const fullWellElectrons =
    positive(input.fullWellElectrons)
      ? input.fullWellElectrons
      : undefined;

  const readNoiseElectrons =
    positive(input.readNoiseElectrons)
      ? input.readNoiseElectrons
      : undefined;

  const darkCurrentElectronsPerSecond =
    nonNegative(
      input.darkCurrentElectronsPerSecond,
    )
      ? input.darkCurrentElectronsPerSecond
      : undefined;

  const exposureTimeSeconds =
    positive(input.exposureTimeSeconds)
      ? input.exposureTimeSeconds
      : undefined;

  const signalElectrons =
    nonNegative(input.signalElectrons)
      ? input.signalElectrons
      : undefined;

  if (
    input.fullWellElectrons !== undefined &&
    fullWellElectrons === undefined
  ) {
    warnings.push(
      'Full-well capacity must be a positive finite electron count when supplied.',
    );
  }

  if (
    input.readNoiseElectrons !== undefined &&
    readNoiseElectrons === undefined
  ) {
    warnings.push(
      'Read noise must be a positive finite electron count when supplied.',
    );
  }

  if (
    signalElectrons !== undefined &&
    fullWellElectrons !== undefined &&
    signalElectrons > fullWellElectrons
  ) {
    warnings.push(
      'Supplied signal electrons exceed full-well capacity; the pixel would be saturated under this simplified model.',
    );
  }

  const darkElectronsDuringExposure =
    darkCurrentElectronsPerSecond !==
      undefined &&
    exposureTimeSeconds !== undefined
      ? darkCurrentElectronsPerSecond *
        exposureTimeSeconds
      : undefined;

  const darkShotNoiseElectrons =
    darkElectronsDuringExposure !==
      undefined
      ? Math.sqrt(
          darkElectronsDuringExposure,
        )
      : undefined;

  const effectiveNoiseFloorElectrons =
    readNoiseElectrons !== undefined
      ? Math.sqrt(
          readNoiseElectrons ** 2 +
          (darkShotNoiseElectrons ?? 0) **
            2,
        )
      : undefined;

  const dynamicRangeStops =
    fullWellElectrons !== undefined &&
    effectiveNoiseFloorElectrons !==
      undefined &&
    effectiveNoiseFloorElectrons > 0
      ? Math.log2(
          fullWellElectrons /
            effectiveNoiseFloorElectrons,
        )
      : undefined;

  const dynamicRangeDb =
    fullWellElectrons !== undefined &&
    effectiveNoiseFloorElectrons !==
      undefined &&
    effectiveNoiseFloorElectrons > 0
      ? 20 *
        Math.log10(
          fullWellElectrons /
            effectiveNoiseFloorElectrons,
        )
      : undefined;

  const signalShotNoiseElectrons =
    signalElectrons !== undefined
      ? Math.sqrt(signalElectrons)
      : undefined;

  const totalSignalNoiseElectrons =
    signalElectrons !== undefined &&
    readNoiseElectrons !== undefined
      ? Math.sqrt(
          signalElectrons +
          readNoiseElectrons ** 2 +
          (darkElectronsDuringExposure ??
            0),
        )
      : undefined;

  const signalToNoiseRatio =
    signalElectrons !== undefined &&
    totalSignalNoiseElectrons !==
      undefined &&
    totalSignalNoiseElectrons > 0
      ? signalElectrons /
        totalSignalNoiseElectrons
      : undefined;

  const signalToNoiseDb =
    signalToNoiseRatio !== undefined &&
    signalToNoiseRatio > 0
      ? 20 *
        Math.log10(
          signalToNoiseRatio,
        )
      : undefined;

  const saturationHeadroomElectrons =
    signalElectrons !== undefined &&
    fullWellElectrons !== undefined
      ? Math.max(
          0,
          fullWellElectrons -
            signalElectrons,
        )
      : undefined;

  const saturationFraction =
    signalElectrons !== undefined &&
    fullWellElectrons !== undefined &&
    fullWellElectrons > 0
      ? Math.min(
          1,
          Math.max(
            0,
            signalElectrons /
              fullWellElectrons,
          ),
        )
      : undefined;

  const availableSignals = [
    dynamicRangeStops,
    signalToNoiseRatio,
    darkElectronsDuringExposure,
  ].filter(
    (value) => value !== undefined,
  ).length;

  return {
    version:
      CAMERA_SENSOR_NOISE_VERSION,
    status:
      availableSignals >= 2
        ? 'resolved'
        : availableSignals === 1 ||
            fullWellElectrons !==
              undefined ||
            readNoiseElectrons !==
              undefined
          ? 'partial'
          : 'unresolved',
    ...(fullWellElectrons !== undefined
      ? { fullWellElectrons }
      : {}),
    ...(readNoiseElectrons !== undefined
      ? { readNoiseElectrons }
      : {}),
    ...(darkCurrentElectronsPerSecond !==
    undefined
      ? { darkCurrentElectronsPerSecond }
      : {}),
    ...(exposureTimeSeconds !== undefined
      ? { exposureTimeSeconds }
      : {}),
    ...(darkElectronsDuringExposure !==
    undefined
      ? { darkElectronsDuringExposure }
      : {}),
    ...(darkShotNoiseElectrons !==
    undefined
      ? { darkShotNoiseElectrons }
      : {}),
    ...(effectiveNoiseFloorElectrons !==
    undefined
      ? { effectiveNoiseFloorElectrons }
      : {}),
    ...(dynamicRangeStops !== undefined
      ? { dynamicRangeStops }
      : {}),
    ...(dynamicRangeDb !== undefined
      ? { dynamicRangeDb }
      : {}),
    ...(signalElectrons !== undefined
      ? { signalElectrons }
      : {}),
    ...(signalShotNoiseElectrons !==
    undefined
      ? { signalShotNoiseElectrons }
      : {}),
    ...(totalSignalNoiseElectrons !==
    undefined
      ? { totalSignalNoiseElectrons }
      : {}),
    ...(signalToNoiseRatio !== undefined
      ? { signalToNoiseRatio }
      : {}),
    ...(signalToNoiseDb !== undefined
      ? { signalToNoiseDb }
      : {}),
    ...(saturationHeadroomElectrons !==
    undefined
      ? {
          saturationHeadroomElectrons,
        }
      : {}),
    ...(saturationFraction !== undefined
      ? { saturationFraction }
      : {}),
    warnings,
    note:
      'Sensor dynamic range and SNR are calculated only from explicitly supplied electron-domain measurements. Full-well capacity, read noise and dark current are never inferred from sensor size, pixel pitch, brand or process node.',
  };
}
