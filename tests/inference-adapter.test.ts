import { describe, expect, it } from 'vitest';

import type {
  BatteryInferenceEnvelope,
} from '../src/lib/simulation/inference';

import {
  adaptBatteryInference,
  describeInferenceConfidence,
} from '../src/lib/simulation/inference-adapter';

function readyEnvelope(): BatteryInferenceEnvelope {
  return {
    artifact: {
      kind: 'battery',
      schemaVersion: '0.1.0',
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
            'Average whole-device power estimate.',
        },
      ],

      assumptions: [
        {
          id: 'average-power',
          label: 'Average scenario power',
          range: {
            min: 2,
            max: 2.5,
            unit: 'W',
          },
          confidence: 'medium',
          reasoning:
            'Bounded from comparable evidence.',
          evidenceIds: ['evidence-001'],
        },
      ],

      averagePowerW: {
        min: 2,
        max: 2.5,
        unit: 'W',
      },

      confidence: 'medium',

      factors: [
        'Display brightness',
        'Network conditions',
      ],

      limitations: [
        'Some workload behavior is inferred.',
      ],
    },

    receipt: {
      artifactId: 'artifact-001',
      schemaVersion: '0.1.0',
      inferenceModel: 'test:model',
      promptVersion: 'battery-inference-0.1.0',
      evidenceSnapshotId: 'snapshot-001',
      createdAt: '2026-09-30T10:00:00.000Z',
    },
  };
}

describe('adaptBatteryInference', () => {
  it('feeds inferred whole-device power into the existing battery engine', () => {
    const result = adaptBatteryInference({
      envelope: readyEnvelope(),
      totalEnergyWh: 20,
    });

    expect(result.status).toBe('resolved');

    if (result.status !== 'resolved') {
      throw new Error(
        'Expected resolved inference.',
      );
    }

    expect(
      result.input.workloads.mixed_use
        ?.subsystems.workloadSpecific
        ?.whole_device,
    ).toEqual({
      range: {
        min: 2,
        max: 2.5,
      },
      provenance: expect.objectContaining({
        kind: 'modeled',
      }),
    });

    expect(
      result.calculation.result.status,
    ).toBe('resolved');
  });

  it('uses the existing deterministic engine for runtime math', () => {
    const result = adaptBatteryInference({
      envelope: readyEnvelope(),
      totalEnergyWh: 20,
      usablePercent: 100,
    });

    expect(result.status).toBe('resolved');

    if (result.status !== 'resolved') {
      throw new Error(
        'Expected resolved inference.',
      );
    }

    const runtime =
      result.calculation.result.estimate
        ?.runtimeHours;

    expect(runtime?.min).toBeCloseTo(8);
    expect(runtime?.max).toBeCloseTo(10);
  });

  it('preserves explicit usable-energy input', () => {
    const result = adaptBatteryInference({
      envelope: readyEnvelope(),
      totalEnergyWh: 20,
      usablePercent: 90,
    });

    expect(result.status).toBe('resolved');

    if (result.status !== 'resolved') {
      throw new Error(
        'Expected resolved inference.',
      );
    }

    expect(
      result.input.energy.usablePercent,
    ).toBe(90);

    const runtime =
      result.calculation.result.estimate
        ?.runtimeHours;

    expect(runtime?.min).toBeCloseTo(7.2);
    expect(runtime?.max).toBeCloseTo(9);
  });

  it('does not invent a usable-energy percentage', () => {
    const result = adaptBatteryInference({
      envelope: readyEnvelope(),
      totalEnergyWh: 20,
    });

    expect(result.status).toBe('resolved');

    if (result.status !== 'resolved') {
      throw new Error(
        'Expected resolved inference.',
      );
    }

    expect(
      result.input.energy.usablePercent,
    ).toBeUndefined();
  });

  it('preserves inference provenance', () => {
    const result = adaptBatteryInference({
      envelope: readyEnvelope(),
      totalEnergyWh: 20,
    });

    expect(result.status).toBe('resolved');

    if (result.status !== 'resolved') {
      throw new Error(
        'Expected resolved inference.',
      );
    }

    const parameter =
      result.input.workloads.mixed_use
        ?.subsystems.workloadSpecific
        ?.whole_device;

    expect(parameter).toEqual(
      expect.objectContaining({
        provenance: expect.objectContaining({
          kind: 'modeled',
          note: expect.stringContaining(
            'artifact-001',
          ),
        }),
      }),
    );
  });

  it('does not run the battery engine when evidence is insufficient', () => {
    const envelope = readyEnvelope();

    envelope.artifact.status =
      'insufficient_evidence';

    delete envelope.artifact.averagePowerW;
    delete envelope.artifact.confidence;

    envelope.artifact.assumptions = [];

    const result = adaptBatteryInference({
      envelope,
      totalEnergyWh: 20,
    });

    expect(result).toEqual({
      status: 'insufficient_evidence',
      limitations: [
        'Some workload behavior is inferred.',
      ],
    });
  });

  it('fails closed when semantic validation fails', () => {
    const envelope = readyEnvelope();

    envelope.artifact.assumptions[0]
      .evidenceIds = ['missing-evidence'];

    const result = adaptBatteryInference({
      envelope,
      totalEnergyWh: 20,
    });

    expect(result.status).toBe(
      'invalid_inference',
    );

    if (
      result.status === 'invalid_inference'
    ) {
      expect(
        result.issues.length,
      ).toBeGreaterThan(0);
    }
  });

  it('keeps inference confidence as separate metadata', () => {
    const envelope = readyEnvelope();

    const result = adaptBatteryInference({
      envelope,
      totalEnergyWh: 20,
    });

    expect(result.status).toBe('resolved');

    if (result.status !== 'resolved') {
      throw new Error(
        'Expected resolved inference.',
      );
    }

    expect(
      envelope.artifact.confidence,
    ).toBe('medium');

    expect(
      describeInferenceConfidence(
        envelope.artifact.confidence!,
      ),
    ).toBe('Moderate model confidence');

    /*
     * The battery engine independently computes its own
     * confidence. Its label may coincidentally also be
     * "moderate"; that does not mean the inference confidence
     * was copied into it.
     */
    expect(
      result.calculation.result.confidence,
    ).toBeDefined();
  });

  it('describes all inference confidence levels', () => {
    expect(
      describeInferenceConfidence('high'),
    ).toBe('High model confidence');

    expect(
      describeInferenceConfidence('medium'),
    ).toBe('Moderate model confidence');

    expect(
      describeInferenceConfidence('low'),
    ).toBe('Low model confidence');
  });
});