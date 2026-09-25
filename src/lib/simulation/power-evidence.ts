/**
 * Device/workload power evidence for Interactive Leaks Simple Mode.
 *
 * Architecture:
 *   user usage profile
 *     -> PhoneFuturist reference/calibration power evidence
 *       -> device matching against reference devices
 *         -> workload power, with an explicit evidence status per workload
 *           -> daily energy budget (evidenced workloads only)
 *             -> endurance verdict
 *
 * EVIDENCE RULES (see docs/INTERACTIVE_LEAKS_CALIBRATION.md)
 *
 * - Observations are never rewritten and never relabelled. The seed
 *   dataset holds released-device runtimes, not watts, so watts are only
 *   produced by an explicit, recorded derivation.
 * - A value is never labelled 'measured' unless a laboratory measured it.
 *   Everything this module produces is calibrated (a division of two
 *   traceable records) or estimated.
 * - A workload with no evidence is reported as having no evidence. It is
 *   never silently filled in from a different workload, and it is never
 *   assigned a plausible-looking multiplier.
 *
 * WHAT THE SEED DATASET ACTUALLY CONTAINS
 *
 * Exactly one measured duty cycle: continuous Wi-Fi web browsing at
 * approximately 150 cd/m2, Notebookcheck protocol v1.3, with the page mix
 * changing every 30 seconds. Five devices carry that calibration record;
 * three of them additionally carry a held-out Tom's Guide cellular web
 * record used only for validation.
 *
 * There is NO evidence in this repository for video playback, gaming,
 * camera use or idle/standby draw. protocols.json declares a DXOMARK
 * multi-use-case protocol, but zero measurements reference it.
 *
 * That absence is the single most important fact about this model, and
 * it is why endurance is reported as a coverage verdict against the one
 * evidenced screen-on budget rather than as a confident days-per-charge
 * figure.
 */

import calibrationDevices from '../../../data/calibration/battery/devices.json';
import calibrationMeasurements from '../../../data/calibration/battery/measurements.json';
import calibrationProtocols from '../../../data/calibration/battery/protocols.json';

import type { ModelProvenance } from './modules/modeling';
import type { BatteryExperienceWorkload } from './modules/battery-experience';
import type { SimulationInput } from './types';

/**
 * Version of the derived evidence model.
 *
 * 2.0 breaks the 1.0 contract in two ways that change published numbers,
 * so a result must never be read as if it came from the other:
 *   - the panel-area correction is gone (it was anti-correlated with the
 *     calibration set, see DEVICE_ADJUSTMENT below);
 *   - workloads without evidence are no longer held at the web duty
 *     cycle, so Simple Mode no longer publishes a days-per-charge point
 *     estimate.
 */
export const POWER_EVIDENCE_VERSION = 'battery-calibration-2.0';

/** Dataset schema the derivation is written against. */
export const CALIBRATION_DATASET_VERSION = '0.1.0';

/**
 * DEVICE ADJUSTMENT: none.
 *
 * v1.0 scaled reference power by the ratio of panel areas, clamped to
 * 0.75-1.35x. That correction is not supported by the calibration set and
 * points the wrong way. Across the five calibration devices, Pearson
 * r(panel area, measured web power) = -0.974: the larger the panel, the
 * LOWER the measured draw, because the large devices in this set carry
 * the more efficient platforms. A positive area correction therefore
 * inflates power for exactly the devices that measured lowest.
 *
 * The correction is removed rather than re-signed: with five devices all
 * from 2024-2025 and one calibration protocol, there is no defensible
 * basis for ANY device-level power adjustment. Pack size is already
 * handled correctly, by dividing by the simulated device's own energy.
 */
export const DEVICE_ADJUSTMENT = 'none' as const;

/**
 * The one benchmark that produced every power anchor in this model.
 *
 * These are the conditions of the Notebookcheck Wi-Fi web protocol as
 * recorded in protocols.json. They are the correct qualifications for
 * every watt figure this module produces.
 */
export const WEB_ANCHOR_CONDITIONS = {
  name: 'Wi-Fi Web Browsing Test',
  workload: 'Continuous automated web browsing, page mix changes every 30 seconds',
  provider: 'Notebookcheck',
  protocolId: 'notebookcheck_wifi_web_v1_3',
  protocolVersion: '1.3',
  connectivity: 'wifi',
  cellularGeneration: 'unknown',
  signalConditions: 'unknown',
  brightnessNits: 150,
  brightnessQualifier: 'approximate',
  refreshMode: 'unknown',
  resolution: 'unknown',
  hdr: 'unknown',
  audio: 'unknown',
  ambientTemperatureC: 'unknown',
  /** Recorded by the provider, and materially relevant to the result. */
  powerSavingMeasures: 'activated for this test',
} as const;

/**
 * Measured optimism of the web anchor, from held-out validation.
 *
 * Three devices carry both a Notebookcheck calibration record and a
 * Tom's Guide cellular web record that is never used to build the model.
 * Predicting those held-out runtimes from the calibrated power is
 * equivalent to predicting the Notebookcheck runtime, because that is
 * what the power was derived from. The held-out cellular runtimes came
 * out 14.2%, 18.1% and 18.0% shorter (mean +16.7% optimistic, n=3).
 *
 * This is a recorded limitation of the anchor, NOT a correction factor.
 * Applying a fitted constant here would consume the validation set as
 * calibration data, which the calibration policy forbids.
 */
export const WEB_ANCHOR_HELDOUT_OPTIMISM = {
  measuredDevices: 3,
  meanSignedPercentError: 16.7,
  range: { min: 14.2, max: 18.1 },
  direction: 'optimistic in every case',
  reason:
    'The anchor is a Wi-Fi test; the held-out records are cellular. A radio working a cellular link draws more than one on Wi-Fi.',
} as const;

// ---------------------------------------------------------
// Seed dataset shapes
// ---------------------------------------------------------

interface CalibrationDevice {
  id: string;
  manufacturer: string;
  model: string;
  release_year?: number | null;
  platform?: { soc?: string | null };
  battery: {
    rated_capacity_mah?: number | null;
    rated_energy_wh?: number | null;
    typical_energy_wh?: number | null;
  };
  display: {
    diagonal_inches?: number | null;
    width_pixels?: number | null;
    height_pixels?: number | null;
    technology?: string | null;
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
  provenance?: { kind?: string; provider?: string };
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
 * A released device whose published pack energy and measured runtime give
 * one derived quantity: average whole-device power during the continuous
 * screen-on web test described by WEB_ANCHOR_CONDITIONS.
 */
export interface ReferenceDevice {
  id: string;
  manufacturer: string;
  model: string;
  releaseYear?: number;

  /** Published pack energy used as the energy basis. */
  energyWh: number;

  /** Which published energy figure was used. Never interchanged. */
  energyBasis: 'rated' | 'typical';

  /** Pack energy is published, not measured. */
  energyProvenance: string;

  runtimeSeconds: number;

  /** P_web = energyWh / (runtimeSeconds / 3600). Calibrated, not measured. */
  screenOnPowerW: number;

  displayAreaCm2?: number;

  soc?: string;

  measurementIds: string[];

  protocolId: string;

  provider: string;

  datasetRole: 'calibration' | 'validation';
}

function positiveFinite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

/** Panel area in cm2, or undefined when either input is unknown. */
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
  const measurements = (
    calibrationMeasurements as unknown as { measurements?: CalibrationMeasurement[] }
  ).measurements;
  const protocols = (
    calibrationProtocols as unknown as { protocols?: CalibrationProtocol[] }
  ).protocols;

  if (!Array.isArray(devices) || !Array.isArray(measurements)) {
    return [];
  }

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

    const device = byId.get(measurement.device_id);
    if (!device) continue;

    // The power anchor is fitted on the calibration role only. Validation
    // records are held out so they can evaluate the model, never build it.
    if (measurement.dataset_role !== 'calibration') continue;

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

    references.push({
      id: device.id,
      manufacturer: device.manufacturer,
      model: device.model,
      ...(positiveFinite(device.release_year) ? { releaseYear: device.release_year } : {}),
      energyWh,
      energyBasis,
      energyProvenance:
        energyBasis === 'rated'
          ? 'manufacturer or authorised-part rated pack energy'
          : 'manufacturer typical pack energy',
      runtimeSeconds,
      screenOnPowerW: energyWh / (runtimeSeconds / 3600),
      ...(area !== undefined ? { displayAreaCm2: area } : {}),
      ...(device.platform?.soc ? { soc: device.platform.soc } : {}),
      measurementIds: [measurement.id],
      protocolId: measurement.protocol_id,
      provider:
        measurement.provenance?.provider ??
        protocolById.get(measurement.protocol_id)?.provider ??
        'Unknown',
      datasetRole: 'calibration',
    });
  }

  references.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  return references;
}

/** Every reference device whose measured runtime can anchor a power. */
export const REFERENCE_DEVICES: readonly ReferenceDevice[] =
  buildReferenceDevices();

// ---------------------------------------------------------
// Device context
// ---------------------------------------------------------

export interface EvidenceDevice {
  energyWh?: number;
  displayAreaCm2?: number;
}

/** Energy and panel area of the simulated device, or unknown. */
export function evidenceDeviceFrom(input: SimulationInput): EvidenceDevice {
  const cell = input.battery?.cells?.[0];

  const energyWh =
    cell &&
    positiveFinite(cell.capacityMah) &&
    positiveFinite(cell.nominalVoltageV)
      ? (cell.capacityMah * cell.nominalVoltageV) / 1000
      : undefined;

  const primary = input.displays?.primary;

  const area = displayAreaCm2(
    primary?.diagonalInches,
    primary?.resolutionWidthPx,
    primary?.resolutionHeightPx,
  );

  return {
    ...(energyWh !== undefined ? { energyWh } : {}),
    ...(area !== undefined ? { displayAreaCm2: area } : {}),
  };
}

// ---------------------------------------------------------
// Evidence resolution
// ---------------------------------------------------------

/** How the screen-on power for the simulated device was established. */
export type EvidenceBasis =
  /** A reference device matches the simulated device; its own record is used. */
  | 'matched-reference'
  /** No reference matches; the spread of the calibration set is used. */
  | 'reference-population';

export interface ResolvedPowerEvidence {
  version: string;

  basis: EvidenceBasis;

  reference?: ReferenceDevice;

  /**
   * Average whole-device power during the evidenced screen-on web test,
   * for the simulated device. A band, because these are other people's
   * devices and, when nothing matches, other people's phones entirely.
   */
  webPowerW: { min: number; max: number };

  /**
   * Hours of that same continuous web test the simulated pack supports.
   * This is the only endurance quantity the evidence supports directly.
   */
  screenOnBudgetHours: { min: number; max: number };

  referenceCount: number;

  notes: string[];

  assumptions: string[];
}

/** Relative pack-energy difference that still counts as the same device. */
const ENERGY_MATCH_TOLERANCE = 0.15;

/** Relative panel-area difference that still counts as the same device. */
const AREA_MATCH_TOLERANCE = 0.12;

/**
 * Identify which reference device a configuration is.
 *
 * Identification and adjustment are different questions and are kept
 * strictly apart here. Pack energy and panel area are legitimate ways to
 * recognise WHICH phone this is, so both are used. Neither is used to
 * rescale power, because neither was shown to predict power in this
 * dataset.
 *
 * Area matters for identity because several references share a pack
 * energy: the Galaxy S24 Ultra and S25 Ultra are both 18.84 Wh, and
 * without area they would be separated only by iteration order, which
 * would attribute one device's record to the other.
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

    if (
      positiveFinite(device.displayAreaCm2) &&
      positiveFinite(reference.displayAreaCm2)
    ) {
      areaDelta =
        Math.abs(reference.displayAreaCm2 - device.displayAreaCm2) /
        reference.displayAreaCm2;

      if (areaDelta > AREA_MATCH_TOLERANCE) {
        continue;
      }
    }

    const score = energyDelta + areaDelta;

    if (score < bestScore) {
      best = reference;
      bestScore = score;
    }
  }

  return best;
}

/**
 * Resolve screen-on web power evidence for the simulated device.
 *
 * Returns undefined only when the dataset cannot support any estimate.
 */
export function resolvePowerEvidence(
  device: EvidenceDevice,
  references: readonly ReferenceDevice[] = REFERENCE_DEVICES,
): ResolvedPowerEvidence | undefined {
  if (references.length === 0) {
    return undefined;
  }

  if (!positiveFinite(device.energyWh)) {
    // Without the simulated device's own pack energy nothing can be
    // divided, so there is nothing to estimate.
    return undefined;
  }

  const matched = matchReference(device, references);

  // DEVICE_ADJUSTMENT is 'none': no reference power is ever rescaled.
  //
  // When the simulated device IS a reference device, its own measured
  // record is the strongest evidence available and is used directly,
  // which is strictly better than a band across five other phones. Only
  // an unidentified configuration falls back to the population spread.
  const population = references
    .map((reference) => reference.screenOnPowerW)
    .sort((a, b) => a - b);

  const own = matched ? matched.screenOnPowerW : undefined;

  const min = positiveFinite(own) ? own : population[0];
  const max = positiveFinite(own) ? own : population[population.length - 1];

  if (!positiveFinite(min) || !positiveFinite(max)) {
    return undefined;
  }

  const notes: string[] = [];
  const assumptions: string[] = [];

  notes.push(
    `Every watt figure here comes from one benchmark: ${WEB_ANCHOR_CONDITIONS.provider} ${WEB_ANCHOR_CONDITIONS.name ?? 'Wi-Fi Web Browsing Test'} (protocol ${WEB_ANCHOR_CONDITIONS.protocolVersion}), ${WEB_ANCHOR_CONDITIONS.workload.toLowerCase()}, on ${WEB_ANCHOR_CONDITIONS.connectivity} at approximately ${WEB_ANCHOR_CONDITIONS.brightnessNits} cd/m².`,
  );

  notes.push(
    `Unknown for that benchmark and therefore not modelled: cellular generation, signal conditions, refresh mode, resolution, HDR, audio and ambient temperature. Power-saving measures were ${WEB_ANCHOR_CONDITIONS.powerSavingMeasures}.`,
  );

  notes.push(
    'Watts are a division of two published/measured records (pack energy ÷ measured runtime), not a measurement of current draw.',
  );

  for (const reference of references) {
    notes.push(
      `${reference.manufacturer} ${reference.model}: ${reference.energyWh} Wh ${reference.energyBasis} energy (${reference.energyProvenance}) ÷ ${(reference.runtimeSeconds / 3600).toFixed(2)} h measured runtime → ${reference.screenOnPowerW.toFixed(3)} W. Source: ${reference.measurementIds.join(', ')} (${reference.protocolId}).`,
    );
  }

  notes.push(
    `No device adjustment is applied (${DEVICE_ADJUSTMENT}). Panel size, platform and generation showed no defensible power relationship in a five-device, single-protocol calibration set, and pack size is already handled by dividing by this device's own energy.`,
  );

  if (matched) {
    notes.push(
      `This configuration is identified as ${matched.manufacturer} ${matched.model} on pack energy and panel size, so its own measured record (${matched.measurementIds.join(', ')}) is used directly rather than a spread across other phones.`,
    );
  } else {
    notes.push(
      'No reference device matches this pack energy, so the whole calibration spread is used rather than one borrowed device.',
    );
  }

  notes.push(
    `The anchor runs ${WEB_ANCHOR_HELDOUT_OPTIMISM.reason} On ${WEB_ANCHOR_HELDOUT_OPTIMISM.measuredDevices} devices with held-out cellular web records, the calibrated power over-predicted runtime by ${WEB_ANCHOR_HELDOUT_OPTIMISM.range.min}–${WEB_ANCHOR_HELDOUT_OPTIMISM.range.max}% (mean ${WEB_ANCHOR_HELDOUT_OPTIMISM.meanSignedPercentError}%). Treat screen-on hours as an upper bound.`,
  );

  assumptions.push(
    'There is no calibration evidence in this repository for video playback, gaming, camera use or idle draw. Those workloads are reported as unevidenced and are excluded from the daily budget rather than filled in with a guess.',
  );

  assumptions.push(
    'The simulated pack is treated as fully usable. No derating is applied because no usable-energy measurement exists in the dataset, which is also optimistic.',
  );

  return {
    version: POWER_EVIDENCE_VERSION,
    basis: matched ? 'matched-reference' : 'reference-population',
    ...(matched ? { reference: matched } : {}),
    webPowerW: { min, max },
    screenOnBudgetHours: {
      min: device.energyWh / max,
      max: device.energyWh / min,
    },
    referenceCount: references.length,
    notes,
    assumptions,
  };
}

// ---------------------------------------------------------
// Per-workload evidence status
// ---------------------------------------------------------

/**
 * How well supported a workload's whole-device power is.
 *
 * 'calibrated'  derived from this device's own measured record
 * 'reference'   carried from a matching reference device's record
 * 'insufficient' no evidence exists; no value is produced
 */
export type WorkloadEvidenceStatus =
  | 'calibrated'
  | 'reference'
  | 'insufficient';

export interface WorkloadPower {
  workload: BatteryExperienceWorkload;
  status: WorkloadEvidenceStatus;

  /** Known power range, present only when evidence supports one. */
  powerW?: { min: number; max: number };

  provenance?: ModelProvenance;

  /** Why this status, in one sentence. */
  note: string;
}

/** Workloads the Simple Mode usage profile can contain. */
export const SIMPLE_WORKLOADS: readonly BatteryExperienceWorkload[] = [
  'web_browsing',
  'video_playback',
  'gaming',
  'camera_use',
  'standby',
] as const;

/**
 * Per-workload evidence for the Simple Mode mixture.
 *
 * Only web browsing has a measured duty cycle behind it. The others are
 * returned with status 'insufficient' and no power value at all, so no
 * downstream code can accidentally treat them as evidence.
 */
export function workloadEvidence(
  evidence: ResolvedPowerEvidence,
): Record<BatteryExperienceWorkload, WorkloadPower> {
  const reference = evidence.reference;
  const referenceName = reference
    ? `${reference.manufacturer} ${reference.model}`
    : `a spread of ${evidence.referenceCount} reference devices`;

  const web: WorkloadPower = {
    workload: 'web_browsing',
    status: evidence.basis === 'matched-reference' ? 'calibrated' : 'reference',
    powerW: evidence.webPowerW,
    provenance: {
      kind: evidence.basis === 'matched-reference' ? 'calibrated' : 'reference',
      note:
        evidence.basis === 'matched-reference'
          ? `Derived from the ${reference!.provider} continuous web test on ${referenceName} (${reference!.measurementIds.join(', ')}): ${reference!.energyWh} Wh ÷ ${(reference!.runtimeSeconds / 3600).toFixed(2)} h. Calibrated from a measurement taken on that reference device, never measured on the simulated device.`
          : `Carried across from the spread of ${evidence.referenceCount} released reference devices; this configuration matches none of them.`,
    },
    note: `Continuous web browsing, ${WEB_ANCHOR_CONDITIONS.connectivity}, ~${WEB_ANCHOR_CONDITIONS.brightnessNits} cd/m², page change every 30 s.`,
  };

  const unevidenced = (
    workload: BatteryExperienceWorkload,
    what: string,
  ): WorkloadPower => ({
    workload,
    status: 'insufficient',
    note: `No ${what} measurement exists in the calibration dataset (8 runtime records, all continuous web browsing).`,
  });

  return {
    mixed_use: {
      workload: 'mixed_use',
      status: 'insufficient',
      note: 'Mixed use is a composition of the workloads above, not an independently measured duty cycle.',
    },
    web_browsing: web,
    video_playback: unevidenced('video_playback', 'video playback'),
    gaming: unevidenced('gaming', 'gaming'),
    camera_use: unevidenced('camera_use', 'camera use'),
    standby: unevidenced('standby', 'idle or standby'),
  };
}

// ---------------------------------------------------------
// Daily energy budget and endurance
// ---------------------------------------------------------

export type EnduranceVerdict =
  /** Active time fits inside the evidenced screen-on budget. */
  | 'covered'
  /** Active time exceeds the evidenced screen-on budget. */
  | 'exceeds-screen-on-budget';

export type EvidenceConfidence = 'high' | 'moderate' | 'low';

export interface EvidenceConfidenceReport {
  level: EvidenceConfidence;
  /** Share of the day's active hours that have power evidence. */
  evidencedShare: number;
  reasons: string[];
}

/**
 * Grade a Simple Mode estimate on evidence quality, not input precision.
 *
 * The battery model grades how well-formed its numbers are. That is not
 * the same question as how much real evidence sits behind them: an
 * endurance verdict built mostly on unevidenced workloads must not be
 * presented as a confident number just because its arithmetic is clean.
 */
export function simpleEvidenceConfidence(
  evidence: ResolvedPowerEvidence,
  endurance: SimpleEndurance,
): EvidenceConfidenceReport {
  const activeLines = endurance.dailyBudget.filter((line) => line.hours > 0);
  const activeHours = activeLines.reduce((sum, line) => sum + line.hours, 0);
  const evidencedHours = activeLines
    .filter((line) => line.energyWh !== undefined)
    .reduce((sum, line) => sum + line.hours, 0);

  const evidencedShare =
    activeHours > 0 ? evidencedHours / activeHours : 0;

  const unevidenced = activeLines.filter((line) => line.energyWh === undefined);

  const reasons: string[] = [];

  if (evidence.basis === 'matched-reference') {
    reasons.push(
      `Pack energy matches ${evidence.reference!.manufacturer} ${evidence.reference!.model}, so the screen-on power anchor comes from that device's own measured record.`,
    );
  } else {
    reasons.push(
      `No reference device matches this pack energy; the screen-on power is carried across from a spread of ${evidence.referenceCount} other phones.`,
    );
  }

  if (unevidenced.length === 0) {
    reasons.push(
      'Every active workload in this profile has a calibrated power value.',
    );
  } else {
    reasons.push(
      `${unevidenced.length} active workload(s) in this profile have no calibration evidence: ${unevidenced.map((line) => line.workload.replace(/_/g, ' ')).join(', ')}. Their real draw is unmeasured and is at or above the web figure, so the endurance verdict is optimistic.`,
    );
  }

  reasons.push(
    'Idle draw has no calibration evidence and is excluded from the budget rather than assumed.',
  );

  let level: EvidenceConfidence;
  if (unevidenced.length === 0 && evidence.basis === 'matched-reference') {
    level = 'high';
  } else if (unevidenced.length === 0) {
    level = 'moderate';
  } else if (evidencedShare >= 0.5) {
    level = 'moderate';
  } else {
    level = 'low';
  }

  return { level, evidencedShare, reasons };
}

export interface DailyBudgetLine {
  workload: BatteryExperienceWorkload;
  hours: number;
  status: WorkloadEvidenceStatus;
  /** Energy this line could account for, or undefined when unevidenced. */
  energyWh?: { min: number; max: number };
}

export interface SimpleEndurance {
  verdict: EnduranceVerdict;

  /** Pack energy the endurance figures are relative to. */
  usableEnergyWh: number;

  /** Total non-idle hours the user's day contains. */
  activeHours: number;

  /** Hours of the day with no active use. */
  idleHours: number;

  /** Share of the day spent on each workload. */
  dailyBudget: DailyBudgetLine[];

  /**
   * Energy the day could account for from evidenced workloads only.
   * Excludes every unevidenced workload, so it is a partial sum and a
   * lower bound on the real daily energy, not a complete budget.
   */
  accountedEnergyWh?: { min: number; max: number };

  /** Hours of the evidenced continuous web test this pack supports. */
  screenOnBudgetHours: { min: number; max: number };

  /**
   * Active hours as a share of the evidenced screen-on budget midpoint.
   * Below 1 means the day's active time fits inside the evidenced budget.
   */
  budgetUseRatio: number;

  /** Unaccounted active hours, because their workload has no evidence. */
  unevidencedHours: number;
}

export interface EnduranceInput {
  evidence: ResolvedPowerEvidence;
  /** Minutes per day for each active workload, as the user entered them. */
  minutesPerDay: Record<string, string | number>;
  usableEnergyWh: number;
}

/**
 * Resolve endurance for a Simple Mode day.
 *
 * This is a daily energy budget, but only over the workloads the dataset
 * can actually account for. The result is a verdict against the one
 * evidenced screen-on budget plus the accounting that produced it, so a
 * reader can see exactly which part of their day was modelled and which
 * part has no evidence behind it at all.
 */
export function resolveEndurance(input: EnduranceInput): SimpleEndurance {
  const { evidence, minutesPerDay, usableEnergyWh } = input;

  const perWorkload = workloadEvidence(evidence);

  const dailyBudget: DailyBudgetLine[] = [];
  let activeHours = 0;
  let accountedMin = 0;
  let accountedMax = 0;
  let anyAccounted = false;

  for (const workload of SIMPLE_WORKLOADS) {
    if (workload === 'standby') {
      continue;
    }

    const minutes = Number(minutesPerDay[workload] ?? 0);
    const hours = (Number.isFinite(minutes) && minutes > 0 ? minutes : 0) / 60;
    activeHours += hours;

    const status = perWorkload[workload];

    if (hours <= 0 || !status.powerW) {
      dailyBudget.push({
        workload,
        hours,
        status: status.status,
      });
      continue;
    }

    dailyBudget.push({
      workload,
      hours,
      status: status.status,
      energyWh: {
        min: hours * status.powerW.min,
        max: hours * status.powerW.max,
      },
    });

    accountedMin += hours * status.powerW.min;
    accountedMax += hours * status.powerW.max;
    anyAccounted = true;
  }

  const idleHours = Math.max(0, 24 - activeHours);

  const budgetMid =
    (evidence.screenOnBudgetHours.min + evidence.screenOnBudgetHours.max) / 2;

  const unevidencedHours = dailyBudget
    .filter((line) => line.hours > 0 && line.energyWh === undefined)
    .reduce((sum, line) => sum + line.hours, 0);

  return {
    verdict: activeHours <= budgetMid ? 'covered' : 'exceeds-screen-on-budget',
    usableEnergyWh,
    activeHours,
    idleHours,
    dailyBudget,
    ...(anyAccounted
      ? {
          accountedEnergyWh: {
            // Idle and unevidenced workloads are unknown, not zero. The
            // upper bound can only be asserted while they are excluded.
            min: accountedMin,
            max: accountedMax,
          },
        }
      : {}),
    screenOnBudgetHours: evidence.screenOnBudgetHours,
    budgetUseRatio: budgetMid > 0 ? activeHours / budgetMid : 0,
    unevidencedHours,
  };
}

/**
 * Upper bound on days per charge, and why it is only an upper bound.
 *
 * days = usable energy / daily energy, so an upper bound needs a LOWER
 * bound on daily energy. The lower bound available here counts only the
 * evidenced web workload at its lowest calibrated power and treats every
 * other hour, including all idle time, as consuming nothing. That is a
 * bound, not an estimate, and it is optimistic by an unknown margin.
 */
export function enduranceUpperBoundDays(
  endurance: SimpleEndurance,
): number | undefined {
  if (!endurance.accountedEnergyWh) {
    return undefined;
  }

  if (!(endurance.accountedEnergyWh.min > 0)) {
    return undefined;
  }

  return endurance.usableEnergyWh / endurance.accountedEnergyWh.min;
}
