import {
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import {
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

function evidenceSnapshot(
  measurementIds: string[] = [
    'measurement-001',
  ],
): BatteryEvidenceSnapshot {
  return {
    kind: 'battery-evidence',

    schemaVersion:
      EVIDENCE_SNAPSHOT_SCHEMA_VERSION,

    powerEvidenceVersion:
      'battery-calibration-2.1',

    calibrationDatasetVersion:
      '0.1.0',

    snapshotId:
      'battery-evidence-provenance-test',

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
          ...measurementIds,
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
  artifactEvidenceId =
    'measurement-001',

  assumptionEvidenceIds:
    string[] = [
      artifactEvidenceId,
    ],
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
          artifactEvidenceId,

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
          ...assumptionEvidenceIds,
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
  };
}

function providerReturning(
  output: unknown,
): BatteryInferenceProvider {
  return {
    modelId:
      'test:provenance-model',

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
        return 'artifact-provenance-001';
      },
    },
  });
}

describe(
  'battery inference snapshot provenance',
  () => {
    it('accepts evidence IDs that exist in the frozen snapshot', async () => {
      const result =
        await serviceFor(
          readyArtifact(),
        ).infer({
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
        result.envelope.artifact
          .evidence[0].evidenceId,
      ).toBe(
        'measurement-001',
      );
    });

    it('rejects artifact evidence IDs that do not exist in the frozen snapshot', async () => {
      const result =
        await serviceFor(
          readyArtifact(
            'invented-measurement',
            [
              'invented-measurement',
            ],
          ),
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
          'Expected provenance failure.',
        );
      }

      expect(
        result.issues.some(
          (issue) =>
            issue.includes(
              'invented-measurement',
            ) &&
            issue.includes(
              'frozen evidence snapshot',
            ),
        ),
      ).toBe(true);
    });

    it('rejects assumption evidence IDs that do not exist in the frozen snapshot', async () => {
      const result =
        await serviceFor(
          readyArtifact(
            'measurement-001',
            [
              'invented-measurement',
            ],
          ),
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
          'Expected provenance failure.',
        );
      }

      expect(
        result.issues.some(
          (issue) =>
            issue.includes(
              'invented-measurement',
            ) &&
            issue.includes(
              'frozen evidence snapshot',
            ),
        ),
      ).toBe(true);
    });

    it('does not create trusted receipt metadata when snapshot provenance fails', async () => {
      const now =
        vi.fn(
          () =>
            new Date(
              '2026-09-30T12:00:00.000Z',
            ),
        );

      const createArtifactId =
        vi.fn(
          () =>
            'artifact-provenance-001',
        );

      const service =
        createBatteryInferenceService({
          provider:
            providerReturning(
              readyArtifact(
                'invented-measurement',
                [
                  'invented-measurement',
                ],
              ),
            ),

          clock: {
            now,
          },

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

    it('does not authorize provider evidence when the snapshot contains no measurement IDs', async () => {
      const result =
        await serviceFor(
          readyArtifact(),
        ).infer({
          scenario: scenario(),

          evidence:
            evidenceSnapshot([]),
        });

      expect(result.status).toBe(
        'invalid_provider_output',
      );

      if (
        result.status !==
        'invalid_provider_output'
      ) {
        throw new Error(
          'Expected provenance failure.',
        );
      }

      expect(
        result.issues.some(
          (issue) =>
            issue.includes(
              'measurement-001',
            ),
        ),
      ).toBe(true);
    });
  },
);