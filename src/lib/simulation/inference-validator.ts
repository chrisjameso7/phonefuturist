import {
  SIMULATION_INFERENCE_SCHEMA_VERSION,
  type BatteryInferenceArtifact,
  type BatteryInferenceEnvelope,
  type InferenceConfidence,
  type InferenceEvidenceReference,
  type InferenceRange,
  type InferredAssumption,
  type SimulationInferenceReceipt,
} from './inference';

export interface InferenceValidationIssue {
  code: string;
  message: string;
  path?: string;
}

export interface InferenceValidationResult {
  valid: boolean;
  issues: InferenceValidationIssue[];
}

const VALID_CONFIDENCE = new Set<InferenceConfidence>([
  'low',
  'medium',
  'high',
]);

const VALID_EVIDENCE_STRENGTH = new Set([
  'confirmed',
  'measured',
  'calibrated',
  'reference',
  'reported',
  'estimated',
]);

function isFiniteNumber(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value)
  );
}

function isNonEmptyString(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.trim().length > 0
  );
}

function validateRange(
  range: InferenceRange,
  path: string,
  issues: InferenceValidationIssue[],
): void {
  if (!isFiniteNumber(range.min)) {
    issues.push({
      code: 'INVALID_INFERENCE_RANGE_MIN',
      message: 'Inference range minimum must be finite.',
      path: `${path}.min`,
    });
  }

  if (!isFiniteNumber(range.max)) {
    issues.push({
      code: 'INVALID_INFERENCE_RANGE_MAX',
      message: 'Inference range maximum must be finite.',
      path: `${path}.max`,
    });
  }

  if (
    isFiniteNumber(range.min) &&
    isFiniteNumber(range.max) &&
    range.min > range.max
  ) {
    issues.push({
      code: 'INVERTED_INFERENCE_RANGE',
      message:
        'Inference range minimum cannot exceed its maximum.',
      path,
    });
  }

  if (!isNonEmptyString(range.unit)) {
    issues.push({
      code: 'MISSING_INFERENCE_RANGE_UNIT',
      message: 'Inference ranges require a unit.',
      path: `${path}.unit`,
    });
  }
}

function validateEvidence(
  evidence: InferenceEvidenceReference[],
  issues: InferenceValidationIssue[],
): Set<string> {
  const ids = new Set<string>();

  evidence.forEach((item, index) => {
    const path = `artifact.evidence[${index}]`;

    if (!isNonEmptyString(item.evidenceId)) {
      issues.push({
        code: 'MISSING_EVIDENCE_ID',
        message:
          'Every evidence reference requires a stable evidence ID.',
        path: `${path}.evidenceId`,
      });
    } else if (ids.has(item.evidenceId)) {
      issues.push({
        code: 'DUPLICATE_EVIDENCE_ID',
        message: `Evidence ID "${item.evidenceId}" is duplicated.`,
        path: `${path}.evidenceId`,
      });
    } else {
      ids.add(item.evidenceId);
    }

    if (!isNonEmptyString(item.title)) {
      issues.push({
        code: 'MISSING_EVIDENCE_TITLE',
        message:
          'Every evidence reference requires a title.',
        path: `${path}.title`,
      });
    }

    if (!VALID_EVIDENCE_STRENGTH.has(item.strength)) {
      issues.push({
        code: 'INVALID_EVIDENCE_STRENGTH',
        message:
          'Evidence reference contains an unsupported strength.',
        path: `${path}.strength`,
      });
    }

    if (!isNonEmptyString(item.supports)) {
      issues.push({
        code: 'MISSING_EVIDENCE_SUPPORT',
        message:
          'Evidence must state what conclusion or assumption it supports.',
        path: `${path}.supports`,
      });
    }

    if (
      item.sourceUrl !== undefined &&
      !isNonEmptyString(item.sourceUrl)
    ) {
      issues.push({
        code: 'INVALID_EVIDENCE_SOURCE_URL',
        message:
          'Evidence source URL must be a non-empty string when supplied.',
        path: `${path}.sourceUrl`,
      });
    }
  });

  return ids;
}

function validateAssumptions(
  assumptions: InferredAssumption[],
  evidenceIds: Set<string>,
  issues: InferenceValidationIssue[],
): void {
  const assumptionIds = new Set<string>();

  assumptions.forEach((assumption, index) => {
    const path = `artifact.assumptions[${index}]`;

    if (!isNonEmptyString(assumption.id)) {
      issues.push({
        code: 'MISSING_ASSUMPTION_ID',
        message:
          'Every inferred assumption requires a stable ID.',
        path: `${path}.id`,
      });
    } else if (assumptionIds.has(assumption.id)) {
      issues.push({
        code: 'DUPLICATE_ASSUMPTION_ID',
        message: `Assumption ID "${assumption.id}" is duplicated.`,
        path: `${path}.id`,
      });
    } else {
      assumptionIds.add(assumption.id);
    }

    if (!isNonEmptyString(assumption.label)) {
      issues.push({
        code: 'MISSING_ASSUMPTION_LABEL',
        message:
          'Every inferred assumption requires a label.',
        path: `${path}.label`,
      });
    }

    validateRange(
      assumption.range,
      `${path}.range`,
      issues,
    );

    if (!VALID_CONFIDENCE.has(assumption.confidence)) {
      issues.push({
        code: 'INVALID_ASSUMPTION_CONFIDENCE',
        message:
          'Assumption confidence must be low, medium, or high.',
        path: `${path}.confidence`,
      });
    }

    if (!isNonEmptyString(assumption.reasoning)) {
      issues.push({
        code: 'MISSING_ASSUMPTION_REASONING',
        message:
          'Every inferred assumption requires reasoning.',
        path: `${path}.reasoning`,
      });
    }

    if (
      !Array.isArray(assumption.evidenceIds) ||
      assumption.evidenceIds.length === 0
    ) {
      issues.push({
        code: 'ASSUMPTION_WITHOUT_EVIDENCE',
        message:
          'Every inferred assumption must cite at least one evidence item.',
        path: `${path}.evidenceIds`,
      });
      return;
    }

    for (const evidenceId of assumption.evidenceIds) {
      if (!evidenceIds.has(evidenceId)) {
        issues.push({
          code: 'UNKNOWN_ASSUMPTION_EVIDENCE',
          message:
            `Assumption references unknown evidence ID "${evidenceId}".`,
          path: `${path}.evidenceIds`,
        });
      }
    }
  });
}

function validateWorkload(
  artifact: BatteryInferenceArtifact,
  issues: InferenceValidationIssue[],
): void {
  const workload = artifact.scenario.workload;

  if (!workload) {
    return;
  }

  const values = Object.values(workload).filter(
    (value): value is number =>
      value !== undefined,
  );

  for (const value of values) {
    if (
      !isFiniteNumber(value) ||
      value < 0 ||
      value > 100
    ) {
      issues.push({
        code: 'INVALID_WORKLOAD_PERCENTAGE',
        message:
          'Workload percentages must be finite values from 0 to 100.',
        path: 'artifact.scenario.workload',
      });

      return;
    }
  }

  if (values.length > 0) {
    const total = values.reduce(
      (sum, value) => sum + value,
      0,
    );

    if (Math.abs(total - 100) > 0.001) {
      issues.push({
        code: 'INVALID_WORKLOAD_TOTAL',
        message:
          `Custom workload percentages must total 100. Received ${total}.`,
        path: 'artifact.scenario.workload',
      });
    }
  }
}

function validateArtifact(
  artifact: BatteryInferenceArtifact,
  issues: InferenceValidationIssue[],
): void {
  if (artifact.kind !== 'battery') {
    issues.push({
      code: 'INVALID_INFERENCE_KIND',
      message:
        'Battery inference envelope must contain a battery artifact.',
      path: 'artifact.kind',
    });
  }

  if (
    artifact.schemaVersion !==
    SIMULATION_INFERENCE_SCHEMA_VERSION
  ) {
    issues.push({
      code: 'INFERENCE_SCHEMA_VERSION_MISMATCH',
      message:
        `Expected inference schema ${SIMULATION_INFERENCE_SCHEMA_VERSION}.`,
      path: 'artifact.schemaVersion',
    });
  }

  const evidenceIds = validateEvidence(
    artifact.evidence,
    issues,
  );

  validateAssumptions(
    artifact.assumptions,
    evidenceIds,
    issues,
  );

  validateWorkload(artifact, issues);

  if (
    artifact.scenario.brightness !== undefined &&
    (
      !isFiniteNumber(
        artifact.scenario.brightness.value,
      ) ||
      artifact.scenario.brightness.value <= 0
    )
  ) {
    issues.push({
      code: 'INVALID_SCENARIO_BRIGHTNESS',
      message:
        'Scenario brightness must be a positive finite value.',
      path: 'artifact.scenario.brightness.value',
    });
  }

  if (
    artifact.scenario.ambientTemperatureC !== undefined &&
    !isFiniteNumber(
      artifact.scenario.ambientTemperatureC,
    )
  ) {
    issues.push({
      code: 'INVALID_AMBIENT_TEMPERATURE',
      message:
        'Ambient temperature must be finite when supplied.',
      path: 'artifact.scenario.ambientTemperatureC',
    });
  }

  if (artifact.status === 'insufficient_evidence') {
    if (artifact.averagePowerW !== undefined) {
      issues.push({
        code: 'POWER_WITH_INSUFFICIENT_EVIDENCE',
        message:
          'Average power cannot be emitted when evidence is insufficient.',
        path: 'artifact.averagePowerW',
      });
    }

    if (artifact.confidence !== undefined) {
      issues.push({
        code: 'CONFIDENCE_WITH_INSUFFICIENT_EVIDENCE',
        message:
          'Overall confidence cannot be emitted when evidence is insufficient.',
        path: 'artifact.confidence',
      });
    }

    return;
  }

  if (artifact.status !== 'ready') {
    issues.push({
      code: 'INVALID_INFERENCE_STATUS',
      message:
        'Inference status must be ready or insufficient_evidence.',
      path: 'artifact.status',
    });

    return;
  }

  if (!artifact.averagePowerW) {
    issues.push({
      code: 'READY_INFERENCE_WITHOUT_POWER',
      message:
        'A ready battery inference requires an average power range.',
      path: 'artifact.averagePowerW',
    });
  } else {
    validateRange(
      artifact.averagePowerW,
      'artifact.averagePowerW',
      issues,
    );

    if (
      artifact.averagePowerW.unit !== 'W'
    ) {
      issues.push({
        code: 'INVALID_POWER_UNIT',
        message:
          'Battery average power must use watts (W).',
        path: 'artifact.averagePowerW.unit',
      });
    }

    if (
      isFiniteNumber(artifact.averagePowerW.min) &&
      artifact.averagePowerW.min <= 0
    ) {
      issues.push({
        code: 'NON_POSITIVE_POWER_RANGE',
        message:
          'Battery average power minimum must be positive.',
        path: 'artifact.averagePowerW.min',
      });
    }
  }

  if (
    artifact.confidence === undefined ||
    !VALID_CONFIDENCE.has(artifact.confidence)
  ) {
    issues.push({
      code: 'MISSING_INFERENCE_CONFIDENCE',
      message:
        'A ready inference requires low, medium, or high confidence.',
      path: 'artifact.confidence',
    });
  }

  if (artifact.evidence.length === 0) {
    issues.push({
      code: 'READY_INFERENCE_WITHOUT_EVIDENCE',
      message:
        'A ready inference cannot exist without evidence.',
      path: 'artifact.evidence',
    });
  }

  if (artifact.assumptions.length === 0) {
    issues.push({
      code: 'READY_INFERENCE_WITHOUT_ASSUMPTIONS',
      message:
        'A ready inference requires at least one evidence-backed assumption.',
      path: 'artifact.assumptions',
    });
  }
}

function validateReceipt(
  receipt: SimulationInferenceReceipt,
  issues: InferenceValidationIssue[],
): void {
  if (!isNonEmptyString(receipt.artifactId)) {
    issues.push({
      code: 'MISSING_ARTIFACT_ID',
      message:
        'Inference receipt requires an artifact ID.',
      path: 'receipt.artifactId',
    });
  }

  if (
    receipt.schemaVersion !==
    SIMULATION_INFERENCE_SCHEMA_VERSION
  ) {
    issues.push({
      code: 'RECEIPT_SCHEMA_VERSION_MISMATCH',
      message:
        `Expected receipt schema ${SIMULATION_INFERENCE_SCHEMA_VERSION}.`,
      path: 'receipt.schemaVersion',
    });
  }

  if (!isNonEmptyString(receipt.inferenceModel)) {
    issues.push({
      code: 'MISSING_INFERENCE_MODEL',
      message:
        'Inference receipt requires the provider/model identifier.',
      path: 'receipt.inferenceModel',
    });
  }

  if (!isNonEmptyString(receipt.promptVersion)) {
    issues.push({
      code: 'MISSING_PROMPT_VERSION',
      message:
        'Inference receipt requires a prompt version.',
      path: 'receipt.promptVersion',
    });
  }

  if (!isNonEmptyString(receipt.evidenceSnapshotId)) {
    issues.push({
      code: 'MISSING_EVIDENCE_SNAPSHOT',
      message:
        'Inference receipt requires an evidence snapshot ID.',
      path: 'receipt.evidenceSnapshotId',
    });
  }

  if (!isNonEmptyString(receipt.createdAt)) {
    issues.push({
      code: 'MISSING_INFERENCE_CREATED_AT',
      message:
        'Inference receipt requires a creation timestamp.',
      path: 'receipt.createdAt',
    });
  } else if (
    Number.isNaN(Date.parse(receipt.createdAt))
  ) {
    issues.push({
      code: 'INVALID_INFERENCE_CREATED_AT',
      message:
        'Inference receipt creation timestamp must be a valid date.',
      path: 'receipt.createdAt',
    });
  }
}

/**
 * Validates an AI-assisted inference artifact before it may be
 * consumed by deterministic simulation code.
 *
 * Validation failure must fail closed.
 */
export function validateBatteryInference(
  envelope: BatteryInferenceEnvelope,
): InferenceValidationResult {
  const issues: InferenceValidationIssue[] = [];

  validateArtifact(
    envelope.artifact,
    issues,
  );

  validateReceipt(
    envelope.receipt,
    issues,
  );

  return {
    valid: issues.length === 0,
    issues,
  };
}