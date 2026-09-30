import { describe, expect, it } from 'vitest';

import {
  SIMULATION_INFERENCE_SCHEMA_VERSION,
} from '../src/lib/simulation/inference';

import {
  parseBatteryInference,
} from '../src/lib/simulation/inference-parser';

function validEnvelope(): unknown {
  return {
    artifact: {
      kind: 'battery',

      schemaVersion:
        SIMULATION_INFERENCE_SCHEMA_VERSION,

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
          evidenceId: 'evidence-001',
          title: 'Controlled battery measurement',
          strength: 'calibrated',
          supports:
            'Average scenario power estimate.',
        },
      ],

      assumptions: [
        {
          id: 'average-power',
          label: 'Average scenario power',

          range: {
            min: 2.1,
            max: 2.5,
            unit: 'W',
          },

          confidence: 'medium',

          reasoning:
            'Bounded from comparable evidence.',

          evidenceIds: [
            'evidence-001',
          ],
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
        'Not every workload has direct measurement.',
      ],
    },

    receipt: {
      artifactId: 'artifact-001',

      schemaVersion:
        SIMULATION_INFERENCE_SCHEMA_VERSION,

      inferenceModel: 'test:model',

      promptVersion:
        'battery-inference-0.1.0',

      evidenceSnapshotId:
        'snapshot-001',

      createdAt:
        '2026-09-30T10:00:00.000Z',
    },
  };
}

describe('parseBatteryInference', () => {
  it('accepts a structurally valid envelope', () => {
    const result =
      parseBatteryInference(validEnvelope());

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data.artifact.kind).toBe(
        'battery',
      );

      expect(
        result.data.artifact.averagePowerW,
      ).toEqual({
        min: 2.1,
        max: 2.5,
        unit: 'W',
      });
    }
  });

  it('rejects null', () => {
    expect(
      parseBatteryInference(null).success,
    ).toBe(false);
  });

  it('rejects arrays', () => {
    expect(
      parseBatteryInference([]).success,
    ).toBe(false);
  });

  it('rejects strings', () => {
    expect(
      parseBatteryInference('hello').success,
    ).toBe(false);
  });

  it('does not coerce numeric strings', () => {
    const envelope =
      validEnvelope() as any;

    envelope.artifact.averagePowerW.min =
      '2.1';

    const result =
      parseBatteryInference(envelope);

    expect(result.success).toBe(false);
  });

  it('rejects a missing evidence array', () => {
    const envelope =
      validEnvelope() as any;

    delete envelope.artifact.evidence;

    const result =
      parseBatteryInference(envelope);

    expect(result.success).toBe(false);
  });

  it('rejects malformed nested evidence', () => {
    const envelope =
      validEnvelope() as any;

    envelope.artifact.evidence[0].strength =
      'trust-me-bro';

    const result =
      parseBatteryInference(envelope);

    expect(result.success).toBe(false);
  });

  it('rejects unknown artifact fields', () => {
    const envelope =
      validEnvelope() as any;

    envelope.artifact.secretBrandMultiplier =
      1.37;

    const result =
      parseBatteryInference(envelope);

    expect(result.success).toBe(false);
  });

  it('rejects unknown top-level fields', () => {
    const envelope =
      validEnvelope() as any;

    envelope.modelThoughts =
      'Samsung magic optimization';

    const result =
      parseBatteryInference(envelope);

    expect(result.success).toBe(false);
  });

  it('rejects an unsupported schema version', () => {
    const envelope =
      validEnvelope() as any;

    envelope.artifact.schemaVersion =
      '999.0.0';

    const result =
      parseBatteryInference(envelope);

    expect(result.success).toBe(false);
  });

  it('rejects malformed receipt metadata', () => {
    const envelope =
      validEnvelope() as any;

    envelope.receipt.inferenceModel = 123;

    const result =
      parseBatteryInference(envelope);

    expect(result.success).toBe(false);
  });

  it('rejects malformed workload values', () => {
    const envelope =
      validEnvelope() as any;

    envelope.artifact.scenario.workload = {
      webSocialPercent: '50',
      videoPercent: 50,
    };

    const result =
      parseBatteryInference(envelope);

    expect(result.success).toBe(false);
  });

  it('accepts an insufficient-evidence structure', () => {
    const envelope =
      validEnvelope() as any;

    envelope.artifact.status =
      'insufficient_evidence';

    delete envelope.artifact.averagePowerW;
    delete envelope.artifact.confidence;

    envelope.artifact.assumptions = [];

    const result =
      parseBatteryInference(envelope);

    expect(result.success).toBe(true);
  });

  it('returns useful paths for invalid fields', () => {
    const envelope =
      validEnvelope() as any;

    envelope.artifact.averagePowerW.min =
      'wrong';

    const result =
      parseBatteryInference(envelope);

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(
        result.issues.some(
          (issue) =>
            issue.path ===
            'artifact.averagePowerW.min',
        ),
      ).toBe(true);
    }
  });
});