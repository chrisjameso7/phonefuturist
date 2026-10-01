import { z } from 'zod';

import {
  EVIDENCE_SNAPSHOT_SCHEMA_VERSION,
  type BatteryEvidenceSnapshot,
} from './evidence-snapshot';

const rangeSchema = z
  .object({
    min: z.number(),
    max: z.number(),
  })
  .strict()
  .refine(
    (value) => value.min <= value.max,
    'Range minimum must not exceed maximum.',
  );

const workloadSchema = z
  .object({
    workload: z.enum([
      'mixed_use',
      'web_browsing',
      'video_playback',
      'gaming',
      'camera_use',
      'standby',
    ]),
    status: z.enum([
      'calibrated',
      'reference',
      'insufficient',
    ]),
    powerW: rangeSchema.optional(),
    note: z.string(),
  })
  .strict();

const referenceSchema = z
  .object({
    id: z.string().min(1),
    manufacturer: z.string().min(1),
    model: z.string().min(1),
    releaseYear: z.number().int().optional(),
    energyWh: z.number().positive(),
    energyBasis: z.enum([
      'rated',
      'typical',
    ]),
    runtimeSeconds: z.number().positive(),
    screenOnPowerW: z.number().positive(),
    displayAreaCm2: z.number().positive().optional(),
    soc: z.string().optional(),
    measurementIds: z.array(
      z.string().min(1),
    ),
    protocolId: z.string().min(1),
    provider: z.string().min(1),
  })
  .strict();

const deviceSchema = z
  .object({
    name: z.string().min(1),
    energyWh: z.number().positive(),
    displayAreaCm2: z.number().positive().optional(),
  })
  .strict();

const resolutionSchema = z
  .object({
    status: z.enum([
      'resolved',
      'insufficient',
    ]),
    basis: z
      .enum([
        'matched-reference',
        'reference-population',
      ])
      .optional(),
    webPowerW: rangeSchema.optional(),
    screenOnBudgetHours: rangeSchema.optional(),
    referenceCount: z.number().int().nonnegative(),
  })
  .strict();

const protocolSchema = z
  .object({
    id: z.string().min(1),
    version: z.string().min(1),
    provider: z.string().min(1),
    name: z.string().min(1),
    workload: z.string().min(1),
    connectivity: z.string().min(1),
    brightnessNits: z.number().positive(),
    brightnessQualifier: z.string(),
    powerSavingMeasures: z.string(),
  })
  .strict();

const batteryEvidenceSnapshotSchema = z
  .object({
    kind: z.literal(
      'battery-evidence',
    ),
    schemaVersion: z.literal(
      EVIDENCE_SNAPSHOT_SCHEMA_VERSION,
    ),
    powerEvidenceVersion:
      z.string().min(1),
    calibrationDatasetVersion:
      z.string().min(1),
    snapshotId: z.string().min(1),

    device: deviceSchema,

    resolution:
      resolutionSchema,

    protocol:
      protocolSchema,

    workloads: z.array(
      workloadSchema,
    ),

    references: z.array(
      referenceSchema,
    ),

    notes: z.array(
      z.string(),
    ),

    assumptions: z.array(
      z.string(),
    ),
  })
  .strict();

export function parseBatteryEvidenceSnapshot(
  input: unknown,
): BatteryEvidenceSnapshot {
  return batteryEvidenceSnapshotSchema.parse(
    input,
  );
}

export function safeParseBatteryEvidenceSnapshot(
  input: unknown,
):
  | {
      success: true;
      data: BatteryEvidenceSnapshot;
    }
  | {
      success: false;
    } {
  const result =
    batteryEvidenceSnapshotSchema.safeParse(
      input,
    );

  if (!result.success) {
    return {
      success: false,
    };
  }

  return {
    success: true,
    data: result.data,
  };
}