import {
  CALIBRATION_DATASET_VERSION,
  POWER_EVIDENCE_VERSION,
  REFERENCE_DEVICES,
  SIMPLE_WORKLOADS,
  WEB_ANCHOR_CONDITIONS,
  evidenceDeviceFrom,
  resolvePowerEvidence,
  workloadEvidence,
  type EvidenceDevice,
  type ReferenceDevice,
  type ResolvedPowerEvidence,
  type WorkloadEvidenceStatus,
} from './power-evidence';

import type {
  BatteryExperienceWorkload,
} from './modules/battery-experience';

import type {
  SimulationInput,
} from './types';

export const EVIDENCE_SNAPSHOT_SCHEMA_VERSION =
  '0.1.0' as const;

export interface EvidenceSnapshotWorkload {
  workload: BatteryExperienceWorkload;
  status: WorkloadEvidenceStatus;

  powerW?: {
    min: number;
    max: number;
  };

  note: string;
}

export interface EvidenceSnapshotReference {
  id: string;
  manufacturer: string;
  model: string;
  releaseYear?: number;

  energyWh: number;
  energyBasis: 'rated' | 'typical';

  runtimeSeconds: number;
  screenOnPowerW: number;

  displayAreaCm2?: number;
  soc?: string;

  measurementIds: string[];
  protocolId: string;
  provider: string;
}

export interface BatteryEvidenceSnapshot {
  kind: 'battery-evidence';

  schemaVersion:
    typeof EVIDENCE_SNAPSHOT_SCHEMA_VERSION;

  powerEvidenceVersion: string;
  calibrationDatasetVersion: string;

  /**
   * Stable identifier derived only from snapshot content.
   * This is deterministic, not cryptographic.
   */
  snapshotId: string;

  device: EvidenceDevice;

  resolution: {
    status: 'resolved' | 'insufficient';

    basis?: ResolvedPowerEvidence['basis'];

    webPowerW?: {
      min: number;
      max: number;
    };

    screenOnBudgetHours?: {
      min: number;
      max: number;
    };

    referenceCount: number;
  };

  protocol: {
    id: string;
    version: string;
    provider: string;
    name: string;
    workload: string;
    connectivity: string;
    brightnessNits: number;
    brightnessQualifier: string;
    powerSavingMeasures: string;
  };

  workloads: EvidenceSnapshotWorkload[];

  references: EvidenceSnapshotReference[];

  notes: string[];
  assumptions: string[];
}

type BatteryEvidenceSnapshotContent =
  Omit<
    BatteryEvidenceSnapshot,
    'snapshotId'
  >;

function snapshotReference(
  reference: ReferenceDevice,
): EvidenceSnapshotReference {
  return {
    id: reference.id,
    manufacturer: reference.manufacturer,
    model: reference.model,

    ...(reference.releaseYear !== undefined
      ? {
          releaseYear:
            reference.releaseYear,
        }
      : {}),

    energyWh: reference.energyWh,
    energyBasis: reference.energyBasis,

    runtimeSeconds:
      reference.runtimeSeconds,

    screenOnPowerW:
      reference.screenOnPowerW,

    ...(reference.displayAreaCm2 !== undefined
      ? {
          displayAreaCm2:
            reference.displayAreaCm2,
        }
      : {}),

    ...(reference.soc
      ? {
          soc: reference.soc,
        }
      : {}),

    measurementIds: [
      ...reference.measurementIds,
    ],

    protocolId:
      reference.protocolId,

    provider:
      reference.provider,
  };
}

function stableSerialize(
  value: unknown,
): string {
  if (
    value === null ||
    typeof value !== 'object'
  ) {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value
      .map(stableSerialize)
      .join(',')}]`;
  }

  const record =
    value as Record<string, unknown>;

  return `{${Object.keys(record)
    .sort()
    .map(
      (key) =>
        `${JSON.stringify(
          key,
        )}:${stableSerialize(
          record[key],
        )}`,
    )
    .join(',')}}`;
}

/**
 * Small deterministic FNV-1a identifier.
 *
 * This is used for reproducible snapshot identity,
 * not security. A cryptographic content-addressing
 * implementation can replace it later without changing
 * the snapshot's public structure.
 */
function snapshotIdentifier(
  value: unknown,
): string {
  const serialized =
    stableSerialize(value);

  let hash = 0x811c9dc5;

  for (
    let index = 0;
    index < serialized.length;
    index += 1
  ) {
    hash ^= serialized.charCodeAt(index);

    hash = Math.imul(
      hash,
      0x01000193,
    );
  }

  return `battery-evidence-${(
    hash >>> 0
  )
    .toString(16)
    .padStart(8, '0')}`;
}

function snapshotWorkloads(
  evidence:
    | ResolvedPowerEvidence
    | undefined,
): EvidenceSnapshotWorkload[] {
  if (!evidence) {
    return SIMPLE_WORKLOADS.map(
      (workload) => ({
        workload,
        status: 'insufficient',
        note:
          'No battery power evidence could be resolved for this device.',
      }),
    );
  }

  const resolved =
    workloadEvidence(evidence);

  return SIMPLE_WORKLOADS.map(
    (workload) => {
      const item =
        resolved[workload];

      return {
        workload,
        status: item.status,

        ...(item.powerW
          ? {
              powerW: {
                min:
                  item.powerW.min,
                max:
                  item.powerW.max,
              },
            }
          : {}),

        note: item.note,
      };
    },
  );
}

export function createBatteryEvidenceSnapshotFromDevice(
  device: EvidenceDevice,
  references:
    readonly ReferenceDevice[] =
      REFERENCE_DEVICES,
): BatteryEvidenceSnapshot {
  const evidence =
    resolvePowerEvidence(
      device,
      references,
    );

  const referenceSnapshots =
    references.map(snapshotReference);

  /*
   * Explicitly typing this object prevents TypeScript
   * from widening schemaVersion from the literal
   * "0.1.0" to string.
   */
  const snapshotWithoutId:
    BatteryEvidenceSnapshotContent = {
      kind: 'battery-evidence',

      schemaVersion:
        EVIDENCE_SNAPSHOT_SCHEMA_VERSION,

      powerEvidenceVersion:
        POWER_EVIDENCE_VERSION,

      calibrationDatasetVersion:
        CALIBRATION_DATASET_VERSION,

      device: {
        ...(device.name
          ? {
              name: device.name,
            }
          : {}),

        ...(device.energyWh !== undefined
          ? {
              energyWh:
                device.energyWh,
            }
          : {}),

        ...(device.displayAreaCm2 !==
        undefined
          ? {
              displayAreaCm2:
                device.displayAreaCm2,
            }
          : {}),
      },

      resolution: evidence
        ? {
            status: 'resolved',
            basis: evidence.basis,

            webPowerW: {
              min:
                evidence.webPowerW.min,
              max:
                evidence.webPowerW.max,
            },

            screenOnBudgetHours: {
              min:
                evidence
                  .screenOnBudgetHours
                  .min,

              max:
                evidence
                  .screenOnBudgetHours
                  .max,
            },

            referenceCount:
              evidence.referenceCount,
          }
        : {
            status: 'insufficient',

            referenceCount:
              references.length,
          },

      protocol: {
        id:
          WEB_ANCHOR_CONDITIONS
            .protocolId,

        version:
          WEB_ANCHOR_CONDITIONS
            .protocolVersion,

        provider:
          WEB_ANCHOR_CONDITIONS
            .provider,

        name:
          WEB_ANCHOR_CONDITIONS
            .name,

        workload:
          WEB_ANCHOR_CONDITIONS
            .workload,

        connectivity:
          WEB_ANCHOR_CONDITIONS
            .connectivity,

        brightnessNits:
          WEB_ANCHOR_CONDITIONS
            .brightnessNits,

        brightnessQualifier:
          WEB_ANCHOR_CONDITIONS
            .brightnessQualifier,

        powerSavingMeasures:
          WEB_ANCHOR_CONDITIONS
            .powerSavingMeasures,
      },

      workloads:
        snapshotWorkloads(evidence),

      references:
        referenceSnapshots,

      notes:
        evidence
          ? [...evidence.notes]
          : [
              'No battery power evidence could be resolved for this device.',
            ],

      assumptions:
        evidence
          ? [...evidence.assumptions]
          : [
              'No power estimate is produced when the simulated device lacks the information required by the calibration model.',
            ],
    };

  return {
    ...snapshotWithoutId,

    snapshotId:
      snapshotIdentifier(
        snapshotWithoutId,
      ),
  };
}

export function createBatteryEvidenceSnapshot(
  input: SimulationInput,
  references:
    readonly ReferenceDevice[] =
      REFERENCE_DEVICES,
): BatteryEvidenceSnapshot {
  return createBatteryEvidenceSnapshotFromDevice(
    evidenceDeviceFrom(input),
    references,
  );
}