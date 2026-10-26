import type { DeviceCorpus, DeviceCorpusRecord } from './device-corpus';
import { simulateBatteryExperience, type BatteryExperienceInput, type BatteryExperienceResult } from './battery-experience-engine';
import { PEAK_METRIC_BY_DOMAIN, type PeakPerformanceEstimate } from './peak-performance-estimator';

export function percentageDifference(current?: number, reference?: number): number | undefined {
  if (current === undefined || reference === undefined || !Number.isFinite(current) || !Number.isFinite(reference) || current <= 0 || reference <= 0) return undefined;
  const delta = (current / reference - 1) * 100;
  return Number.isFinite(delta) ? delta : undefined;
}
export function comparisonPhoneLabel(device: DeviceCorpusRecord): string {
  const {manufacturer, modelName, region} = device.variant.identity;
  const name = modelName.toLowerCase().startsWith(manufacturer.toLowerCase() + ' ') ? modelName : manufacturer + ' ' + modelName;
  return name + (region ? ' · ' + region : '');
}
export function selectableComparisonPhones(corpus: DeviceCorpus, today = new Date().toISOString().slice(0,10)) {
  const seen = new Set<string>();
  const measured = new Map<string,number>();
  for(const row of corpus.measurements) if(['benchmark','web_browsing','video_playback','gaming'].includes(row.workload) && row.evidenceKind === 'measured' && Number.isFinite(row.value) && row.value > 0) measured.set(row.deviceVariantId,(measured.get(row.deviceVariantId) ?? 0)+1);
  const completeness = (d: DeviceCorpusRecord) => Number(!!(d.variant.battery?.capacityMah ?? d.variant.battery?.typicalCapacityMah)) * 4 + Number(!!d.variant.soc?.name) * 2 + Number(!!d.display?.diagonalInches);
  return corpus.devices.filter(d => measured.has(d.variant.id) && d.variant.identity.modelName && d.catalogTrust !== 'source-backed-unverified' &&
    (!d.releaseDate || /^\d{4}-\d{2}-\d{2}$/.test(d.releaseDate) && d.releaseDate <= today))
    .sort((a,b) => comparisonPhoneLabel(a).localeCompare(comparisonPhoneLabel(b)) || completeness(b) - completeness(a) || (measured.get(b.variant.id) ?? 0) - (measured.get(a.variant.id) ?? 0) || a.variant.id.localeCompare(b.variant.id))
    .filter(d => { const key = comparisonPhoneLabel(d).toLowerCase(); if(seen.has(key)) return false; seen.add(key); return true; });
}
/** Keep exact variant and benchmark version; never infer a speed gain from a chip name. */
export function selectedBenchmarkReference(corpus: DeviceCorpus, deviceId: string, estimate: PeakPerformanceEstimate): number | undefined {
  if (!estimate.protocolKey || estimate.status !== 'resolved') return undefined;
  const sourceById = new Map(corpus.sources.map(s => [s.id,s]));
  const values = corpus.measurements.filter(m => m.deviceVariantId === deviceId && m.workload === 'benchmark' &&
    m.metric === PEAK_METRIC_BY_DOMAIN[estimate.domain] && m.evidenceKind === 'measured' && Number.isFinite(m.value) && m.value > 0 &&
    [m.metric,sourceById.get(m.sourceId)?.protocolVersion ?? 'canonical-metric-version',m.unit.trim().toLowerCase()].join('::').toLowerCase() === estimate.protocolKey)
    .map(m => m.value);
  return values.length ? values.reduce((sum,value) => sum + value / values.length,0) : undefined;
}
/** Both sides must cover the requested workloads under the same lab protocol and energy basis. */
export function comparableBatteryHours(target: BatteryExperienceResult, reference: BatteryExperienceResult, input: BatteryExperienceInput): number | undefined {
  const requested = Object.entries(input.dailyUseHours ?? {}).filter(([,hours]) => hours !== undefined && hours > 0);
  if (!requested.length || !target.mixedUse || !reference.mixedUse) return undefined;
  for (const [workload] of requested) {
    const a = target.runtimes.find(r => r.workload === workload);
    const b = reference.runtimes.find(r => r.workload === workload);
    if (!a?.protocol || !b?.protocol || a.protocol !== b.protocol || a.protocolVersion !== b.protocolVersion || a.energyBasis !== b.energyBasis || a.status !== 'resolved' || b.status !== 'resolved') return undefined;
  }
  return reference.mixedUse.expectedActiveUseHoursPerCharge;
}
export function estimateSelectedPhoneBattery(corpus: DeviceCorpus, device: DeviceCorpusRecord, conditions: BatteryExperienceInput) {
  const battery = device.variant.battery;
  const capacity = battery?.capacityMah ?? battery?.typicalCapacityMah;
  // A documented energy rating may supply voltage; never manufacture one from capacity alone.
  const energy = battery?.typicalEnergyWh ?? battery?.ratedEnergyWh;
  const voltage = battery?.nominalVoltageV ?? (energy && capacity ? energy * 1000 / capacity : undefined);
  return simulateBatteryExperience(corpus, {
    ...conditions,
    manufacturer: device.variant.identity.manufacturer,
    socName: device.variant.soc?.name,
    socVendor: device.variant.soc?.vendor,
    batteryChemistry: battery?.chemistry,
    coolingClass: device.cooling?.class,
    socPowerWhatIf: undefined,
    targetSocPowerW: undefined,
    simulation: { formFactor: 'phone', displays: {primary: {...device.display}},
      battery: {cells: [{capacityMah: capacity, nominalVoltageV: voltage}]} },
  });
}
