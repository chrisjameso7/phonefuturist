/**
 * Device/workload power evidence for Interactive Leaks Simple Mode.
 *
 * Architecture:
 *   user usage profile
 *     -> available PhoneFuturist reference/calibration power evidence
 *       -> device-specific estimate/adjustments where defensible
 *         -> workload mixture
 *           -> battery runtime
 *
 * Evidence rules (see docs/INTERACTIVE_LEAKS_CALIBRATION.md):
 *
 * - Raw observations are never rewritten and never relabelled. The seed
 *   dataset holds released-device runtimes, not watts, so watts are only
 *   ever produced by an explicit, recorded derivation.
 * - The single derived quantity here is screen-on average whole-device
 *   power for a continuous screen-on web duty cycle:
 *
 *       P_screen_on = published pack energy (Wh) / measured runtime (h)
 *
 *   That is a division of two traceable records, not a measurement of
 *   current draw, and it is never presented as one.
 * - The Tom's Guide 'validation' records are held out of the power anchor
 *   so they keep their role as an independent check.
 * - Nothing here invents a measured value. Where a workload has no
 *   evidence of its own it is held at the evidenced screen-on duty cycle
 *   and explicitly marked as an estimate.
 */

import calibrationDevices from '../../../data/calibration/battery/devices.json';
import calibrationMeasurements from '../../../data/calibration/battery/measurements.json';
import calibrationProtocols from '../../../data/calibration/battery/protocols.json';

import type { ModelProvenance } from './modules/modeling';
import type { SimulationInput } from './types';

/**
 * Version of the derived evidence model. Published simulations record
 * this alongside the calibration dataset so a historical result is never
 * silently rewritten by a later evidence update.
 */
export const POWER_EVIDENCE_VERSION = 'battery-calibration-1.0';

/** Dataset schema the derivation was written against. */
export const CALIBRATION_DATASET_VERSION = '0.1.0';

/**
 * Idle draw as a fraction of the evidenced screen-on duty cycle.
 *
 * This is the one modelling constant in this module. It is NOT derived
 * from the seed observations: no idle measurement exists in the dataset.
 * It is stated here, versioned with the model, carried in provenance and
 * surfaced in the receipt so it can be reviewed or struck out. Its
 * influence is bounded and small: at this fraction a full day of idle
 * time costs a small fraction of one watt-hour against a full pack.
 */
export const IDLE_FRACTION_OF_SCREEN_ON = 0.02;

/**
 * First-order display adjustment bounds.
 *
 * Screen-on draw scales with lit panel area. The linear ratio is a
 * documented approximation, so the applied correction is clamped to this
 * band rather than extrapolated: a very small or very large panel is not
 * allowed to imply an implausible whole-device power.
 */
export const DISPLAY_AREA_ADJUSTMENT = { min: 0.75, max: 1.35 } as const;

/** Relative energy difference that still counts as the same device. */
const ENERGY_MATCH_TOLERANCE = 0.15;

/** Relative display-area difference that still counts as the same device. */
const AREA_MATCH_TOLERANCE = 0.25;

// ---------------------------------------------------------
// Seed dataset shapes
// ---------------------------------------------------------

interface CalibrationDevice {
  id: string;
  manufacturer: string;
  model: string;
  battery: {
    rated_energy_wh?: number | null;
    typical_energy_wh?: number | null;
  };
  display: {
    diagonal_inches?: number | null;
    width_pixels?: number | null;
    height_pixels?: number | null;
  };
}

interface CalibrationMeasurement {
  id: string;
  device_id: string;
  protocol_id: string;
  metric: string;
  workload_class: string;
  value: { runtime_seconds?: number | null };
  dataset_role: string;
}

interface CalibrationProtocol {
  id: string;
  provider?: string;
  name?: string;
}

// ---------------------------------------------------------
// Reference devices
// ---------------------------------------------------------

/**
 * A released device whose published pack energy and measured runtime let
 * the seed dataset yield one derived quantity: average whole-device power
 * during a continuous screen-on web test.
 */
export interface ReferenceDevice {
  id: string;
  manufacturer: string;
  model: string;

  /** Published pack energy used as the energy basis for the division. */
  energyWh: number;

  /** Which published energy figure was used. */
  energyBasis: 'rated' | 'typical';

  runtimeSeconds: number;

  /** P_screen_on = energyWh / (runtimeSeconds / 3600). */
  screenOnPowerW: number;

  displayAreaCm2: number;

  measurementIds: string[];

  protocolId: string;

  provider: string;

  datasetRole: string;
}

function positiveFinite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

/**
 * Panel area in cm² from a diagonal and a pixel aspect ratio.
 * Returns undefined rather than guessing when either input is unknown.
 */
export function displayAreaCm2(
  diagonalInches: number | undefined,
  widthPx: number | undefined,
  heightPx: number | undefined,
): number | undefined {
  if (
    !positiveFinite(diagonalInches) ||
    !positiveFinite(widthPx) ||
    !positiveFinite(heightPx)
  ) {
    return undefined;
  }

  const diagonalCm = diagonalInches * 2.54;
  const pixels = widthPx * widthPx + heightPx * heightPx;

  if (!(pixels > 0)) {
    return undefined;
  }

  return (diagonalCm * diagonalCm * widthPx * widthPx) / pixels;
}

function buildReferenceDevices(): ReferenceDevice[] {
  const devices = (calibrationDevices as unknown as { devices?: CalibrationDevice[] })
    .devices;

  if (!Array.isArray(devices)) {
    return [];
  }

  const measurements = (
    calibrationMeasurements as unknown as {
      measurements?: CalibrationMeasurement[];
    }
  ).measurements;

  if (!Array.isArray(measurements)) {
    return [];
  }

  const protocols = (
    calibrationProtocols as unknown as { protocols?: CalibrationProtocol[] }
  ).protocols;

  const protocolById = new Map(
    (Array.isArray(protocols) ? protocols : []).map((protocol) => [
      protocol.id,
      protocol,
    ]),
  );

  const byId = new Map(devices.map((device) => [device.id, device]));

  const references: ReferenceDevice[] = [];

  for (const measurement of measurements) {
    // Only a released-device runtime under a named protocol can yield a
    // screen-on power. Anything else is not a runtime observation.
    if (measurement.metric !== 'runtime') continue;

    if (measurement.workload_class !== 'web') continue;

    if (measurement.dataset_role !== 'calibration') continue;

    const device = byId.get(measurement.device_id);

    if (!device) continue;

    const rated = device.battery.rated_energy_wh;
    const typical = device.battery.typical_energy_wh;

    const energyWh = positiveFinite(rated) ? rated : typical;
    const energyBasis = positiveFinite(rated) ? 'rated' : 'typical';

    if (!positiveFinite(energyWh) || !energyBasis) continue;

    const runtimeSeconds = measurement.value.runtime_seconds;

    if (!positiveFinite(runtimeSeconds)) continue;

    const area = displayAreaCm2(
      device.display.diagonal_inches ?? undefined,
      device.display.width_pixels ?? undefined,
      device.display.height_pixels ?? undefined,
    );

    // A reference without a known panel area can still anchor power, but
    // it cannot take part in a display-area correction.
    references.push({
      id: device.id,
      manufacturer: device.manufacturer,
      model: device.model,
      energyWh,
      energyBasis,
      runtimeSeconds,
      screenOnPowerW: energyWh / (runtimeSeconds / 3600),
      displayAreaCm2: area ?? 0,
      measurementIds: [measurement.id],
      protocolId: measurement.protocol_id,
      provider: protocolById.get(measurement.protocol_id)?.provider ?? 'Unknown',
      datasetRole: measurement.dataset_role,
    });
  }

  // Stable order keeps every downstream band reproducible.
  references.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  return references;
}

/** Every reference device the seed dataset can support. */
export const REFERENCE_DEVICES: readonly ReferenceDevice[] =
  buildReferenceDevices();

// ---------------------------------------------------------
// Device context
// ---------------------------------------------------------

/** The simulated device facts the evidence model is allowed to use. */
export interface EvidenceDevice {
  energyWh?: number;
  displayAreaCm2?: number;
}

/** Energy and panel area of the simulated device, or unknown. */
export function evidenceDeviceFrom(input: SimulationInput): EvidenceDevice {
  const cell = input.battery?.cells?.[0];

  const energyWh =
    cell && positiveFinite(cell.capacityMah) && positiveFinite(cell.nominalVoltageV)
      ? (cell.capacityMah * cell.nominalVoltageV) / 1000
      : undefined;

  const primary = input.displays?.primary;

  return {
    ...(energyWh !== undefined ? { energyWh } : {}),
    ...(() => {
      const area = displayAreaCm2(
        primary?.diagonalInches,
        primary?.resolutionWidthPx,
        primary?.resolutionHeightPx,
      );

      return area !== undefined ? { displayAreaCm2: area } : {};
    })(),
  };
}

// ---------------------------------------------------------
// Evidence resolution
// ---------------------------------------------------------

/** How the screen-on power for the simulated device was established. */
export type EvidenceBasis =
  /** A reference device matches the simulated device on energy and panel. */
  | 'matched-reference'
  /** No single reference matches; the whole calibration set is used. */
  | 'reference-population';

export interface ResolvedPowerEvidence {
  version: string;

  basis: EvidenceBasis;

  /** The reference device the watts were anchored to, when one matched. */
  reference?: ReferenceDevice;

  /**
   * Screen-on average whole-device power for the simulated device, as a
   * band taken from the spread of the reference set. A range, not a point:
   * these are other people's devices.
   */
  screenOnPowerW: { min: number; max: number };

  /** Screen-on power with the documented idle fraction applied. */
  idlePowerW: { min: number; max: number };

  /** Panel-area correction actually applied to each reference. */
  displayAdjustmentApplied: boolean;

  /** Reference devices that contributed to the band. */
  referenceCount: number;

  /** Traceable statements for the receipt and View Assumptions. */
  notes: string[];

  /** Documented modelling assumptions, distinct from evidence. */
  assumptions: string[];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function referenceAdjustment(
  reference: ReferenceDevice,
  device: EvidenceDevice,
): number | undefined {
  if (
    !positiveFinite(device.displayAreaCm2) ||
    !positiveFinite(reference.displayAreaCm2)
  ) {
    return undefined;
  }

  const ratio = device.displayAreaCm2 / reference.displayAreaCm2;

  if (!Number.isFinite(ratio)) {
    return undefined;
  }

  return clamp(
    ratio,
    DISPLAY_AREA_ADJUSTMENT.min,
    DISPLAY_AREA_ADJUSTMENT.max,
  );
}

/**
 * Best matching reference for the simulated device, or undefined.
 * Matching is deliberately conservative: a near miss in either energy or
 * panel area is not treated as the same device.
 */
function matchReference(
  device: EvidenceDevice,
  references: readonly ReferenceDevice[],
): ReferenceDevice | undefined {
  if (!positiveFinite(device.energyWh)) {
    return undefined;
  }

  let best: ReferenceDevice | undefined;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const reference of references) {
    const energyDelta =
      Math.abs(reference.energyWh - device.energyWh) / reference.energyWh;

    if (energyDelta > ENERGY_MATCH_TOLERANCE) {
      continue;
    }

    let areaDelta = 0;

    if (positiveFinite(device.displayAreaCm2) && reference.displayAreaCm2 > 0) {
      areaDelta =
        Math.abs(reference.displayAreaCm2 - device.displayAreaCm2) /
        reference.displayAreaCm2;

      if (areaDelta > AREA_MATCH_TOLERANCE) {
        continue;
      }
    }

    // Both traits count, so two devices with identical pack energy are
    // separated by panel size instead of by iteration order.
    const score = energyDelta + areaDelta;

    if (score < bestScore) {
      best = reference;
      bestScore = score;
    }
  }

  return best;
}

/**
 * Resolve screen-on power evidence for the simulated device.
 *
 * Returns undefined only when the seed dataset cannot support any
 * estimate at all. Every other unknown stays unknown and is reported.
 */
export function resolvePowerEvidence(
  device: EvidenceDevice,
  references: readonly ReferenceDevice[] = REFERENCE_DEVICES,
): ResolvedPowerEvidence | undefined {
  if (references.length === 0) {
    return undefined;
  }

  const matched = matchReference(device, references);

  const notes: string[] = [];
  const assumptions: string[] = [];

  // Band the watts from every reference, not just a convenient one, so an
  // unknown device is never given a single other device's number.
  const adjusted: { power: number; adjustment: number | undefined }[] = [];

  for (const reference of references) {
    const adjustment = referenceAdjustment(reference, device);

    adjusted.push({
      power:
        adjustment === undefined
          ? reference.screenOnPowerW
          : reference.screenOnPowerW * adjustment,
      adjustment,
    });
  }

  const powers = adjusted.map((entry) => entry.power).sort((a, b) => a - b);

  const min = powers[0];
  const max = powers[powers.length - 1];

  if (!positiveFinite(min) || !positiveFinite(max)) {
    return undefined;
  }

  const displayAdjustmentApplied = adjusted.some(
    (entry) => entry.adjustment !== undefined,
  );

  const names = references.map((reference) => reference.model).join(', ');

  notes.push(
    `${references.length} released devices have a measured ${references[0].provider} Wi-Fi web runtime and a published pack energy; those two records are divided to give average whole-device power during a continuous screen-on web test.`,
  );

  notes.push(
    `Reference devices: ${names}. The watts are theirs, not measurements of the simulated device.`,
  );

  for (const reference of references) {
    notes.push(
      `${reference.model}: ${reference.energyWh} Wh ${reference.energyBasis} energy / ${(reference.runtimeSeconds / 3600).toFixed(2)} h measured runtime (${reference.measurementIds.join(', ')}, ${reference.protocolId}).`,
    );
  }

  if (displayAdjustmentApplied) {
    notes.push(
      `Panel-area correction applied, clamped to ${DISPLAY_AREA_ADJUSTMENT.min}–${DISPLAY_AREA_ADJUSTMENT.max}x of the reference ratio: screen-on draw scales with lit panel area.`,
    );
  } else {
    notes.push(
      'Panel area is unknown for the simulated device or its reference, so no panel-area correction was applied and the unadjusted reference spread is used.',
    );
  }

  if (matched) {
    notes.push(
      `The simulated device matches ${matched.manufacturer} ${matched.model} on pack energy and panel size, so its own measured runtime anchors the estimate.`,
    );
  } else {
    notes.push(
      'No reference device matches this configuration on pack energy and panel size, so the whole calibration spread is used rather than a single borrowed figure.',
    );
  }

  assumptions.push(
    'Video playback, gaming and camera use are held at the measured screen-on web duty cycle. They are not separately measured in the seed dataset, so holding them equal is an estimate and is usually optimistic for gaming.',
  );

  assumptions.push(
    'This estimate is an upper bound. It is optimistic whenever real use draws more than the measured web test: brighter screens, higher refresh, cellular rather than Wi-Fi, video playback and especially gaming.',
  );

  assumptions.push(
    `Idle draw is modelled as ${IDLE_FRACTION_OF_SCREEN_ON} of the screen-on duty cycle (${POWER_EVIDENCE_VERSION}). No idle measurement exists in the seed dataset, so this constant is an assumption rather than evidence.`,
  );

  assumptions.push(
    'Published pack energy is treated as fully usable in Simple Mode, which is also optimistic for a real device.',
  );

  return {
    version: POWER_EVIDENCE_VERSION,
    basis: matched ? 'matched-reference' : 'reference-population',
    ...(matched ? { reference: matched } : {}),
    screenOnPowerW: { min, max },
    idlePowerW: {
      min: min * IDLE_FRACTION_OF_SCREEN_ON,
      max: max * IDLE_FRACTION_OF_SCREEN_ON,
    },
    displayAdjustmentApplied,
    referenceCount: references.length,
    notes,
    assumptions,
  };
}

// ---------------------------------------------------------
// Provenance for the workload mixture
// ---------------------------------------------------------

/** Workloads that draw the evidenced screen-on duty cycle in Simple Mode. */
export const SCREEN_ON_WORKLOADS = [
  'web_browsing',
  'video_playback',
  'gaming',
  'camera_use',
] as const;

/**
 * Provenance for one workload of the Simple Mode mixture.
 *
 * `calibrated` is used only where the watts come from the measured runtime
 * of a device that matches the simulated device, and even then the note
 * says plainly that the value was derived on the reference device.
 */
export function workloadProvenance(
  workload: string,
  evidence: ResolvedPowerEvidence,
): ModelProvenance {
  const reference = evidence.reference;

  const referenceName = reference
    ? `${reference.manufacturer} ${reference.model}`
    : `a spread of ${evidence.referenceCount} reference devices`;

  if (workload === 'standby') {
    return {
      kind: 'estimated',
      note: `Modelled as ${IDLE_FRACTION_OF_SCREEN_ON} of the screen-on duty cycle measured on ${referenceName}. Assumption, not a measurement.`,
    };
  }

  if (workload === 'web_browsing' && evidence.basis === 'matched-reference') {
    return {
      kind: 'calibrated',
      note: `Derived from the measured ${reference!.provider} runtime on ${referenceName} (${reference!.measurementIds.join(', ')}), divided by its published pack energy. Measured on that reference device, never on the simulated device.`,
    };
  }

  return {
    kind: 'estimated',
    note: `Held at the screen-on web duty cycle derived from measurements on ${referenceName}. No ${workload.replace(/_/g, ' ')} measurement exists in the calibration dataset.`,
  };
}
