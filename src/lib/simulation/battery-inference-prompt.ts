import type {
  BatteryEvidenceSnapshot,
} from './evidence-snapshot';

import {
  SIMULATION_INFERENCE_SCHEMA_VERSION,
  type SimpleBatteryScenario,
} from './inference';

import {
  BATTERY_INFERENCE_PROMPT_VERSION,
} from './inference-service';

export interface BatteryInferencePromptInput {
  scenario: SimpleBatteryScenario;
  evidence: BatteryEvidenceSnapshot;
}

export interface BatteryInferencePrompt {
  system: string;
  user: string;
}

interface AllowedEvidenceItem {
  evidenceId: string;
  title: string;
  source: string;
}

function allowedEvidenceItems(
  snapshot: BatteryEvidenceSnapshot,
): AllowedEvidenceItem[] {
  return snapshot.references.flatMap(
    (reference) =>
      reference.measurementIds.map(
        (measurementId) => ({
          evidenceId: measurementId,

          title:
            `${reference.manufacturer} ${reference.model} battery measurement`,

          source: reference.provider,
        }),
      ),
  );
}

function stableSerialize(
  value: unknown,
): string {
  if (
    value === null ||
    typeof value !== 'object'
  ) {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value
      .map(stableSerialize)
      .join(',')}]`;
  }

  const record =
    value as Record<string, unknown>;

  return `{${Object.keys(record)
    .sort()
    .map(
      (key) =>
        `${JSON.stringify(
          key,
        )}:${stableSerialize(
          record[key],
        )}`,
    )
    .join(',')}}`;
}

export function buildBatteryInferencePrompt(
  input: BatteryInferencePromptInput,
): BatteryInferencePrompt {
  const allowedEvidence =
    allowedEvidenceItems(
      input.evidence,
    );

  const system = [
    'You are the battery inference layer for PhoneFuturist Interactive Leaks.',
    '',
    'Your job is narrow.',
    '',
    'Interpret the supplied frozen evidence snapshot and requested battery scenario.',
    'Produce bounded, evidence-backed assumptions that may be consumed by a separate deterministic battery simulation engine.',
    '',
    'You are NOT the final simulation engine.',
    'Do not calculate final battery life, endurance, screen-on time, runtime, or a final device score.',
    '',
    `Inference schema version: ${SIMULATION_INFERENCE_SCHEMA_VERSION}`,
    `Prompt version: ${BATTERY_INFERENCE_PROMPT_VERSION}`,
    '',
    'EVIDENCE RULES',
    '',
    '1. Use only evidence contained in the supplied frozen evidence snapshot.',
    '2. Do not browse the web.',
    '3. Do not rely on hidden knowledge about a manufacturer, operating system, chipset, device family, or brand.',
    '4. Do not invent benchmark results, measurements, source URLs, protocols, or evidence IDs.',
    '5. Device and brand names are context only. Never apply hidden brand multipliers.',
    '6. Treat unsupported workloads as unsupported. Do not silently convert missing evidence into measured evidence.',
    '7. Distinguish measured or reference evidence from model-derived assumptions.',
    '8. If the available evidence cannot support a defensible whole-device average-power range for the requested scenario, return insufficient_evidence.',
    '',
    'INFERENCE RULES',
    '',
    '1. Material inferred values must be bounded ranges, not fake point precision.',
    '2. Every material assumption must include reasoning, confidence, and at least one valid evidence ID.',
    '3. averagePowerW represents inferred whole-device average electrical power for the requested scenario.',
    '4. averagePowerW must use unit "W".',
    '5. Do not decompose whole-device power into CPU, GPU, display, modem, memory, camera, or other subsystem values unless the supplied evidence directly supports that decomposition.',
    '6. Do not invent usable battery percentage, battery degradation, thermal derating, software efficiency, standby drain, or workload power measurements.',
    '7. You may reason about uncertainty caused by protocol mismatch, brightness mismatch, connectivity mismatch, workload mismatch, reference-device differences, or incomplete evidence, but uncertainty must widen or weaken the inference rather than create unsupported precision.',
    '8. Do not change the requested scenario. Return it exactly as supplied.',
    '',
    'INSUFFICIENT EVIDENCE',
    '',
    'Return status "insufficient_evidence" when a defensible whole-device average-power range cannot be inferred.',
    'When status is "insufficient_evidence":',
    '- omit averagePowerW',
    '- omit confidence',
    '- explain the missing evidence in limitations',
    '- do not manufacture assumptions merely to produce a result',
    '',
    'READY OUTPUT',
    '',
    'When status is "ready":',
    '- averagePowerW is required',
    '- confidence is required',
    '- at least one evidence item is required',
    '- at least one evidence-backed assumption is required',
    '',
    'OUTPUT CONTRACT',
    '',
    'Return JSON only.',
    'Return one battery inference artifact only.',
    'Do not return a receipt.',
    'Do not return markdown.',
    'Do not return commentary before or after the JSON.',
    'Do not add fields outside the schema.',
    '',
    'Required artifact shape:',
    stableSerialize({
      kind: 'battery',

      schemaVersion:
        SIMULATION_INFERENCE_SCHEMA_VERSION,

      status:
        'ready | insufficient_evidence',

      scenario:
        'EXACT_REQUEST_SCENARIO',

      evidence: [
        {
          evidenceId:
            'ALLOWED_EVIDENCE_ID',

          title:
            'Human-readable evidence title',

          strength:
            'confirmed | measured | calibrated | reference | reported | estimated',

          supports:
            'What this evidence supports',
        },
      ],

      assumptions: [
        {
          id:
            'stable-assumption-id',

          label:
            'Assumption label',

          range: {
            min: 0,
            max: 0,
            unit: 'appropriate unit',
          },

          confidence:
            'low | medium | high',

          reasoning:
            'Evidence-grounded reasoning',

          evidenceIds: [
            'ALLOWED_EVIDENCE_ID',
          ],
        },
      ],

      averagePowerW: {
        min: 0,
        max: 0,
        unit: 'W',
      },

      confidence:
        'low | medium | high',

      factors: [
        'Major factor',
      ],

      limitations: [
        'Explicit limitation',
      ],
    }),
  ].join('\n');

  const user = [
    'REQUESTED SCENARIO',
    stableSerialize(
      input.scenario,
    ),
    '',
    'FROZEN EVIDENCE SNAPSHOT',
    stableSerialize(
      input.evidence,
    ),
    '',
    'ALLOWED EVIDENCE IDS',
    stableSerialize(
      allowedEvidence,
    ),
    '',
    'Produce the battery inference artifact.',
  ].join('\n');

  return {
    system,
    user,
  };
}