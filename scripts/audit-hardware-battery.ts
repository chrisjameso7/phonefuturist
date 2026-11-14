import { writeFileSync } from 'node:fs';
import { buildCalibrationRegistry } from '../src/lib/simulation/modules/calibration-registry';
import { resolveCorpusRuntimeBand } from '../src/lib/simulation/modules/corpus-runtime';
import type { SimulationInput } from '../src/lib/simulation/types';
const corpus = buildCalibrationRegistry();
const canon = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
// Hold out every record of the target phone across publishers/variants; only retain
// the same publisher/protocol family for comparison. No measured runtime is fed as a predictor.
const source = corpus.sources.find(s => s.id === 'tomsguide-web-battery-current-2025-2026')!;
const targets = corpus.measurements.filter(m => m.sourceId === source.id && m.workload === 'web_browsing' && m.unit === 'hours');
const rows = targets.map(measurement => {
    const target = corpus.devices.find(d => d.variant.id === measurement.deviceVariantId)!;
    const identity = target.variant.identity;
    const matching = corpus.devices.filter(d => canon(d.variant.identity.manufacturer) === canon(identity.manufacturer) && canon(d.variant.identity.modelName) === canon(identity.modelName));
    const heldOut = new Set(matching.map(d => d.variant.id));
    const detailed = matching.find(d => d.variant.battery?.ratedEnergyWh || d.variant.battery?.typicalEnergyWh) ?? matching.find(d => d.variant.battery?.capacityMah) ?? target;
    const battery = detailed.variant.battery, mah = battery?.capacityMah ?? battery?.typicalCapacityMah ?? battery?.ratedCapacityMah;
    const wh = battery?.ratedEnergyWh ?? battery?.typicalEnergyWh;
    const voltage = battery?.nominalVoltageV ?? (wh && mah ? wh * 1000 / mah : undefined);
    const simulation: SimulationInput = { formFactor: 'phone', displays: { primary: { diagonalInches: detailed.display?.diagonalInches ?? target.display?.diagonalInches } }, battery: { cells: [{ capacityMah: mah, nominalVoltageV: voltage }] } };
    const reference = { ...corpus, devices: corpus.devices.filter(d => !heldOut.has(d.variant.id)), measurements: corpus.measurements.filter(m => !heldOut.has(m.deviceVariantId)) };
    const band = resolveCorpusRuntimeBand(reference, simulation, 'web_browsing', { protocol: source.protocol, protocolVersion: source.protocolVersion }, { socName: detailed.variant.soc?.name, socVendor: detailed.variant.soc?.vendor });
    const estimate = band.estimate;
    if (estimate?.neighborIds.some(id => heldOut.has(id)))
        throw new Error('Validation leakage.');
    const energy = mah && voltage ? mah * voltage / 1000 : undefined;
    const hours = estimate ? (estimate.energyBasis === 'wh' && energy && estimate.expectedWhPerHour ? energy / estimate.expectedWhPerHour : mah ? mah / estimate.expectedMahPerHour : undefined) : undefined;
    return { device: identity.manufacturer + ' ' + identity.modelName, observedHours: measurement.value, predictedHours: hours ?? null, absoluteErrorPercent: hours ? Math.abs(hours - measurement.value) / measurement.value * 100 : null, status: band.status, heldOutRecords: heldOut.size, referenceCount: estimate?.independentReferenceDeviceCount ?? 0 };
});
const resolved = rows.filter(r => r.absoluteErrorPercent !== null);
const report = { protocol: source.protocol, source: source.url, method: 'Leave-one-device-out; all target variants/publishers removed. No coefficient fitting. Neutral software adjustment. Same Tom’s Guide current protocol only.', rows, meanAbsolutePercentageError: resolved.length ? resolved.reduce((s, r) => s + r.absoluteErrorPercent!, 0) / resolved.length : null, coverage: resolved.length + '/' + rows.length, warning: 'Small retrospective cohort. Not prospective validation, not a software-optimization benchmark, and not validation of the optional benchmark-power scenario.' };
writeFileSync('docs/hardware-battery-validation-2026-11-01.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
