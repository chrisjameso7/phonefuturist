import type { VirtualDevice, VirtualParameter } from './virtual-device';

export type AutoEvidenceItem = {
  id: string;
  claim: string;
  kind: 'confirmed' | 'reported' | 'leak' | 'historical' | 'measured' | 'editorial';
  source?: string;
};

export type AutoModelRequest = {
  deviceKey: string;
  deviceName: string;
  evidence: AutoEvidenceItem[];
  intent?: 'balanced' | 'efficiency' | 'performance';
};

export type IntelligenceBundle = {
  device?: {
    id?: string;
    brand?: string;
    name?: string;
    slug?: string;
    category?: string;
    lifecycle?: string;
  };
  claims?: Array<{
    id?: string;
    property_key?: string;
    value?: unknown;
    unit?: string | null;
    provenance?: 'confirmed' | 'reported' | 'estimated';
    confidence?: 'low' | 'medium' | 'high';
    confidence_reason?: string;
    sources?: Array<{
      id?: string;
      label?: string;
      url?: string | null;
      source_type?: string;
      relationship?: 'supports' | 'contradicts' | 'context';
      note?: string;
    }>;
  }>;
};

function compactValue(value: unknown): string {
  try {
    const text = typeof value === 'string' ? value : JSON.stringify(value);
    return (text || '').slice(0, 800);
  } catch {
    return '';
  }
}

/**
 * Convert private editorial intelligence into a small AI-safe evidence list.
 * Private notes never enter this structure.
 */
export function evidenceItemsFromBundle(bundle: IntelligenceBundle): AutoEvidenceItem[] {
  const claims = Array.isArray(bundle.claims) ? bundle.claims : [];
  const items: AutoEvidenceItem[] = [];

  for (const claim of claims.slice(0, 80)) {
    if (!claim?.id || !claim.property_key) continue;
    const value = compactValue(claim.value);
    if (!value) continue;

    const source = (claim.sources ?? []).find(item => item.relationship === 'supports') ?? claim.sources?.[0];
    const kind: AutoEvidenceItem['kind'] =
      claim.provenance === 'confirmed' ? 'confirmed'
      : claim.provenance === 'reported' ? 'reported'
      : 'editorial';

    const confidence = claim.confidence ? ` Confidence: ${claim.confidence}.` : '';
    const reason = claim.confidence_reason ? ` ${claim.confidence_reason}` : '';
    const unit = claim.unit ? ` ${claim.unit}` : '';

    items.push({
      id: claim.id,
      kind,
      claim: `${claim.property_key} = ${value}${unit}.${confidence}${reason}`.slice(0, 2_000),
      ...(source?.label ? { source: source.url ? `${source.label} — ${source.url}` : source.label } : {}),
    });
  }

  return items;
}

type AiRange = {
  min?: number;
  max?: number;
  mostLikely?: number;
  confidence?: number;
  evidenceIds?: string[];
  reasoning?: string;
};

export type AutoModelDraft = {
  battery?: {
    capacityMah?: AiRange;
    nominalVoltageV?: AiRange;
    usablePercent?: AiRange;
  };
  processor?: {
    key?: string;
    cpuPowerLimitW?: AiRange;
    gpuPowerLimitW?: AiRange;
    sustainedPowerLimitW?: AiRange;
  };
  thermals?: {
    ambientTemperatureC?: AiRange;
    thermalResistanceCPerW?: AiRange;
    thermalMassJPerC?: AiRange;
    skinTemperatureLimitC?: AiRange;
  };
  display?: {
    refreshRateHz?: AiRange;
    brightnessNits?: AiRange;
    averagePowerW?: AiRange;
  };
  notes?: string[];
};

const finite = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

function parameter(
  candidate: AiRange | undefined,
  bounds: { min: number; max: number },
): VirtualParameter | undefined {
  if (!candidate) return undefined;

  const min = finite(candidate.min) && candidate.min >= bounds.min && candidate.min <= bounds.max
    ? candidate.min
    : undefined;
  const max = finite(candidate.max) && candidate.max >= bounds.min && candidate.max <= bounds.max
    ? candidate.max
    : undefined;
  const value = finite(candidate.mostLikely) && candidate.mostLikely >= bounds.min && candidate.mostLikely <= bounds.max
    ? candidate.mostLikely
    : undefined;

  if (min !== undefined && max !== undefined && min > max) return undefined;
  if (value === undefined && min === undefined && max === undefined) return undefined;

  const confidence = finite(candidate.confidence)
    ? Math.max(0, Math.min(1, candidate.confidence))
    : undefined;

  return {
    ...(value !== undefined ? { value } : {}),
    ...(min !== undefined || max !== undefined ? { range: { ...(min !== undefined ? { min } : {}), ...(max !== undefined ? { max } : {}) } } : {}),
    provenance: {
      kind: 'modeled',
      ...(candidate.reasoning ? { note: candidate.reasoning.slice(0, 500) } : {}),
    },
    ...(confidence !== undefined ? { confidence } : {}),
    ...(candidate.evidenceIds?.length ? { sourceId: candidate.evidenceIds.slice(0, 8).join(',') } : {}),
  };
}

/**
 * Convert an AI proposal into a bounded Virtual Device.
 * The AI is never trusted directly. Invalid, impossible, or missing values
 * remain unresolved rather than being silently repaired.
 */
export function validateAutoModel(request: AutoModelRequest, draft: AutoModelDraft): VirtualDevice {
  return {
    key: request.deviceKey,
    name: request.deviceName,
    mode: 'auto',
    battery: {
      capacityMah: parameter(draft.battery?.capacityMah, { min: 100, max: 20_000 }),
      nominalVoltageV: parameter(draft.battery?.nominalVoltageV, { min: 2.5, max: 5.5 }),
      usablePercent: parameter(draft.battery?.usablePercent, { min: 50, max: 100 }),
    },
    processor: {
      key: typeof draft.processor?.key === 'string' ? draft.processor.key.slice(0, 120) : undefined,
      cpuPowerLimitW: parameter(draft.processor?.cpuPowerLimitW, { min: 0.1, max: 30 }),
      gpuPowerLimitW: parameter(draft.processor?.gpuPowerLimitW, { min: 0.1, max: 30 }),
      sustainedPowerLimitW: parameter(draft.processor?.sustainedPowerLimitW, { min: 0.1, max: 40 }),
    },
    thermals: {
      ambientTemperatureC: parameter(draft.thermals?.ambientTemperatureC, { min: -30, max: 60 }),
      thermalResistanceCPerW: parameter(draft.thermals?.thermalResistanceCPerW, { min: 0.01, max: 50 }),
      thermalMassJPerC: parameter(draft.thermals?.thermalMassJPerC, { min: 0.1, max: 10_000 }),
      skinTemperatureLimitC: parameter(draft.thermals?.skinTemperatureLimitC, { min: 25, max: 65 }),
    },
    display: {
      refreshRateHz: parameter(draft.display?.refreshRateHz, { min: 1, max: 500 }),
      brightnessNits: parameter(draft.display?.brightnessNits, { min: 1, max: 10_000 }),
      averagePowerW: parameter(draft.display?.averagePowerW, { min: 0.01, max: 20 }),
    },
  };
}

export const AUTO_MODEL_JSON_SCHEMA = {
  type: 'object',
  properties: {
    battery: {
      type: 'object',
      properties: {
        capacityMah: { $ref: '#/$defs/range' },
        nominalVoltageV: { $ref: '#/$defs/range' },
        usablePercent: { $ref: '#/$defs/range' },
      },
    },
    processor: {
      type: 'object',
      properties: {
        key: { type: 'string' },
        cpuPowerLimitW: { $ref: '#/$defs/range' },
        gpuPowerLimitW: { $ref: '#/$defs/range' },
        sustainedPowerLimitW: { $ref: '#/$defs/range' },
      },
    },
    thermals: {
      type: 'object',
      properties: {
        ambientTemperatureC: { $ref: '#/$defs/range' },
        thermalResistanceCPerW: { $ref: '#/$defs/range' },
        thermalMassJPerC: { $ref: '#/$defs/range' },
        skinTemperatureLimitC: { $ref: '#/$defs/range' },
      },
    },
    display: {
      type: 'object',
      properties: {
        refreshRateHz: { $ref: '#/$defs/range' },
        brightnessNits: { $ref: '#/$defs/range' },
        averagePowerW: { $ref: '#/$defs/range' },
      },
    },
    notes: { type: 'array', maxItems: 12, items: { type: 'string' } },
  },
  $defs: {
    range: {
      type: 'object',
      properties: {
        min: { type: 'number' },
        max: { type: 'number' },
        mostLikely: { type: 'number' },
        confidence: { type: 'number', minimum: 0, maximum: 1 },
        evidenceIds: { type: 'array', maxItems: 8, items: { type: 'string' } },
        reasoning: { type: 'string' },
      },
    },
  },
} as const;

export function autoModelPrompt(request: AutoModelRequest): string {
  const evidence = request.evidence
    .slice(0, 80)
    .map(item => `[${item.id}] ${item.kind}: ${item.claim}${item.source ? ` (source: ${item.source})` : ''}`)
    .join('\n');

  return `You are the inference layer for PhoneFuturist Interactive Leaks.

Build a cautious engineering hypothesis for the virtual device named "${request.deviceName}".
Intent: ${request.intent ?? 'balanced'}.

Rules:
1. Use ONLY the evidence below plus general physical/engineering relationships. Do not use memorized final benchmark or battery-test answers for this target device.
2. Every inferred parameter must cite evidence IDs from the supplied list.
3. If evidence cannot support a parameter, OMIT it. Never fill a field just because the schema contains it.
4. Confidence is epistemic confidence from 0 to 1, not marketing confidence.
5. Give ranges when uncertainty is meaningful. mostLikely may be included inside the range.
6. Do not invent benchmark scores. This pass builds device parameters, not final performance results.
7. Keep reasoning concise and engineering-focused.

Evidence:
${evidence || '[none supplied]'}`;
}
