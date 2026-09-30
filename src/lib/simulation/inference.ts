/**
 * PhoneFuturist Interactive Leaks
 * AI-assisted simulation inference contract.
 *
 * This layer sits above the deterministic simulation engine.
 *
 * It may interpret evidence and produce bounded assumptions,
 * but it must never perform the final simulation calculation.
 */

export const SIMULATION_INFERENCE_SCHEMA_VERSION = '0.1.0';

export type InferenceConfidence =
  | 'low'
  | 'medium'
  | 'high';

export type EvidenceStrength =
  | 'confirmed'
  | 'measured'
  | 'calibrated'
  | 'reference'
  | 'reported'
  | 'estimated';

export type SimpleUsageProfile =
  | 'light'
  | 'typical'
  | 'heavy'
  | 'custom';

export type NetworkEnvironment =
  | 'wifi'
  | 'mixed'
  | 'cellular';

export interface InferenceRange {
  min: number;
  max: number;
  unit: string;
}

export interface InferenceEvidenceReference {
  /**
   * Stable identifier from the PhoneFuturist evidence store.
   */
  evidenceId: string;

  title: string;

  strength: EvidenceStrength;

  /**
   * Optional public source URL.
   */
  sourceUrl?: string;

  /**
   * What this evidence is actually being used to support.
   */
  supports: string;
}

export interface SimpleBatteryScenario {
  /**
   * Human-readable device identity.
   *
   * This is context, not a source of hidden brand multipliers.
   */
  deviceName?: string;

  usageProfile: SimpleUsageProfile;

  brightness?: {
    value: number;
    unit: 'nits';
  };

  network?: NetworkEnvironment;

  ambientTemperatureC?: number;

  /**
   * Custom workload distribution.
   *
   * Percentages should total 100 when supplied.
   */
  workload?: {
    webSocialPercent?: number;
    videoPercent?: number;
    gamingPercent?: number;
    cameraPercent?: number;
    idlePercent?: number;
  };
}

/**
 * A single bounded assumption produced by the inference layer.
 *
 * Every material inferred value must expose:
 * - its range
 * - confidence
 * - reasoning
 * - supporting evidence
 */
export interface InferredAssumption {
  id: string;

  label: string;

  range: InferenceRange;

  confidence: InferenceConfidence;

  reasoning: string;

  evidenceIds: string[];
}

/**
 * Battery-specific artifact produced by the inference layer.
 *
 * This is NOT the final battery result.
 *
 * It describes model inputs that a deterministic battery/endurance
 * calculation may consume.
 */
export interface BatteryInferenceArtifact {
  kind: 'battery';

  schemaVersion: typeof SIMULATION_INFERENCE_SCHEMA_VERSION;

  status:
    | 'ready'
    | 'insufficient_evidence';

  scenario: SimpleBatteryScenario;

  /**
   * Evidence frozen for this inference run.
   */
  evidence: InferenceEvidenceReference[];

  /**
   * Bounded assumptions generated from the evidence.
   */
  assumptions: InferredAssumption[];

  /**
   * Estimated device power for the requested scenario.
   *
   * The deterministic layer may later combine this with known
   * battery energy to calculate endurance.
   *
   * This must remain absent when evidence is insufficient.
   */
  averagePowerW?: InferenceRange;

  confidence?: InferenceConfidence;

  /**
   * Plain-language explanation of the major factors affecting
   * the inferred power range.
   */
  factors: string[];

  /**
   * Explicit limitations and unresolved questions.
   */
  limitations: string[];
}

/**
 * Metadata required to reproduce or audit an inference run.
 *
 * Saved simulations should persist this receipt rather than
 * silently re-running inference later.
 */
export interface SimulationInferenceReceipt {
  artifactId: string;

  schemaVersion: typeof SIMULATION_INFERENCE_SCHEMA_VERSION;

  /**
   * Provider/model identifier used to interpret the evidence.
   *
   * Example:
   * provider:model-version
   *
   * This is metadata only and must not be trusted as simulation
   * evidence.
   */
  inferenceModel: string;

  /**
   * Version of the system prompt/inference instructions.
   */
  promptVersion: string;

  /**
   * Stable identifier for the frozen evidence set.
   */
  evidenceSnapshotId: string;

  createdAt: string;
}

export interface BatteryInferenceEnvelope {
  artifact: BatteryInferenceArtifact;

  receipt: SimulationInferenceReceipt;
}