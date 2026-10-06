import type { APIRoute } from 'astro';
import {
  AUTO_MODEL_JSON_SCHEMA,
  autoModelPrompt,
  evidenceItemsFromBundle,
  validateAutoModel,
  type AutoModelDraft,
  type AutoModelRequest,
  type IntelligenceBundle,
} from '../../../lib/simulation/auto-ai';
import { simulationServiceClient } from '../../../lib/simulation/service-client';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

export const POST: APIRoute = async ({ request }) => {
  const apiKey = import.meta.env.GEMINI_API_KEY;
  const model = import.meta.env.GEMINI_AUTO_MODEL || 'gemini-3.8-flash';
  const service = simulationServiceClient();

  if (!apiKey) return json({ error: 'Auto modeling is not configured.' }, 503);
  if (!service) return json({ error: 'Simulation intelligence service is not configured.' }, 503);

  let body: { deviceSlug?: string; intent?: AutoModelRequest['intent'] };
  try {
    if (Number(request.headers.get('content-length') || 0) > 10_000) {
      return json({ error: 'Auto request is too large.' }, 413);
    }
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON.' }, 400);
  }

  const deviceSlug = typeof body?.deviceSlug === 'string' ? body.deviceSlug.trim() : '';
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(deviceSlug) || deviceSlug.length > 180) {
    return json({ error: 'Invalid device.' }, 400);
  }

  const { data: bundleData, error: bundleError } = await service
    .rpc('simulation_evidence_bundle', { p_device_slug: deviceSlug });

  if (bundleError) return json({ error: 'Could not load simulation evidence.' }, 500);
  if (!bundleData) return json({ error: 'Device intelligence not found.' }, 404);

  const bundle = bundleData as IntelligenceBundle;
  const device = bundle.device;
  const evidence = evidenceItemsFromBundle(bundle);

  if (!device?.slug || !device?.name) {
    return json({ error: 'Device intelligence is incomplete.' }, 422);
  }
  if (!evidence.length) {
    return json({ error: 'No active evidence is available for Auto mode yet.' }, 422);
  }

  const safeRequest: AutoModelRequest = {
    deviceKey: device.slug,
    deviceName: [device.brand, device.name].filter(Boolean).join(' '),
    evidence,
    ...(body.intent === 'efficiency' || body.intent === 'performance' || body.intent === 'balanced'
      ? { intent: body.intent }
      : { intent: 'balanced' }),
  };

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: autoModelPrompt(safeRequest) }] }],
          generationConfig: {
            temperature: 0.15,
            responseMimeType: 'application/json',
            responseJsonSchema: AUTO_MODEL_JSON_SCHEMA,
          },
        }),
      },
    );

    if (!response.ok) {
      return json({ error: 'Auto modeling request failed.' }, 502);
    }

    const provider = await response.json() as any;
    const text = provider?.candidates?.[0]?.content?.parts
      ?.map((part: any) => typeof part?.text === 'string' ? part.text : '')
      .join('');

    if (!text) return json({ error: 'Auto modeling returned no device model.' }, 502);

    let draft: AutoModelDraft;
    try {
      draft = JSON.parse(text);
    } catch {
      return json({ error: 'Auto modeling returned an invalid device model.' }, 502);
    }

    const virtualDevice = validateAutoModel(safeRequest, draft);
    return json({
      data: virtualDevice,
      meta: {
        provider: 'gemini',
        model,
        evidenceCount: evidence.length,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch {
    return json({ error: 'Auto modeling is temporarily unavailable.' }, 502);
  }
};
