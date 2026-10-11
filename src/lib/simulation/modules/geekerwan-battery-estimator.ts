import type {
  DeviceCorpus,
} from './device-corpus';
import {
  findComparableDevices,
  normalizeSocFamily,
} from './comparable-devices';

export const GEEKERWAN_BATTERY_ESTIMATOR_VERSION =
  'geekerwan-battery-estimator-0.1.0';

export interface GeekerwanBatteryEstimateInput {
  batteryMah: number;
  batteryEnergyWh?: number;
  manufacturer?: string;
  socVendor?: string;
  socName?: string;
  limit?: number;
}

export interface GeekerwanBatteryEstimateResult {
  version: string;
  status: 'resolved' | 'unresolved';
  expectedHours?: number;
  minHours?: number;
  maxHours?: number;
  expectedWhPerHour?: number;
  expectedMahPerHour?: number;
  referenceCount: number;
  neighborIds: string[];
  evidenceScope?:
    | 'same-soc-family'
    | 'same-soc-vendor'
    | 'protocol-cohort';
  sameSocFamilyReferences: number;
  sameSocVendorReferences: number;
  sourceIds: string[];
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

function weightedMean(
  rows: Array<{
    value: number;
    weight: number;
  }>,
) {
  const total =
    rows.reduce(
      (sum, row) =>
        sum + row.weight,
      0,
    );

  return (
    rows.reduce(
      (sum, row) =>
        sum +
        row.value *
          row.weight,
      0,
    ) /
    Math.max(
      total,
      Number.EPSILON,
    )
  );
}

export function estimateGeekerwanBatteryLife(
  corpus: DeviceCorpus,
  input: GeekerwanBatteryEstimateInput,
): GeekerwanBatteryEstimateResult {
  if (!positive(input.batteryMah)) {
    return {
      version:
        GEEKERWAN_BATTERY_ESTIMATOR_VERSION,
      status: 'unresolved',
      referenceCount: 0,
      neighborIds: [],
      sameSocFamilyReferences: 0,
      sameSocVendorReferences: 0,
      sourceIds: [],
      unresolvedReason:
        'Battery capacity is required.',
      note:
        'Geekerwan-protocol battery life remains unresolved without target battery capacity.',
    };
  }

  const measurements =
    corpus.measurements.filter(
      (measurement) =>
        measurement.metric ===
          'geekerwan_battery_life_5_0_hours' &&
        measurement.workload ===
          'benchmark' &&
        measurement.evidenceKind ===
          'measured' &&
        measurement.unit.toLowerCase() ===
          'hours' &&
        positive(measurement.value),
    );

  const eligibleIds =
    new Set(
      measurements.map(
        (measurement) =>
          measurement.deviceVariantId,
      ),
    );

  const evidenceCorpus: DeviceCorpus = {
    ...corpus,
    devices:
      corpus.devices.filter(
        (device) =>
          eligibleIds.has(
            device.variant.id,
          ),
      ),
  };

  const comparables =
    findComparableDevices(
      evidenceCorpus,
      {
        batteryMah:
          input.batteryMah,
        manufacturer:
          input.manufacturer,
        socVendor:
          input.socVendor,
        socName:
          input.socName,
        limit:
          input.limit ?? 20,
      },
    );

  const measurementByDevice =
    new Map(
      measurements.map(
        (measurement) => [
          measurement.deviceVariantId,
          measurement,
        ],
      ),
    );

  const rows =
    comparables.flatMap(
      (match) => {
        const measurement =
          measurementByDevice.get(
            match.device.variant.id,
          );
        if (!measurement) return [];

        const battery =
          match.device.variant
            .battery;
        const capacity =
          battery?.capacityMah ??
          battery?.typicalCapacityMah;
        const energy =
          battery?.typicalEnergyWh ??
          battery?.ratedEnergyWh ??
          (
            positive(capacity) &&
            positive(
              battery
                ?.nominalVoltageV,
            )
              ? (
                  capacity *
                  battery!
                    .nominalVoltageV!
                ) /
                1000
              : undefined
          );

        if (!positive(capacity)) {
          return [];
        }

        return [{
          deviceVariantId:
            match.device.variant.id,
          hours:
            measurement.value,
          mahPerHour:
            capacity /
            measurement.value,
          whPerHour:
            positive(energy)
              ? energy /
                measurement.value
              : undefined,
          weight:
            Math.max(
              match.score,
              0.05,
            ) ** 2,
          socVendor:
            match.device.variant
              .soc?.vendor,
          socName:
            match.device.variant
              .soc?.name,
          sourceId:
            measurement.sourceId,
        }];
      },
    );

  const sameFamily =
    input.socName
      ? rows.filter(
          (row) =>
            row.socName &&
            normalizeSocFamily(
              row.socName,
            ) ===
              normalizeSocFamily(
                input.socName!,
              ),
        )
      : [];

  const sameVendor =
    input.socVendor
      ? rows.filter(
          (row) =>
            row.socVendor ===
            input.socVendor,
        )
      : [];

  const selected =
    sameFamily.length >= 2
      ? sameFamily
      : sameVendor.length >= 2
        ? sameVendor
        : rows;

  if (!selected.length) {
    return {
      version:
        GEEKERWAN_BATTERY_ESTIMATOR_VERSION,
      status: 'unresolved',
      referenceCount: 0,
      neighborIds: [],
      sameSocFamilyReferences:
        sameFamily.length,
      sameSocVendorReferences:
        sameVendor.length,
      sourceIds: [],
      unresolvedReason:
        'No compatible Geekerwan Smartphone 5.0 references were found.',
      note:
        'The estimator fails closed rather than falling back to unrelated battery protocols.',
    };
  }

  const evidenceScope =
    selected === sameFamily
      ? 'same-soc-family' as const
      : selected === sameVendor
        ? 'same-soc-vendor' as const
        : 'protocol-cohort' as const;

  const allHaveEnergy =
    positive(
      input.batteryEnergyWh,
    ) &&
    selected.every(
      (row) =>
        positive(row.whPerHour),
    );

  const expectedDrain =
    allHaveEnergy
      ? weightedMean(
          selected.map(
            (row) => ({
              value:
                row.whPerHour!,
              weight:
                row.weight,
            }),
          ),
        )
      : weightedMean(
          selected.map(
            (row) => ({
              value:
                row.mahPerHour,
              weight:
                row.weight,
            }),
          ),
        );

  const expectedHours =
    allHaveEnergy
      ? input.batteryEnergyWh! /
        expectedDrain
      : input.batteryMah /
        expectedDrain;

  const perReferenceHours =
    selected.map(
      (row) =>
        allHaveEnergy
          ? input.batteryEnergyWh! /
            row.whPerHour!
          : input.batteryMah /
            row.mahPerHour,
    );

  return {
    version:
      GEEKERWAN_BATTERY_ESTIMATOR_VERSION,
    status: 'resolved',
    expectedHours,
    minHours:
      Math.min(
        ...perReferenceHours,
      ),
    maxHours:
      Math.max(
        ...perReferenceHours,
      ),
    ...(allHaveEnergy
      ? {
          expectedWhPerHour:
            expectedDrain,
        }
      : {
          expectedMahPerHour:
            expectedDrain,
        }),
    referenceCount:
      selected.length,
    neighborIds: [
      ...new Set(
        selected.map(
          (row) =>
            row.deviceVariantId,
        ),
      ),
    ],
    evidenceScope,
    sameSocFamilyReferences:
      sameFamily.length,
    sameSocVendorReferences:
      sameVendor.length,
    sourceIds: [
      ...new Set(
        selected.map(
          (row) =>
            row.sourceId,
        ),
      ),
    ],
    note:
      allHaveEnergy
        ? `Estimated Smartphone 5.0 battery life is energy-normalized in Wh/h using Geekerwan-only ${evidenceScope.replaceAll('-', ' ')} evidence. No PhoneArena or GSMArena runtime protocol is mixed into this estimate.`
        : `Estimated Smartphone 5.0 battery life is capacity-normalized in mAh/h using Geekerwan-only ${evidenceScope.replaceAll('-', ' ')} evidence. Wh normalization is withheld because target or selected references lack accepted battery-energy evidence.`,
  };
}
