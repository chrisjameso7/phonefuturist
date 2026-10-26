import type { DeviceCorpus } from './device-corpus';
import { deviceModelKey } from './device-variant';
import { resolveCorpusRuntimeBand, type RuntimeWorkload } from './corpus-runtime';
import type { SimulationInput } from '../types';
import { buildPhoneArenaRuntimeSpecBridge, type PhoneArenaSpecBridge } from './phonearena-runtime-spec-bridge';

/**
 * Diagnostic leave-one-device-out validation within PhoneArena's current
 * 200-nit protocol. This is distinct from the independent cross-publisher
 * holdout: one device's measurements are never used to predict that device,
 * but other devices tested by the same lab are allowed as references.
 */
export const PHONEARENA_SAME_PROTOCOL_BACKTEST_VERSION = 'phonearena-same-protocol-loo-0.2.0';
const SOURCE_ID = 'phonearena-battery-current-2026-10';
const WORKLOADS: RuntimeWorkload[] = ['web_browsing', 'video_playback', 'gaming'];

const positive = (n: unknown): n is number =>
  typeof n === 'number' && Number.isFinite(n) && n > 0;

export interface SameProtocolRuntimeRow {
  deviceVariantId: string;
  targetModelKey: string;
  referenceModelKeys: string[];
  workload: RuntimeWorkload;
  observedHours: number;
  predictedHours: number;
  absolutePercentageError: number;
  referenceCount: number;
  independentReferenceDeviceCount: number;
  referenceVariantIds: string[];
  energyBasis: 'mah' | 'wh';
  energyReferenceCount: number;
  targetHasVoltage: boolean;
  targetReleaseDate?: string;
  latestReferenceReleaseDate?: string;
  evidenceScope: 'same-soc-family' | 'same-soc-vendor' | 'protocol-cohort';
}

export interface SameProtocolRuntimeBacktest {
  version: string;
  protocol?: string;
  mode: 'sparse' | 'spec-enriched';
  validationScheme: 'leave-one-device-out' | 'past-devices-only';
  specBridgeStats?: PhoneArenaSpecBridge['stats'];
  totalMeasurements: number;
  evaluatedRows: number;
  skippedRows: number;
  mapePercent?: number;
  within20Percent?: number;
  rows: SameProtocolRuntimeRow[];
}

/** Never derive a cell voltage from capacity alone. A documented energy
 * rating, however, supplies its algebraically implied nominal voltage. */
function evidenceBackedVoltage(
  battery: DeviceCorpus['devices'][number]['variant']['battery'],
  capacityMah: number,
): number | undefined {
  if (positive(battery?.nominalVoltageV)) return battery.nominalVoltageV;
  const energyWh = battery?.typicalEnergyWh ?? battery?.ratedEnergyWh;
  const implied = positive(energyWh) ? energyWh * 1000 / capacityMah : undefined;
  return positive(implied) && implied >= 3.3 && implied <= 4.7
    ? implied : undefined;
}

export function backtestPhoneArenaSameProtocolRuntime(
  corpus: DeviceCorpus,
  mode: 'sparse' | 'spec-enriched' = 'sparse',
  validationScheme: 'leave-one-device-out' | 'past-devices-only' = 'leave-one-device-out',
): SameProtocolRuntimeBacktest {
  const source = corpus.sources.find(item => item.id === SOURCE_ID);
  const measurements = corpus.measurements.filter(m =>
    m.sourceId === SOURCE_ID &&
    WORKLOADS.includes(m.workload as RuntimeWorkload) &&
    m.unit.toLowerCase() === 'hours' && positive(m.value));
  const measuredDeviceIds = new Set(measurements.map(m => m.deviceVariantId));
  // Evaluation-only: attach cross-source specifications before matching peers.
  // Runtime labels and reference protocols remain solely PhoneArena's.
  const bridge = mode === 'spec-enriched'
    ? buildPhoneArenaRuntimeSpecBridge(corpus) : undefined;
  const referenceCorpus = bridge?.corpus ?? corpus;
  const deviceById = new Map(referenceCorpus.devices.map(d => [d.variant.id, d]));
  const rows: SameProtocolRuntimeRow[] = [];
  let skippedRows = 0;

  // Hold out the complete device, including all three workloads, rather
  // than just hiding the current target measurement.
  const trainingByDevice = new Map<string, DeviceCorpus>();
  for (const actual of measurements) {
    const device = deviceById.get(actual.deviceVariantId);
    const battery = device?.variant.battery;
    const capacityMah = battery?.capacityMah ?? battery?.typicalCapacityMah;
    const releaseDate = device?.releaseDate;
    // A historical prediction may use ONLY phones released before its
    // target. Unknown release dates are excluded rather than guessed.
    if (!device || !positive(capacityMah) || !source ||
        (validationScheme === 'past-devices-only' && !releaseDate)) {
      skippedRows++;
      continue;
    }

    let training = trainingByDevice.get(actual.deviceVariantId);
    if (!training) {
      const eligibleDevices = referenceCorpus.devices.filter(d =>
        measuredDeviceIds.has(d.variant.id) &&
        deviceModelKey(d.variant.identity) !== deviceModelKey(device.variant.identity) &&
        (validationScheme === 'leave-one-device-out' ||
          (d.releaseDate !== undefined && d.releaseDate < releaseDate!)));
      const eligibleIds = new Set(eligibleDevices.map(d => d.variant.id));
      training = {
        ...corpus,
        sources: [source],
        devices: eligibleDevices,
        measurements: measurements.filter(m => eligibleIds.has(m.deviceVariantId)),
      };
      trainingByDevice.set(actual.deviceVariantId, training);
    }

    const voltage = mode === 'spec-enriched'
      ? evidenceBackedVoltage(battery, capacityMah) : undefined;
    const input: SimulationInput = {
      formFactor: 'phone',
      displays: {
        primary: mode === 'spec-enriched' ? {
          diagonalInches: device.display?.diagonalInches,
          resolutionWidthPx: device.display?.resolutionWidthPx,
          resolutionHeightPx: device.display?.resolutionHeightPx,
          refreshRateHz: device.display?.refreshRateHz,
        } : {},
      },
      battery: { cells: [{ capacityMah, ...(voltage ? { nominalVoltageV: voltage } : {}) }] },
    };

    const estimate = resolveCorpusRuntimeBand(
      training, input, actual.workload as RuntimeWorkload,
      { protocol: source.protocol, ...(source.protocolVersion ? { protocolVersion: source.protocolVersion } : {}) },
      {
        manufacturer: device.variant.identity.manufacturer,
        ...(mode === 'spec-enriched' ? {
          socVendor: device.variant.soc?.vendor,
          socName: device.variant.soc?.name,
        } : {}),
      },
    );
    const band = estimate.estimate;
    if (estimate.status !== 'resolved' || !band || !positive(band.expectedMahPerHour)) {
      skippedRows++;
      continue;
    }
    // The same energy-basis selection as the production battery estimator.
    const whHours = band.energyBasis === 'wh' &&
      positive(band.targetEnergyWh) && positive(band.expectedWhPerHour)
        ? band.targetEnergyWh / band.expectedWhPerHour : undefined;
    const predictedHours = whHours ?? capacityMah / band.expectedMahPerHour;
    if (!positive(predictedHours)) {
      skippedRows++;
      continue;
    }
    const latestReferenceReleaseDate = band.neighborIds
      .map(id => deviceById.get(id)?.releaseDate)
      .filter((date): date is string => !!date)
      .sort()
      .at(-1);
    rows.push({
      deviceVariantId: actual.deviceVariantId,
      targetModelKey: deviceModelKey(device.variant.identity),
      referenceModelKeys: [...new Set(band.neighborIds.flatMap(id => {
        const reference = deviceById.get(id);
        return reference ? [deviceModelKey(reference.variant.identity)] : [];
      }))],
      workload: actual.workload as RuntimeWorkload,
      observedHours: actual.value,
      predictedHours,
      absolutePercentageError: 100 * Math.abs(predictedHours - actual.value) / actual.value,
      referenceCount: band.referenceCount,
      independentReferenceDeviceCount: band.independentReferenceDeviceCount,
      referenceVariantIds: band.neighborIds,
      energyBasis: whHours === undefined ? 'mah' : 'wh',
      energyReferenceCount: band.energyReferenceCount,
      targetHasVoltage: positive(voltage),
      targetReleaseDate: releaseDate,
      latestReferenceReleaseDate,
      evidenceScope: band.evidenceScope,
    });
  }

  return {
    version: PHONEARENA_SAME_PROTOCOL_BACKTEST_VERSION,
    protocol: source?.protocol,
    mode,
    validationScheme,
    ...(bridge ? { specBridgeStats: bridge.stats } : {}),
    totalMeasurements: measurements.length,
    evaluatedRows: rows.length,
    skippedRows,
    ...(rows.length ? {
      mapePercent: rows.reduce((sum, r) => sum + r.absolutePercentageError, 0) / rows.length,
      within20Percent: 100 * rows.filter(r => r.absolutePercentageError <= 20).length / rows.length,
    } : {}),
    rows,
  };
}
