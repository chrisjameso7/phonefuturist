import type {
  BatteryInferenceEnvelope,
  InferenceConfidence,
} from './inference';

import {
  validateBatteryInference,
} from './inference-validator';

import {
  simulateBatteryExperience,
  type BatteryExperienceCalculation,
  type BatteryExperienceInput,
} from './modules/battery-experience';

import type {
  ModelParameterInput,
  ModelProvenance,
} from './modules/modeling';

export interface BatteryInferenceAdapterInput {
  envelope: BatteryInferenceEnvelope;

  /**
   * Total rated pack energy from the deterministic battery module
   * or another explicitly supplied source.
   */
  totalEnergyWh: ModelParameterInput;

  /**
   * Optional usable-energy percentage.
   *
   * This is intentionally not invented by the inference adapter.
   * When absent, battery-experience.ts retains its existing
   * full-rated-pack assumption and reports that limitation.
   */
  usablePercent?: ModelParameterInput;
}

export type BatteryInferenceAdapterResult =
  | {
      status: 'resolved';
      calculation: BatteryExperienceCalculation;
      input: BatteryExperienceInput;
    }
  | {
      status: 'insufficient_evidence';
      limitations: string[];
    }
  | {
      status: 'invalid_inference';
      issues: string[];
    };

function inferenceProvenance(
  envelope: BatteryInferenceEnvelope,
): ModelProvenance {
  return {
    kind: 'modeled',
    note: [
      'AI-assisted scenario inference.',
      `Artifact ${envelope.receipt.artifactId}.`,
      `Model ${envelope.receipt.inferenceModel}.`,
      `Evidence snapshot ${envelope.receipt.evidenceSnapshotId}.`,
    ].join(' '),
  };
}

function powerParameter(
  min: number,
  max: number,
  provenance: ModelProvenance,
): ModelParameterInput {
  if (min === max) {
    return {
      value: min,
      provenance,
    };
  }

  return {
    range: {
      min,
      max,
    },
    provenance,
  };
}

export function adaptBatteryInference(
  adapterInput: BatteryInferenceAdapterInput,
): BatteryInferenceAdapterResult {
  const { envelope } = adapterInput;

  const validation =
    validateBatteryInference(envelope);

  if (!validation.valid) {
    return {
      status: 'invalid_inference',
      issues: validation.issues.map(
        (issue) =>
          issue.path
            ? `${issue.path}: ${issue.message}`
            : issue.message,
      ),
    };
  }

  const { artifact } = envelope;

  if (
    artifact.status === 'insufficient_evidence'
  ) {
    return {
      status: 'insufficient_evidence',
      limitations: [...artifact.limitations],
    };
  }

  if (!artifact.averagePowerW) {
    return {
      status: 'invalid_inference',
      issues: [
        'Ready battery inference is missing averagePowerW.',
      ],
    };
  }

  const provenance =
    inferenceProvenance(envelope);

  const wholeDevicePower =
    powerParameter(
      artifact.averagePowerW.min,
      artifact.averagePowerW.max,
      provenance,
    );

  const batteryInput: BatteryExperienceInput = {
    energy: {
      totalEnergyWh:
        adapterInput.totalEnergyWh,

      ...(adapterInput.usablePercent !==
      undefined
        ? {
            usablePercent:
              adapterInput.usablePercent,
          }
        : {}),
    },

    workloads: {
      mixed_use: {
        subsystems: {
          workloadSpecific: {
            whole_device:
              wholeDevicePower,
          },
        },
      },
    },

    workloadOrder: [
      'mixed_use',
    ],
  };

  return {
    status: 'resolved',
    input: batteryInput,
    calculation:
      simulateBatteryExperience(
        batteryInput,
      ),
  };
}

/**
 * Maps inference confidence into the terminology used by the
 * battery experience layer without pretending that AI-derived
 * assumptions are deterministic measurements.
 *
 * This is metadata only. It does not override the battery
 * engine's independently calculated confidence.
 */
export function describeInferenceConfidence(
  confidence: InferenceConfidence,
): string {
  switch (confidence) {
    case 'high':
      return 'High model confidence';
    case 'medium':
      return 'Moderate model confidence';
    case 'low':
      return 'Low model confidence';
  }
}