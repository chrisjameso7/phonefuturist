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
import { serverClient, settings } from '../../../lib/supabase';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

export const POST: APIRoute = async ({ request, locals, cookies }) => {
  const provider = import.meta.env.VIRTUAL_DEVICE_PROVIDER;
  const model = import.meta.env.VIRTUAL_DEVICE_MODEL;
  const accountId = import.meta.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = import.meta.env.CLOUDFLARE_AI_API_TOKEN;
  const service = locals.supabase ?? (settings() ? serverClient(cookies, request) : null);

  if (provider !== 'gemma' || !model || !accountId || !apiToken) {
    return json({ error: 'Auto modeling is not configured.' }, 503);
  }
  if (!service) return json({ error: 'Simulation intelligence is not configured.' }, 503);

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
      `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/ai/v1/chat/completions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiToken}`,
        },
        signal: AbortSignal.timeout(60_000),
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'system',
              content: 'Return only the requested JSON device model. Do not include markdown or prose outside the JSON object.',
            },
            { role: 'user', content: autoModelPrompt(safeRequest) },
          ],
          stream: false,
          max_completion_tokens: 6144,
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'phonefuturist_auto_device',
              strict: false,
              schema: AUTO_MODEL_JSON_SCHEMA,
            },
          },
          chat_template_kwargs: { enable_thinking: false },
        }),
      },
    );

    if (!response.ok) {
      return json({ error: 'Auto modeling request failed.' }, 502);
    }

    const envelope = await response.json() as any;
    const choice = envelope?.choices?.[0];
    const text = choice?.finish_reason === 'stop' && typeof choice?.message?.content === 'string'
      ? choice.message.content
      : '';

    if (!text) return json({ error: 'Auto modeling returned no complete device model.' }, 502);

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
        provider: 'phonefuturist-auto',
        model,
        evidenceCount: evidence.length,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch {
    return json({ error: 'Auto modeling is temporarily unavailable.' }, 502);
  }
};
