import { describe, expect, it } from 'vitest';

import {
  SIMULATION_INFERENCE_SCHEMA_VERSION,
  type BatteryInferenceEnvelope,
} from '../src/lib/simulation/inference';

import {
  validateBatteryInference,
} from '../src/lib/simulation/inference-validator';

function createValidEnvelope(): BatteryInferenceEnvelope {
  return {
    artifact: {
      kind: 'battery',
      schemaVersion: SIMULATION_INFERENCE_SCHEMA_VERSION,
      status: 'ready',

      scenario: {
        deviceName: 'Reference Device',
        usageProfile: 'typical',
        brightness: {
          value: 300,
          unit: 'nits',
        },
        network: 'mixed',
        ambientTemperatureC: 25,
      },

      evidence: [
        {
          evidenceId: 'battery-web-001',
          title: 'Calibrated web browsing measurement',
          strength: 'calibrated',
          supports:
            'Typical active-device power under a web browsing workload.',
        },
      ],

      assumptions: [
        {
          id: 'average-active-power',
          label: 'Average active-device power',
          range: {
            min: 2.1,
            max: 2.5,
            unit: 'W',
          },
          confidence: 'medium',
          reasoning:
            'Bounded from the supplied calibrated reference evidence.',
          evidenceIds: ['battery-web-001'],
        },
      ],

      averagePowerW: {
        min: 2.1,
        max: 2.5,
        unit: 'W',
      },

      confidence: 'medium',

      factors: [
        'Display brightness',
        'Network conditions',
      ],

      limitations: [
        'Reference evidence does not fully represent every workload.',
      ],
    },

    receipt: {
      artifactId: 'artifact-001',
      schemaVersion: SIMULATION_INFERENCE_SCHEMA_VERSION,
      inferenceModel: 'test-provider:test-model',
      promptVersion: 'battery-inference-0.1.0',
      evidenceSnapshotId: 'snapshot-001',
      createdAt: '2026-09-30T10:00:00.000Z',
    },
  };
}

describe('validateBatteryInference', () => {
  it('accepts a valid ready inference', () => {
    const result = validateBatteryInference(
      createValidEnvelope(),
    );

    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it('rejects an inverted power range', () => {
    const envelope = createValidEnvelope();

    envelope.artifact.averagePowerW = {
      min: 3,
      max: 2,
      unit: 'W',
    };

    const result = validateBatteryInference(envelope);

    expect(result.valid).toBe(false);

    expect(
      result.issues.some(
        (issue) =>
          issue.code === 'INVERTED_INFERENCE_RANGE',
      ),
    ).toBe(true);
  });

  it('rejects non-positive power', () => {
    const envelope = createValidEnvelope();

    envelope.artifact.averagePowerW = {
      min: -1,
      max: 2,
      unit: 'W',
    };

    const result = validateBatteryInference(envelope);

    expect(result.valid).toBe(false);

    expect(
      result.issues.some(
        (issue) =>
          issue.code === 'NON_POSITIVE_POWER_RANGE',
      ),
    ).toBe(true);
  });

  it('rejects an unsupported power unit', () => {
    const envelope = createValidEnvelope();

    envelope.artifact.averagePowerW = {
      min: 2,
      max: 3,
      unit: 'mW',
    };

    const result = validateBatteryInference(envelope);

    expect(result.valid).toBe(false);

    expect(
      result.issues.some(
        (issue) =>
          issue.code === 'INVALID_POWER_UNIT',
      ),
    ).toBe(true);
  });

  it('rejects an assumption that cites unknown evidence', () => {
    const envelope = createValidEnvelope();

    envelope.artifact.assumptions[0].evidenceIds = [
      'invented-evidence',
    ];

    const result = validateBatteryInference(envelope);

    expect(result.valid).toBe(false);

    expect(
      result.issues.some(
        (issue) =>
          issue.code ===
          'UNKNOWN_ASSUMPTION_EVIDENCE',
      ),
    ).toBe(true);
  });

  it('rejects duplicate evidence IDs', () => {
    const envelope = createValidEnvelope();

    envelope.artifact.evidence.push({
      ...envelope.artifact.evidence[0],
    });

    const result = validateBatteryInference(envelope);

    expect(result.valid).toBe(false);

    expect(
      result.issues.some(
        (issue) =>
          issue.code === 'DUPLICATE_EVIDENCE_ID',
      ),
    ).toBe(true);
  });

  it('rejects ready inference without evidence', () => {
    const envelope = createValidEnvelope();

    envelope.artifact.evidence = [];

    const result = validateBatteryInference(envelope);

    expect(result.valid).toBe(false);

    expect(
      result.issues.some(
        (issue) =>
          issue.code ===
          'READY_INFERENCE_WITHOUT_EVIDENCE',
      ),
    ).toBe(true);
  });

  it('rejects ready inference without assumptions', () => {
    const envelope = createValidEnvelope();

    envelope.artifact.assumptions = [];

    const result = validateBatteryInference(envelope);

    expect(result.valid).toBe(false);

    expect(
      result.issues.some(
        (issue) =>
          issue.code ===
          'READY_INFERENCE_WITHOUT_ASSUMPTIONS',
      ),
    ).toBe(true);
  });

  it('rejects invalid custom workload totals', () => {
    const envelope = createValidEnvelope();

    envelope.artifact.scenario.usageProfile = 'custom';

    envelope.artifact.scenario.workload = {
      webSocialPercent: 40,
      videoPercent: 30,
      gamingPercent: 20,
    };

    const result = validateBatteryInference(envelope);

    expect(result.valid).toBe(false);

    expect(
      result.issues.some(
        (issue) =>
          issue.code === 'INVALID_WORKLOAD_TOTAL',
      ),
    ).toBe(true);
  });

  it('accepts a valid custom workload totaling 100', () => {
    const envelope = createValidEnvelope();

    envelope.artifact.scenario.usageProfile = 'custom';

    envelope.artifact.scenario.workload = {
      webSocialPercent: 40,
      videoPercent: 30,
      gamingPercent: 20,
      cameraPercent: 5,
      idlePercent: 5,
    };

    const result = validateBatteryInference(envelope);

    expect(result.valid).toBe(true);
  });

  it('rejects power output when evidence is insufficient', () => {
    const envelope = createValidEnvelope();

    envelope.artifact.status = 'insufficient_evidence';

    const result = validateBatteryInference(envelope);

    expect(result.valid).toBe(false);

    expect(
      result.issues.some(
        (issue) =>
          issue.code ===
          'POWER_WITH_INSUFFICIENT_EVIDENCE',
      ),
    ).toBe(true);
  });

  it('accepts an honest insufficient-evidence artifact', () => {
    const envelope = createValidEnvelope();

    envelope.artifact.status = 'insufficient_evidence';
    envelope.artifact.averagePowerW = undefined;
    envelope.artifact.confidence = undefined;
    envelope.artifact.assumptions = [];

    envelope.artifact.limitations = [
      'Available evidence does not support this workload.',
    ];

    const result = validateBatteryInference(envelope);

    expect(result.valid).toBe(true);
  });

  it('rejects missing receipt provenance', () => {
    const envelope = createValidEnvelope();

    envelope.receipt.evidenceSnapshotId = '';

    const result = validateBatteryInference(envelope);

    expect(result.valid).toBe(false);

    expect(
      result.issues.some(
        (issue) =>
          issue.code === 'MISSING_EVIDENCE_SNAPSHOT',
      ),
    ).toBe(true);
  });

  it('rejects an invalid receipt timestamp', () => {
    const envelope = createValidEnvelope();

    envelope.receipt.createdAt = 'eventually lol';

    const result = validateBatteryInference(envelope);

    expect(result.valid).toBe(false);

    expect(
      result.issues.some(
        (issue) =>
          issue.code === 'INVALID_INFERENCE_CREATED_AT',
      ),
    ).toBe(true);
  });
});