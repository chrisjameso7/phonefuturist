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
  dimensions?: {
    widthMm?: AiRange;
    heightMm?: AiRange;
    thicknessMm?: AiRange;
    weightG?: AiRange;
  };
  battery?: {
    capacityMah?: AiRange;
    nominalVoltageV?: AiRange;
    usablePercent?: AiRange;
    widthMm?: AiRange;
    heightMm?: AiRange;
    thicknessMm?: AiRange;
    weightG?: AiRange;
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
    diagonalInches?: AiRange;
    resolutionWidthPx?: AiRange;
    resolutionHeightPx?: AiRange;
    aspectWidth?: AiRange;
    aspectHeight?: AiRange;
    bezelTopMm?: AiRange;
    bezelRightMm?: AiRange;
    bezelBottomMm?: AiRange;
    bezelLeftMm?: AiRange;
    refreshRateHz?: AiRange;
    brightnessNits?: AiRange;
    averagePowerW?: AiRange;
  };
  cameras?: Array<{
    type?: 'wide' | 'ultrawide' | 'telephoto' | 'periscope' | 'front' | 'other';
    sensorFormatDenominator?: AiRange;
    resolutionMp?: AiRange;
    equivalentFocalLengthMm?: AiRange;
    physicalFocalLengthMm?: AiRange;
    apertureFNumber?: AiRange;
    moduleWidthMm?: AiRange;
    moduleHeightMm?: AiRange;
    moduleDepthMm?: AiRange;
  }>;
  packaging?: {
    reservedVolumePercent?: AiRange;
    thermalMm3?: AiRange;
    boardMm3?: AiRange;
    speakersMm3?: AiRange;
    otherMm3?: AiRange;
  };
  usagePower?: {
    webBrowsingW?: AiRange;
    videoPlaybackW?: AiRange;
    gamingW?: AiRange;
    cameraUseW?: AiRange;
    standbyW?: AiRange;
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
    dimensions: {
      widthMm: parameter(draft.dimensions?.widthMm, { min: 40, max: 120 }),
      heightMm: parameter(draft.dimensions?.heightMm, { min: 80, max: 220 }),
      thicknessMm: parameter(draft.dimensions?.thicknessMm, { min: 3, max: 30 }),
      weightG: parameter(draft.dimensions?.weightG, { min: 50, max: 700 }),
    },
    battery: {
      capacityMah: parameter(draft.battery?.capacityMah, { min: 100, max: 20_000 }),
      nominalVoltageV: parameter(draft.battery?.nominalVoltageV, { min: 2.5, max: 5.5 }),
      usablePercent: parameter(draft.battery?.usablePercent, { min: 50, max: 100 }),
      widthMm: parameter(draft.battery?.widthMm, { min: 10, max: 120 }),
      heightMm: parameter(draft.battery?.heightMm, { min: 10, max: 180 }),
      thicknessMm: parameter(draft.battery?.thicknessMm, { min: 1, max: 20 }),
      weightG: parameter(draft.battery?.weightG, { min: 5, max: 250 }),
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
      diagonalInches: parameter(draft.display?.diagonalInches, { min: 2, max: 20 }),
      resolutionWidthPx: parameter(draft.display?.resolutionWidthPx, { min: 100, max: 10000 }),
      resolutionHeightPx: parameter(draft.display?.resolutionHeightPx, { min: 100, max: 15000 }),
      aspectWidth: parameter(draft.display?.aspectWidth, { min: 1, max: 100 }),
      aspectHeight: parameter(draft.display?.aspectHeight, { min: 1, max: 100 }),
      bezelTopMm: parameter(draft.display?.bezelTopMm, { min: 0, max: 30 }),
      bezelRightMm: parameter(draft.display?.bezelRightMm, { min: 0, max: 30 }),
      bezelBottomMm: parameter(draft.display?.bezelBottomMm, { min: 0, max: 30 }),
      bezelLeftMm: parameter(draft.display?.bezelLeftMm, { min: 0, max: 30 }),
      refreshRateHz: parameter(draft.display?.refreshRateHz, { min: 1, max: 500 }),
      brightnessNits: parameter(draft.display?.brightnessNits, { min: 1, max: 10_000 }),
      averagePowerW: parameter(draft.display?.averagePowerW, { min: 0.01, max: 20 }),
    },
    cameras: (draft.cameras ?? []).slice(0, 8).map(camera => ({
      ...(camera.type ? { type: camera.type } : {}),
      sensorFormatDenominator: parameter(camera.sensorFormatDenominator, { min: 1, max: 20 }),
      resolutionMp: parameter(camera.resolutionMp, { min: 0.1, max: 500 }),
      equivalentFocalLengthMm: parameter(camera.equivalentFocalLengthMm, { min: 5, max: 1000 }),
      physicalFocalLengthMm: parameter(camera.physicalFocalLengthMm, { min: 0.5, max: 100 }),
      apertureFNumber: parameter(camera.apertureFNumber, { min: 0.5, max: 20 }),
      moduleWidthMm: parameter(camera.moduleWidthMm, { min: 1, max: 80 }),
      moduleHeightMm: parameter(camera.moduleHeightMm, { min: 1, max: 80 }),
      moduleDepthMm: parameter(camera.moduleDepthMm, { min: 1, max: 40 }),
    })),
    packaging: {
      reservedVolumePercent: parameter(draft.packaging?.reservedVolumePercent, { min: 0, max: 95 }),
      thermalMm3: parameter(draft.packaging?.thermalMm3, { min: 0, max: 200000 }),
      boardMm3: parameter(draft.packaging?.boardMm3, { min: 0, max: 200000 }),
      speakersMm3: parameter(draft.packaging?.speakersMm3, { min: 0, max: 100000 }),
      otherMm3: parameter(draft.packaging?.otherMm3, { min: 0, max: 500000 }),
    },
    usagePower: {
      webBrowsingW: parameter(draft.usagePower?.webBrowsingW, { min: 0.05, max: 15 }),
      videoPlaybackW: parameter(draft.usagePower?.videoPlaybackW, { min: 0.05, max: 15 }),
      gamingW: parameter(draft.usagePower?.gamingW, { min: 0.1, max: 30 }),
      cameraUseW: parameter(draft.usagePower?.cameraUseW, { min: 0.1, max: 25 }),
      standbyW: parameter(draft.usagePower?.standbyW, { min: 0.005, max: 5 }),
    },
  };
}

export const AUTO_MODEL_JSON_SCHEMA = {
  type: 'object',
  properties: {
    dimensions: {
      type: 'object',
      properties: {
        widthMm: { $ref: '#/$defs/range' },
        heightMm: { $ref: '#/$defs/range' },
        thicknessMm: { $ref: '#/$defs/range' },
        weightG: { $ref: '#/$defs/range' },
      },
    },
    battery: {
      type: 'object',
      properties: {
        capacityMah: { $ref: '#/$defs/range' },
        nominalVoltageV: { $ref: '#/$defs/range' },
        usablePercent: { $ref: '#/$defs/range' },
        widthMm: { $ref: '#/$defs/range' },
        heightMm: { $ref: '#/$defs/range' },
        thicknessMm: { $ref: '#/$defs/range' },
        weightG: { $ref: '#/$defs/range' },
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
        diagonalInches: { $ref: '#/$defs/range' },
        resolutionWidthPx: { $ref: '#/$defs/range' },
        resolutionHeightPx: { $ref: '#/$defs/range' },
        aspectWidth: { $ref: '#/$defs/range' },
        aspectHeight: { $ref: '#/$defs/range' },
        bezelTopMm: { $ref: '#/$defs/range' },
        bezelRightMm: { $ref: '#/$defs/range' },
        bezelBottomMm: { $ref: '#/$defs/range' },
        bezelLeftMm: { $ref: '#/$defs/range' },
        refreshRateHz: { $ref: '#/$defs/range' },
        brightnessNits: { $ref: '#/$defs/range' },
        averagePowerW: { $ref: '#/$defs/range' },
      },
    },
    cameras: {
      type: 'array',
      maxItems: 8,
      items: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['wide','ultrawide','telephoto','periscope','front','other'] },
          sensorFormatDenominator: { $ref: '#/$defs/range' },
          resolutionMp: { $ref: '#/$defs/range' },
          equivalentFocalLengthMm: { $ref: '#/$defs/range' },
          physicalFocalLengthMm: { $ref: '#/$defs/range' },
          apertureFNumber: { $ref: '#/$defs/range' },
          moduleWidthMm: { $ref: '#/$defs/range' },
          moduleHeightMm: { $ref: '#/$defs/range' },
          moduleDepthMm: { $ref: '#/$defs/range' },
        },
      },
    },
    packaging: {
      type: 'object',
      properties: {
        reservedVolumePercent: { $ref: '#/$defs/range' },
        thermalMm3: { $ref: '#/$defs/range' },
        boardMm3: { $ref: '#/$defs/range' },
        speakersMm3: { $ref: '#/$defs/range' },
        otherMm3: { $ref: '#/$defs/range' },
      },
    },
    usagePower: {
      type: 'object',
      properties: {
        webBrowsingW: { $ref: '#/$defs/range' },
        videoPlaybackW: { $ref: '#/$defs/range' },
        gamingW: { $ref: '#/$defs/range' },
        cameraUseW: { $ref: '#/$defs/range' },
        standbyW: { $ref: '#/$defs/range' },
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
  const hasEvidence = request.evidence.length > 0;

  return `You are the inference layer for PhoneFuturist Lab.

Build a cautious engineering hypothesis for the virtual device named "${request.deviceName}".
Intent: ${request.intent ?? 'balanced'}.
Model state: ${hasEvidence ? 'evidence-backed early model' : 'concept model with no active device evidence'}.

Rules:
1. Do not use memorized final benchmark or battery-test answers for this target device.
2. ${hasEvidence
      ? 'Use ONLY the evidence below plus general physical/engineering relationships. Every inferred parameter should cite relevant supplied evidence IDs.'
      : 'There is no active device evidence. Use only the device name to identify the broad product class plus general smartphone engineering relationships. Do not treat the name itself as proof of any specific leaked specification.'}
3. ${hasEvidence
      ? 'If the evidence cannot reasonably support a parameter, OMIT it.'
      : 'Build a deliberately broad concept model so the simulator remains usable. Prefer conservative ranges, avoid precise-looking claims, and keep confidence at or below 0.35 for concept-only assumptions.'}
4. Confidence is epistemic confidence from 0 to 1, not marketing confidence.
5. Give ranges when uncertainty is meaningful. mostLikely may be included inside the range.
6. Do not invent benchmark scores. This pass builds device parameters, not final benchmark results.
7. Estimate whole-device average power for web browsing, video playback, gaming, camera use and standby when a cautious engineering estimate is possible. These are modeled values, never measurements.
8. Build the whole virtual phone from the supplied leak evidence, not only battery life. Resolve dimensions, weight, display geometry and resolution, battery, processor, cameras, packaging/thermal hardware and workload power whenever the evidence supports them.
9. Use inference only to connect supported leaked facts into engineering parameters. Never replace missing leaks with a generic flagship template.
10. Keep reasoning concise and engineering-focused. Clearly mark concept-only reasoning as modeled rather than evidence-derived.

Evidence:
${evidence || '[no active evidence for this device]'}`;
}
