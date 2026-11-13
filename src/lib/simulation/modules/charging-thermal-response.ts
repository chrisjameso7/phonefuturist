import type {
  DeviceCorpus,
  CorpusMeasurement,
} from './device-corpus';

export const CHARGING_THERMAL_RESPONSE_VERSION =
  'charging-thermal-response-0.1.0';

export interface ChargingThermalResponseQuery {
  targetAmbientTemperatureC: number;
  referenceAmbientTemperatureC?: number;
  manufacturer?: string;
  batteryChemistry?: string;
  cellArchitecture?: 'single-cell' | 'dual-cell' | 'tri-cell' | 'quad-cell' | 'unknown';
}

export interface ChargingThermalResponseEvidence {
  deviceVariantId: string;
  chargerWatts: number;
  chargingStandard?: string;
  lowAmbientC: number;
  highAmbientC: number;
  lowAmbientMinutes: number;
  highAmbientMinutes: number;
  logMinutesPerC: number;
  manufacturer: string;
  batteryChemistry?: string;
  cellArchitecture?: 'single-cell' | 'dual-cell' | 'tri-cell' | 'quad-cell' | 'unknown';
  measurementIds: [string, string];
}

export interface ChargingThermalResponse {
  version: string;
  status: 'resolved' | 'unresolved';
  timeScale: number;
  targetAmbientTemperatureC: number;
  referenceAmbientTemperatureC?: number;
  evidenceCount: number;
  confidence: number;
  evidence: ChargingThermalResponseEvidence[];
  note: string;
}

function normalize(value?: string) {
  return value?.trim().toLowerCase();
}

function fullChargeMeasurement(
  measurement: CorpusMeasurement,
) {
  const metric = measurement.metric.toLowerCase();
  return (
    measurement.workload === 'charging' &&
    measurement.evidenceKind === 'measured' &&
    (
      metric === 'wiredfullchargeminutes' ||
      metric === 'fullchargeminutes' ||
      metric === 'timeto100minutes'
    ) &&
    measurement.testChargerWatts !== undefined &&
    measurement.testChargerWatts > 0 &&
    measurement.ambientTemperatureC !== undefined &&
    Number.isFinite(measurement.ambientTemperatureC) &&
    measurement.value > 0
  );
}

function sameMode(
  a: CorpusMeasurement,
  b: CorpusMeasurement,
) {
  return (
    a.testChargerWatts === b.testChargerWatts &&
    normalize(a.chargingStandard) ===
      normalize(b.chargingStandard)
  );
}

export function collectChargingThermalResponseEvidence(
  corpus: DeviceCorpus,
): ChargingThermalResponseEvidence[] {
  const evidence: ChargingThermalResponseEvidence[] = [];

  for (const device of corpus.devices) {
    const measurements = corpus.measurements.filter(
      (measurement) =>
        measurement.deviceVariantId === device.variant.id &&
        fullChargeMeasurement(measurement),
    );

    for (let i = 0; i < measurements.length; i += 1) {
      for (let j = i + 1; j < measurements.length; j += 1) {
        const a = measurements[i];
        const b = measurements[j];

        if (!sameMode(a, b)) continue;

        const aAmbient = a.ambientTemperatureC!;
        const bAmbient = b.ambientTemperatureC!;

        if (aAmbient === bAmbient) continue;

        const low =
          aAmbient < bAmbient ? a : b;
        const high = low === a ? b : a;

        const lowAmbientC =
          low.ambientTemperatureC!;
        const highAmbientC =
          high.ambientTemperatureC!;

        // A thermal slowdown is only learned when the warmer test
        // actually took longer. Faster warm tests are not converted into
        // a speculative inverse penalty.
        if (high.value <= low.value) continue;

        const deltaC =
          highAmbientC - lowAmbientC;

        const logMinutesPerC =
          Math.log(high.value / low.value) /
          deltaC;

        if (
          !Number.isFinite(logMinutesPerC) ||
          logMinutesPerC <= 0 ||
          logMinutesPerC > 0.08
        ) {
          continue;
        }

        evidence.push({
          deviceVariantId: device.variant.id,
          chargerWatts:
            low.testChargerWatts!,
          chargingStandard:
            low.chargingStandard,
          lowAmbientC,
          highAmbientC,
          lowAmbientMinutes: low.value,
          highAmbientMinutes: high.value,
          logMinutesPerC,
          manufacturer:
            device.variant.identity.manufacturer,
          batteryChemistry:
            device.variant.battery?.chemistry,
          cellArchitecture:
            device.charging?.cellArchitecture,
          measurementIds: [
            low.id,
            high.id,
          ],
        });
      }
    }
  }

  return evidence;
}

function evidenceWeight(
  item: ChargingThermalResponseEvidence,
  query: ChargingThermalResponseQuery,
) {
  let weight = 1;

  if (
    query.manufacturer &&
    normalize(item.manufacturer) ===
      normalize(query.manufacturer)
  ) {
    weight += 3;
  }

  if (
    query.batteryChemistry &&
    item.batteryChemistry &&
    normalize(item.batteryChemistry) ===
      normalize(query.batteryChemistry)
  ) {
    weight += 2;
  }

  if (
    query.cellArchitecture &&
    item.cellArchitecture ===
      query.cellArchitecture
  ) {
    weight += 2;
  }

  const reference =
    query.referenceAmbientTemperatureC;

  if (
    reference !== undefined &&
    reference >= item.lowAmbientC - 3 &&
    reference <= item.highAmbientC + 3
  ) {
    weight += 1.5;
  }

  return weight;
}

export function resolveChargingThermalResponse(
  corpus: DeviceCorpus,
  query: ChargingThermalResponseQuery,
): ChargingThermalResponse {
  const target =
    query.targetAmbientTemperatureC;
  const reference =
    query.referenceAmbientTemperatureC;

  if (!Number.isFinite(target)) {
    return {
      version: CHARGING_THERMAL_RESPONSE_VERSION,
      status: 'unresolved',
      timeScale: 1,
      targetAmbientTemperatureC: target,
      referenceAmbientTemperatureC: reference,
      evidenceCount: 0,
      confidence: 0,
      evidence: [],
      note:
        'Target ambient temperature is invalid. No thermal charging-speed adjustment was applied.',
    };
  }

  if (
    reference === undefined ||
    !Number.isFinite(reference)
  ) {
    return {
      version: CHARGING_THERMAL_RESPONSE_VERSION,
      status: 'unresolved',
      timeScale: 1,
      targetAmbientTemperatureC: target,
      referenceAmbientTemperatureC: reference,
      evidenceCount: 0,
      confidence: 0,
      evidence: [],
      note:
        'The reference charging measurement has no ambient temperature, so a temperature delta cannot be applied without guessing.',
    };
  }

  const evidence =
    collectChargingThermalResponseEvidence(corpus);

  if (!evidence.length) {
    return {
      version: CHARGING_THERMAL_RESPONSE_VERSION,
      status: 'unresolved',
      timeScale: 1,
      targetAmbientTemperatureC: target,
      referenceAmbientTemperatureC: reference,
      evidenceCount: 0,
      confidence: 0,
      evidence: [],
      note:
        'No same-device, same-charger-mode full-charge tests at multiple ambient temperatures are available. Charging time remains unmodified.',
    };
  }

  const weighted = evidence.map((item) => ({
    item,
    weight: evidenceWeight(item, query),
  }));

  const totalWeight = weighted.reduce(
    (sum, row) => sum + row.weight,
    0,
  );

  const logMinutesPerC =
    weighted.reduce(
      (sum, row) =>
        sum +
        row.item.logMinutesPerC *
          row.weight,
      0,
    ) /
    Math.max(totalWeight, Number.EPSILON);

  const deltaC = target - reference;

  // Evidence only establishes warmer-condition slowdown. Cooler targets
  // do not receive a speculative speed bonus.
  const effectiveDeltaC =
    Math.max(0, deltaC);

  const timeScale =
    Math.exp(
      logMinutesPerC *
        effectiveDeltaC,
    );

  const strongMatches = weighted.filter(
    (row) => row.weight >= 5,
  ).length;

  const confidence = Math.min(
    1,
    0.25 +
      Math.min(evidence.length, 6) * 0.08 +
      Math.min(strongMatches, 3) * 0.1,
  );

  return {
    version: CHARGING_THERMAL_RESPONSE_VERSION,
    status: 'resolved',
    timeScale,
    targetAmbientTemperatureC: target,
    referenceAmbientTemperatureC: reference,
    evidenceCount: evidence.length,
    confidence,
    evidence: weighted
      .sort(
        (a, b) =>
          b.weight - a.weight,
      )
      .slice(0, 6)
      .map((row) => row.item),
    note:
      effectiveDeltaC > 0
        ? 'Charging time was adjusted using same-device, same-charger-mode measurements taken at different ambient temperatures. Only observed warmer-condition slowdown is applied.'
        : 'The target ambient is not warmer than the reference measurement. No speculative cooler-condition speed bonus was applied.',
  };
}
