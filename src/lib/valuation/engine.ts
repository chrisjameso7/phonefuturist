import { baselineValuation, cents, finalize } from './baseline';
import { deviceParameters, number, object } from './validation';
import { VALUATION_SCHEMA, VALUATION_SYSTEM_PROMPT, valuationPrompt } from './prompt';
import type { DeviceParameters, Valuation, ValuationResponse } from './types';
export type GenerateJson = (request: {
    system: string;
    prompt: string;
    schema: Record<string, unknown>;
}) => Promise<string>;
export function validatedValuation(text: string, parameters: DeviceParameters, baseline: Valuation): Valuation {
    const value = object(JSON.parse(text));
    if (value.currency !== 'USD' || value.designation !== 'Estimated BOM' || !Array.isArray(value.components) || value.components.length !== baseline.components.length)
        throw new Error('Invalid valuation schema.');
    const seen = new Set<string>();
    const components = value.components.map(raw => { const row = object(raw), reference = baseline.components.find(c => c.id === row.id); if (!reference || seen.has(reference.id) || row.label !== reference.label)
        throw new Error('Unknown or duplicate cost item.'); seen.add(reference.id); const cost = number(row.costUsd, reference.costUsd * .75, reference.costUsd * 1.25); if (Math.abs(cost - cents(cost)) > 1e-8)
        throw new Error('Use cents precision.'); return { ...reference, costUsd: cost }; });
    const overhead = number(value.manufacturingOverheadUsd, baseline.manufacturingOverheadUsd * .75, baseline.manufacturingOverheadUsd * 1.25);
    if (Math.abs(overhead - cents(overhead)) > 1e-8 || value.retailMarkupMultiplier !== parameters.retailMultiplier)
        throw new Error('Invalid overhead or multiplier.');
    const score = number(value.confidenceScore, 0, parameters.unreleased ? .55 : .75);
    if (typeof value.summary !== 'string' || value.summary.trim().length < 20 || value.summary.length > 500 || /[<>]|https?:/i.test(value.summary))
        throw new Error('Invalid analysis.');
    const result = finalize(components, overhead, parameters.retailMultiplier, score, value.summary.trim());
    if (Math.abs(number(value.totalBomUsd, 0, 100000) - result.totalBomUsd) > .011 || value.suggestedRetailUsd !== result.suggestedRetailUsd)
        throw new Error('Cost totals do not reconcile.');
    // Return only the known schema, never provider-added fields or diagnostic material.
    return result;
}
export async function valueDevice(raw: unknown, generate?: GenerateJson): Promise<ValuationResponse> {
    const parameters = deviceParameters(raw), baseline = baselineValuation(parameters);
    if (!generate)
        return { valuation: baseline, method: 'baseline', notice: 'Baseline analysis shown.' };
    try {
        const text = await generate({ system: VALUATION_SYSTEM_PROMPT, prompt: valuationPrompt(parameters, baseline), schema: VALUATION_SCHEMA });
        return { valuation: validatedValuation(text, parameters, baseline), method: 'ai' };
    }
    catch {
        return { valuation: baseline, method: 'baseline', notice: 'AI analysis is unavailable. Baseline analysis shown.' };
    }
}
