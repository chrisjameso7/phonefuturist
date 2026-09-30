import {
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import {
  BATTERY_INFERENCE_PROMPT_VERSION,
  createBatteryInferenceService,
  type BatteryInferenceProvider,
} from '../src/lib/simulation/inference-service';

import {
  EVIDENCE_SNAPSHOT_SCHEMA_VERSION,
  type BatteryEvidenceSnapshot,
} from '../src/lib/simulation/evidence-snapshot';

import {
  SIMULATION_INFERENCE_SCHEMA_VERSION,
  type BatteryInferenceArtifact,
  type SimpleBatteryScenario,
} from '../src/lib/simulation/inference';

function scenario(): SimpleBatteryScenario {
  return {
    deviceName: 'Future Phone',
    usageProfile: 'typical',

    brightness: {
      value: 200,
      unit: 'nits',
    },

    network: 'mixed',

    ambientTemperatureC: 25,

    workload: {
      webSocialPercent: 40,
      videoPercent: 25,
      gamingPercent: 10,
      cameraPercent: 5,
      idlePercent: 20,
    },
  };
}

function evidenceSnapshot(): BatteryEvidenceSnapshot {
  return {
    kind: 'battery-evidence',

    schemaVersion:
      EVIDENCE_SNAPSHOT_SCHEMA_VERSION,

    powerEvidenceVersion:
      'battery-calibration-2.1',

    calibrationDatasetVersion:
      '0.1.0',

    snapshotId:
      'battery-evidence-test-snapshot',

    device: {
      name: 'Future Phone',
      energyWh: 20,
      displayAreaCm2: 110,
    },

    resolution: {
      status: 'resolved',
      basis: 'reference-population',

      webPowerW: {
        min: 1.8,
        max: 2.2,
      },

      screenOnBudgetHours: {
        min: 9.09,
        max: 11.11,
      },

      referenceCount: 1,
    },

    protocol: {
      id:
        'notebookcheck_wifi_web_v1_3',

      version: '1.3',

      provider: 'Notebookcheck',

      name:
        'Wi-Fi Web Browsing Test',

      workload:
        'Continuous automated web browsing',

      connectivity: 'wifi',

      brightnessNits: 150,

      brightnessQualifier:
        'approximately',

      powerSavingMeasures:
        'activated',
    },

    workloads: [
      {
        workload: 'web_browsing',
        status: 'reference',

        powerW: {
          min: 1.8,
          max: 2.2,
        },

        note:
          'Reference web evidence.',
      },

      {
        workload: 'video_playback',
        status: 'insufficient',
        note: 'No video evidence.',
      },

      {
        workload: 'gaming',
        status: 'insufficient',
        note: 'No gaming evidence.',
      },

      {
        workload: 'camera_use',
        status: 'insufficient',
        note: 'No camera evidence.',
      },

      {
        workload: 'standby',
        status: 'insufficient',
        note: 'No standby evidence.',
      },
    ],

    references: [
      {
        id: 'reference-phone',
        manufacturer: 'Example',
        model: 'Reference Phone',
        releaseYear: 2026,

        energyWh: 20,
        energyBasis: 'rated',

        runtimeSeconds: 36000,
        screenOnPowerW: 2,

        displayAreaCm2: 110,
        soc: 'Example SoC',

        measurementIds: [
          'measurement-001',
        ],

        protocolId:
          'notebookcheck_wifi_web_v1_3',

        provider: 'Notebookcheck',
      },
    ],

    notes: [
      'Reference evidence snapshot.',
    ],

    assumptions: [
      'Unsupported workloads remain unknown.',
    ],
  };
}

function readyArtifact(
  overrides: Partial<BatteryInferenceArtifact> = {},
): BatteryInferenceArtifact {
  return {
    kind: 'battery',

    schemaVersion:
      SIMULATION_INFERENCE_SCHEMA_VERSION,

    status: 'ready',

    scenario: scenario(),

    evidence: [
      {
        evidenceId:
          'measurement-001',

        title:
          'Reference Phone web runtime',

        strength: 'reference',

        supports:
          'Provides the observed web power anchor.',
      },
    ],

    assumptions: [
      {
        id: 'average-power',

        label:
          'Whole-device average power',

        range: {
          min: 2.2,
          max: 2.8,
          unit: 'W',
        },

        confidence: 'medium',

        reasoning:
          'Estimated from the supplied reference evidence and scenario.',

        evidenceIds: [
          'measurement-001',
        ],
      },
    ],

    averagePowerW: {
      min: 2.2,
      max: 2.8,
      unit: 'W',
    },

    confidence: 'medium',

    factors: [
      'Mixed network use',
    ],

    limitations: [
      'Non-web workloads lack direct calibration.',
    ],

    ...overrides,
  };
}

function providerReturning(
  output: unknown,
  modelId = 'test:model-1',
): BatteryInferenceProvider {
  return {
    modelId,

    async inferBattery() {
      return output;
    },
  };
}

function serviceFor(
  output: unknown,
) {
  return createBatteryInferenceService({
    provider:
      providerReturning(output),

    clock: {
      now() {
        return new Date(
          '2026-09-30T12:00:00.000Z',
        );
      },
    },

    artifactIds: {
      createArtifactId() {
        return 'artifact-test-001';
      },
    },
  });
}

describe(
  'createBatteryInferenceService',
  () => {
    it('accepts a valid provider artifact and creates a trusted receipt', async () => {
      const service =
        serviceFor(
          readyArtifact(),
        );

      const result =
        await service.infer({
          scenario: scenario(),
          evidence:
            evidenceSnapshot(),
        });

      expect(result.status).toBe(
        'ready',
      );

      if (
        result.status !== 'ready'
      ) {
        throw new Error(
          'Expected ready inference.',
        );
      }

      expect(
        result.envelope.receipt,
      ).toEqual({
        artifactId:
          'artifact-test-001',

        schemaVersion:
          SIMULATION_INFERENCE_SCHEMA_VERSION,

        inferenceModel:
          'test:model-1',

        promptVersion:
          BATTERY_INFERENCE_PROMPT_VERSION,

        evidenceSnapshotId:
          'battery-evidence-test-snapshot',

        createdAt:
          '2026-09-30T12:00:00.000Z',
      });
    });

    it('passes the frozen request and contract versions to the provider', async () => {
      const inferBattery =
        vi.fn(
          async () =>
            readyArtifact(),
        );

      const provider:
        BatteryInferenceProvider = {
          modelId:
            'test:model-1',

          inferBattery,
        };

      const service =
        createBatteryInferenceService({
          provider,

          clock: {
            now: () =>
              new Date(
                '2026-09-30T12:00:00.000Z',
              ),
          },

          artifactIds: {
            createArtifactId:
              () =>
                'artifact-test-001',
          },
        });

      const request = {
        scenario: scenario(),
        evidence:
          evidenceSnapshot(),
      };

      await service.infer(request);

      expect(
        inferBattery,
      ).toHaveBeenCalledTimes(1);

      expect(
        inferBattery,
      ).toHaveBeenCalledWith(
        request,
        {
          promptVersion:
            BATTERY_INFERENCE_PROMPT_VERSION,

          schemaVersion:
            SIMULATION_INFERENCE_SCHEMA_VERSION,
        },
      );
    });

    it('does not allow the provider to rewrite the user scenario', async () => {
      const forged =
        readyArtifact({
          scenario: {
            deviceName:
              'Different Phone',

            usageProfile: 'heavy',

            brightness: {
              value: 1000,
              unit: 'nits',
            },

            network: 'cellular',

            workload: {
              webSocialPercent: 100,
            },
          },
        });

      const requested =
        scenario();

      const result =
        await serviceFor(
          forged,
        ).infer({
          scenario: requested,

          evidence:
            evidenceSnapshot(),
        });

      expect(result.status).toBe(
        'ready',
      );

      if (
        result.status !== 'ready'
      ) {
        throw new Error(
          'Expected ready inference.',
        );
      }

      expect(
        result.envelope.artifact
          .scenario,
      ).toEqual(requested);

      expect(
        result.envelope.artifact
          .scenario.deviceName,
      ).toBe('Future Phone');
    });

    it('rejects structurally invalid provider output', async () => {
      const result =
        await serviceFor({
          kind: 'battery',
          schemaVersion:
            SIMULATION_INFERENCE_SCHEMA_VERSION,

          status: 'ready',

          surprise:
            'unknown field',
        }).infer({
          scenario: scenario(),
          evidence:
            evidenceSnapshot(),
        });

      expect(result.status).toBe(
        'invalid_provider_output',
      );

      if (
        result.status !==
        'invalid_provider_output'
      ) {
        throw new Error(
          'Expected invalid provider output.',
        );
      }

      expect(
        result.issues.length,
      ).toBeGreaterThan(0);
    });

    it('fails closed when provider output is structurally valid but semantically invalid', async () => {
      const invalid =
        readyArtifact({
          averagePowerW: {
            min: 3,
            max: 2,
            unit: 'W',
          },
        });

      const result =
        await serviceFor(
          invalid,
        ).infer({
          scenario: scenario(),
          evidence:
            evidenceSnapshot(),
        });

      expect(result.status).toBe(
        'invalid_provider_output',
      );

      if (
        result.status !==
        'invalid_provider_output'
      ) {
        throw new Error(
          'Expected semantic validation failure.',
        );
      }

      expect(
        result.issues.some(
          (issue) =>
            issue.includes(
              'minimum cannot exceed',
            ),
        ),
      ).toBe(true);
    });

    it('preserves a valid insufficient-evidence result without inventing power', async () => {
      const insufficient:
        BatteryInferenceArtifact = {
          kind: 'battery',

          schemaVersion:
            SIMULATION_INFERENCE_SCHEMA_VERSION,

          status:
            'insufficient_evidence',

          scenario: scenario(),

          evidence: [],

          assumptions: [],

          factors: [],

          limitations: [
            'Evidence is insufficient to infer the requested scenario.',
          ],
        };

      const result =
        await serviceFor(
          insufficient,
        ).infer({
          scenario: scenario(),
          evidence:
            evidenceSnapshot(),
        });

      expect(result.status).toBe(
        'insufficient_evidence',
      );

      if (
        result.status !==
        'insufficient_evidence'
      ) {
        throw new Error(
          'Expected insufficient evidence.',
        );
      }

      expect(
        result.envelope.artifact
          .averagePowerW,
      ).toBeUndefined();

      expect(
        result.envelope.artifact
          .confidence,
      ).toBeUndefined();
    });

    it('converts provider exceptions into provider errors', async () => {
      const service =
        createBatteryInferenceService({
          provider: {
            modelId:
              'test:model-1',

            async inferBattery() {
              throw new Error(
                'Provider unavailable',
              );
            },
          },
        });

      const result =
        await service.infer({
          scenario: scenario(),
          evidence:
            evidenceSnapshot(),
        });

      expect(result).toEqual({
        status:
          'provider_error',

        message:
          'Provider unavailable',
      });
    });

    it('does not call receipt factories when provider parsing fails', async () => {
      const now = vi.fn(
        () =>
          new Date(
            '2026-09-30T12:00:00.000Z',
          ),
      );

      const createArtifactId =
        vi.fn(
          () =>
            'artifact-test-001',
        );

      const service =
        createBatteryInferenceService({
          provider:
            providerReturning(null),

          clock: { now },

          artifactIds: {
            createArtifactId,
          },
        });

      const result =
        await service.infer({
          scenario: scenario(),
          evidence:
            evidenceSnapshot(),
        });

      expect(result.status).toBe(
        'invalid_provider_output',
      );

      expect(now).not.toHaveBeenCalled();

      expect(
        createArtifactId,
      ).not.toHaveBeenCalled();
    });
  },
);