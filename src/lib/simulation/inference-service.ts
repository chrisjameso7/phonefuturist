import type {
  BatteryEvidenceSnapshot,
} from './evidence-snapshot';

import {
  SIMULATION_INFERENCE_SCHEMA_VERSION,
  type BatteryInferenceArtifact,
  type BatteryInferenceEnvelope,
  type SimpleBatteryScenario,
} from './inference';

import {
  parseBatteryInferenceArtifact,
} from './inference-parser';

import {
  validateBatteryInference,
} from './inference-validator';

export const BATTERY_INFERENCE_PROMPT_VERSION =
  'battery-inference-0.1.0';

export interface BatteryInferenceRequest {
  scenario: SimpleBatteryScenario;
  evidence: BatteryEvidenceSnapshot;
}

export interface BatteryInferenceProviderContext {
  promptVersion:
    typeof BATTERY_INFERENCE_PROMPT_VERSION;

  schemaVersion:
    typeof SIMULATION_INFERENCE_SCHEMA_VERSION;
}

export interface BatteryInferenceProvider {
  /**
   * Stable provider/model identifier recorded by
   * PhoneFuturist in the inference receipt.
   *
   * The inference model itself does not control this.
   */
  readonly modelId: string;

  /**
   * Return untrusted JSON-like output.
   *
   * The provider adapter may call any external model,
   * but this service treats its response as unknown
   * until runtime parsing and semantic validation pass.
   */
  inferBattery(
    request: BatteryInferenceRequest,
    context: BatteryInferenceProviderContext,
  ): Promise<unknown>;
}

export interface InferenceClock {
  now(): Date;
}

export interface ArtifactIdFactory {
  createArtifactId(): string;
}

export interface BatteryInferenceServiceDependencies {
  provider: BatteryInferenceProvider;

  clock?: InferenceClock;

  artifactIds?: ArtifactIdFactory;
}

export type BatteryInferenceServiceResult =
  | {
      status: 'ready';
      envelope: BatteryInferenceEnvelope;
    }
  | {
      status: 'insufficient_evidence';
      envelope: BatteryInferenceEnvelope;
    }
  | {
      status: 'invalid_provider_output';
      issues: string[];
    }
  | {
      status: 'provider_error';
      message: string;
    };

const systemClock: InferenceClock = {
  now() {
    return new Date();
  },
};

const defaultArtifactIds: ArtifactIdFactory = {
  createArtifactId() {
    if (
      typeof globalThis.crypto !== 'undefined' &&
      typeof globalThis.crypto.randomUUID ===
        'function'
    ) {
      return globalThis.crypto.randomUUID();
    }

    /*
     * This fallback is only identity metadata.
     * It is not used for security or scientific math.
     */
    return [
      'artifact',
      Date.now().toString(36),
      Math.random().toString(36).slice(2),
    ].join('-');
  },
};

function issueText(
  path: string | undefined,
  message: string,
): string {
  return path
    ? `${path}: ${message}`
    : message;
}

function providerErrorMessage(
  error: unknown,
): string {
  if (
    error instanceof Error &&
    error.message.trim()
  ) {
    return error.message;
  }

  return 'Battery inference provider failed.';
}

function allowedEvidenceIds(
  snapshot: BatteryEvidenceSnapshot,
): Set<string> {
  return new Set(
    snapshot.references.flatMap(
      (reference) =>
        reference.measurementIds,
    ),
  );
}

function validateSnapshotEvidence(
  artifact: BatteryInferenceArtifact,
  snapshot: BatteryEvidenceSnapshot,
): string[] {
  const allowed =
    allowedEvidenceIds(snapshot);

  const issues: string[] = [];

  artifact.evidence.forEach(
    (evidence, index) => {
      if (
        !allowed.has(
          evidence.evidenceId,
        )
      ) {
        issues.push(
          [
            `artifact.evidence[${index}].evidenceId:`,
            `Evidence ID "${evidence.evidenceId}"`,
            'does not exist in the frozen evidence snapshot.',
          ].join(' '),
        );
      }
    },
  );

  artifact.assumptions.forEach(
    (assumption, assumptionIndex) => {
      assumption.evidenceIds.forEach(
        (
          evidenceId,
          evidenceIndex,
        ) => {
          if (
            !allowed.has(evidenceId)
          ) {
            issues.push(
              [
                `artifact.assumptions[${assumptionIndex}].evidenceIds[${evidenceIndex}]:`,
                `Evidence ID "${evidenceId}"`,
                'does not exist in the frozen evidence snapshot.',
              ].join(' '),
            );
          }
        },
      );
    },
  );

  return issues;
}

function trustedScenario(
  scenario: SimpleBatteryScenario,
): SimpleBatteryScenario {
  return {
    ...scenario,

    ...(scenario.workload
      ? {
          workload: {
            ...scenario.workload,
          },
        }
      : {}),

    ...(scenario.brightness
      ? {
          brightness: {
            ...scenario.brightness,
          },
        }
      : {}),
  };
}

export function createBatteryInferenceService(
  dependencies: BatteryInferenceServiceDependencies,
) {
  const clock =
    dependencies.clock ?? systemClock;

  const artifactIds =
    dependencies.artifactIds ??
    defaultArtifactIds;

  return {
    async infer(
      request: BatteryInferenceRequest,
    ): Promise<BatteryInferenceServiceResult> {
      let rawArtifact: unknown;

      try {
        rawArtifact =
          await dependencies.provider.inferBattery(
            request,
            {
              promptVersion:
                BATTERY_INFERENCE_PROMPT_VERSION,

              schemaVersion:
                SIMULATION_INFERENCE_SCHEMA_VERSION,
            },
          );
      } catch (error) {
        return {
          status: 'provider_error',

          message:
            providerErrorMessage(error),
        };
      }

      const parsed =
        parseBatteryInferenceArtifact(
          rawArtifact,
        );

      if (!parsed.success) {
        return {
          status:
            'invalid_provider_output',

          issues: parsed.issues.map(
            (issue) =>
              issueText(
                issue.path,
                issue.message,
              ),
          ),
        };
      }

      /*
       * Create a new trusted artifact instead of
       * mutating the provider-owned parsed object.
       *
       * The provider may reason about the scenario,
       * but PhoneFuturist remains authoritative for
       * what the user actually requested.
       */
      const artifact:
        BatteryInferenceArtifact = {
          ...parsed.data,

          scenario:
            trustedScenario(
              request.scenario,
            ),
        };

      /*
       * Evidence IDs are not trusted merely because
       * the provider produced an internally consistent
       * artifact.
       *
       * Every evidence reference used by the artifact
       * must originate from a measurement frozen into
       * this exact evidence snapshot.
       */
      const snapshotIssues =
        validateSnapshotEvidence(
          artifact,
          request.evidence,
        );

      if (
        snapshotIssues.length > 0
      ) {
        return {
          status:
            'invalid_provider_output',

          issues:
            snapshotIssues,
        };
      }

      /*
       * Receipt metadata is generated exclusively by
       * PhoneFuturist after provider output has passed
       * structural parsing and snapshot provenance
       * checks.
       */
      const envelope:
        BatteryInferenceEnvelope = {
          artifact,

          receipt: {
            artifactId:
              artifactIds.createArtifactId(),

            schemaVersion:
              SIMULATION_INFERENCE_SCHEMA_VERSION,

            inferenceModel:
              dependencies.provider.modelId,

            promptVersion:
              BATTERY_INFERENCE_PROMPT_VERSION,

            evidenceSnapshotId:
              request.evidence.snapshotId,

            createdAt:
              clock.now().toISOString(),
          },
        };

      const validation =
        validateBatteryInference(
          envelope,
        );

      if (!validation.valid) {
        return {
          status:
            'invalid_provider_output',

          issues:
            validation.issues.map(
              (issue) =>
                issueText(
                  issue.path,
                  issue.message,
                ),
            ),
        };
      }

      if (
        envelope.artifact.status ===
        'insufficient_evidence'
      ) {
        return {
          status:
            'insufficient_evidence',

          envelope,
        };
      }

      return {
        status: 'ready',
        envelope,
      };
    },
  };
}