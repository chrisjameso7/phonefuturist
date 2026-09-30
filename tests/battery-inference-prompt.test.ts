import {
  describe,
  expect,
  it,
} from 'vitest';

import {
  buildBatteryInferencePrompt,
} from '../src/lib/simulation/battery-inference-prompt';

import {
  EVIDENCE_SNAPSHOT_SCHEMA_VERSION,
  type BatteryEvidenceSnapshot,
} from '../src/lib/simulation/evidence-snapshot';

import {
  SIMULATION_INFERENCE_SCHEMA_VERSION,
  type SimpleBatteryScenario,
} from '../src/lib/simulation/inference';

import {
  BATTERY_INFERENCE_PROMPT_VERSION,
} from '../src/lib/simulation/inference-service';

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

function snapshot(): BatteryEvidenceSnapshot {
  return {
    kind: 'battery-evidence',

    schemaVersion:
      EVIDENCE_SNAPSHOT_SCHEMA_VERSION,

    powerEvidenceVersion:
      'battery-calibration-2.1',

    calibrationDatasetVersion:
      '0.1.0',

    snapshotId:
      'battery-evidence-test',

    device: {
      name: 'Future Phone',
      energyWh: 20,
      displayAreaCm2: 110,
    },

    resolution: {
      status: 'resolved',

      basis:
        'reference-population',

      webPowerW: {
        min: 1.8,
        max: 2.2,
      },

      screenOnBudgetHours: {
        min: 9,
        max: 11,
      },

      referenceCount: 1,
    },

    protocol: {
      id: 'web-protocol',

      version: '1.0',

      provider: 'Test Lab',

      name: 'Web test',

      workload:
        'Continuous web browsing',

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
          'Measured reference evidence.',
      },

      {
        workload: 'video_playback',

        status: 'insufficient',

        note:
          'No video evidence.',
      },

      {
        workload: 'gaming',

        status: 'insufficient',

        note:
          'No gaming evidence.',
      },

      {
        workload: 'camera_use',

        status: 'insufficient',

        note:
          'No camera evidence.',
      },

      {
        workload: 'standby',

        status: 'insufficient',

        note:
          'No standby evidence.',
      },
    ],

    references: [
      {
        id: 'reference-1',

        manufacturer:
          'Example',

        model:
          'Reference Phone',

        releaseYear: 2026,

        energyWh: 20,

        energyBasis: 'rated',

        runtimeSeconds: 36000,

        screenOnPowerW: 2,

        displayAreaCm2: 110,

        soc: 'Example SoC',

        measurementIds: [
          'measurement-001',
          'measurement-002',
        ],

        protocolId:
          'web-protocol',

        provider:
          'Test Lab',
      },
    ],

    notes: [
      'Frozen test evidence.',
    ],

    assumptions: [
      'Unsupported workloads remain unknown.',
    ],
  };
}

describe(
  'buildBatteryInferencePrompt',
  () => {
    it('includes the exact requested scenario', () => {
      const result =
        buildBatteryInferencePrompt({
          scenario: scenario(),
          evidence: snapshot(),
        });

      expect(result.user).toContain(
        '"deviceName":"Future Phone"',
      );

      expect(result.user).toContain(
        '"usageProfile":"typical"',
      );

      expect(result.user).toContain(
        '"webSocialPercent":40',
      );
    });

    it('includes the frozen evidence snapshot', () => {
      const result =
        buildBatteryInferencePrompt({
          scenario: scenario(),
          evidence: snapshot(),
        });

      expect(result.user).toContain(
        '"snapshotId":"battery-evidence-test"',
      );

      expect(result.user).toContain(
        '"measurement-001"',
      );

      expect(result.user).toContain(
        '"measurement-002"',
      );
    });

    it('publishes the current inference and prompt versions', () => {
      const result =
        buildBatteryInferencePrompt({
          scenario: scenario(),
          evidence: snapshot(),
        });

      expect(result.system).toContain(
        SIMULATION_INFERENCE_SCHEMA_VERSION,
      );

      expect(result.system).toContain(
        BATTERY_INFERENCE_PROMPT_VERSION,
      );
    });

    it('explicitly forbids web browsing and hidden brand multipliers', () => {
      const result =
        buildBatteryInferencePrompt({
          scenario: scenario(),
          evidence: snapshot(),
        });

      expect(result.system).toContain(
        'Do not browse the web.',
      );

      expect(result.system).toContain(
        'Never apply hidden brand multipliers.',
      );
    });

    it('forbids final endurance calculation', () => {
      const result =
        buildBatteryInferencePrompt({
          scenario: scenario(),
          evidence: snapshot(),
        });

      expect(result.system).toContain(
        'Do not calculate final battery life',
      );
    });

    it('requires insufficient evidence instead of fabricated precision', () => {
      const result =
        buildBatteryInferencePrompt({
          scenario: scenario(),
          evidence: snapshot(),
        });

      expect(result.system).toContain(
        'return insufficient_evidence',
      );

      expect(result.system).toContain(
        'do not manufacture assumptions',
      );
    });

    it('exposes only frozen measurement IDs as allowed evidence IDs', () => {
      const result =
        buildBatteryInferencePrompt({
          scenario: scenario(),
          evidence: snapshot(),
        });

      const allowedSection =
        result.user.split(
          'ALLOWED EVIDENCE IDS',
        )[1];

      expect(allowedSection).toContain(
        '"evidenceId":"measurement-001"',
      );

      expect(allowedSection).toContain(
        '"evidenceId":"measurement-002"',
      );

      expect(allowedSection).not.toContain(
        '"evidenceId":"invented-measurement"',
      );
    });

    it('requires artifact-only JSON without a receipt', () => {
      const result =
        buildBatteryInferencePrompt({
          scenario: scenario(),
          evidence: snapshot(),
        });

      expect(result.system).toContain(
        'Return JSON only.',
      );

      expect(result.system).toContain(
        'Do not return a receipt.',
      );

      expect(result.system).toContain(
        'Do not return markdown.',
      );
    });
  },
);