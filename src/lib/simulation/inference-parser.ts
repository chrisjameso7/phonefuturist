import { z } from 'zod';

import {
  SIMULATION_INFERENCE_SCHEMA_VERSION,
  type BatteryInferenceEnvelope,
} from './inference';

const inferenceRangeSchema = z
  .object({
    min: z.number(),
    max: z.number(),
    unit: z.string().min(1),
  })
  .strict();

const evidenceReferenceSchema = z
  .object({
    evidenceId: z.string().min(1),
    title: z.string().min(1),
    strength: z.enum([
      'confirmed',
      'measured',
      'calibrated',
      'reference',
      'reported',
      'estimated',
    ]),
    sourceUrl: z.string().min(1).optional(),
    supports: z.string().min(1),
  })
  .strict();

const brightnessSchema = z
  .object({
    value: z.number(),
    unit: z.literal('nits'),
  })
  .strict();

const workloadSchema = z
  .object({
    webSocialPercent: z.number().optional(),
    videoPercent: z.number().optional(),
    gamingPercent: z.number().optional(),
    cameraPercent: z.number().optional(),
    idlePercent: z.number().optional(),
  })
  .strict();

const scenarioSchema = z
  .object({
    deviceName: z.string().min(1).optional(),

    usageProfile: z.enum([
      'light',
      'typical',
      'heavy',
      'custom',
    ]),

    brightness: brightnessSchema.optional(),

    network: z
      .enum([
        'wifi',
        'mixed',
        'cellular',
      ])
      .optional(),

    ambientTemperatureC: z
      .number()
      .optional(),

    workload: workloadSchema.optional(),
  })
  .strict();

const assumptionSchema = z
  .object({
    id: z.string().min(1),
    label: z.string().min(1),
    range: inferenceRangeSchema,

    confidence: z.enum([
      'low',
      'medium',
      'high',
    ]),

    reasoning: z.string().min(1),

    evidenceIds: z.array(
      z.string().min(1),
    ),
  })
  .strict();

const batteryArtifactSchema = z
  .object({
    kind: z.literal('battery'),

    schemaVersion: z.literal(
      SIMULATION_INFERENCE_SCHEMA_VERSION,
    ),

    status: z.enum([
      'ready',
      'insufficient_evidence',
    ]),

    scenario: scenarioSchema,

    evidence: z.array(
      evidenceReferenceSchema,
    ),

    assumptions: z.array(
      assumptionSchema,
    ),

    averagePowerW:
      inferenceRangeSchema.optional(),

    confidence: z
      .enum([
        'low',
        'medium',
        'high',
      ])
      .optional(),

    factors: z.array(z.string()),

    limitations: z.array(z.string()),
  })
  .strict();

const receiptSchema = z
  .object({
    artifactId: z.string().min(1),

    schemaVersion: z.literal(
      SIMULATION_INFERENCE_SCHEMA_VERSION,
    ),

    inferenceModel: z.string().min(1),

    promptVersion: z.string().min(1),

    evidenceSnapshotId: z.string().min(1),

    createdAt: z.string().min(1),
  })
  .strict();

const batteryInferenceEnvelopeSchema = z
  .object({
    artifact: batteryArtifactSchema,
    receipt: receiptSchema,
  })
  .strict();

export interface InferenceParseIssue {
  path: string;
  message: string;
}

export type BatteryInferenceParseResult =
  | {
      success: true;
      data: BatteryInferenceEnvelope;
      issues: [];
    }
  | {
      success: false;
      issues: InferenceParseIssue[];
    };

/**
 * Runtime boundary for untrusted inference output.
 *
 * Raw provider output must pass this parser before it may be
 * treated as a BatteryInferenceEnvelope.
 *
 * This layer validates runtime structure only.
 * Evidence relationships and simulation semantics remain the
 * responsibility of validateBatteryInference().
 */
export function parseBatteryInference(
  input: unknown,
): BatteryInferenceParseResult {
  const result =
    batteryInferenceEnvelopeSchema.safeParse(
      input,
    );

  if (!result.success) {
    return {
      success: false,
      issues: result.error.issues.map(
        (issue) => ({
          path:
            issue.path.length > 0
              ? issue.path.join('.')
              : '$',
          message: issue.message,
        }),
      ),
    };
  }

  return {
    success: true,
    data: result.data,
    issues: [],
  };
}