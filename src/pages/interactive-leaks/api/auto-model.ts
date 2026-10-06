import type { APIRoute } from 'astro';
import {
  AUTO_MODEL_JSON_SCHEMA,
  autoModelPrompt,
  validateAutoModel,
  type AutoModelDraft,
  type AutoModelRequest,
} from '../../../lib/simulation/auto-ai';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

export const POST: APIRoute = async ({ request }) => {
  const apiKey = import.meta.env.GEMINI_API_KEY;
  const model = import.meta.env.GEMINI_AUTO_MODEL || 'gemini-3.8-flash';

  if (!apiKey) return json({ error: 'Auto AI is not configured.' }, 503);

  let body: AutoModelRequest;
  try {
    if (Number(request.headers.get('content-length') || 0) > 100_000) {
      return json({ error: 'Auto evidence payload is too large.' }, 413);
    }
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON.' }, 400);
  }

  if (
    !body ||
    typeof body.deviceKey !== 'string' ||
    typeof body.deviceName !== 'string' ||
    !Array.isArray(body.evidence) ||
    body.deviceKey.length > 160 ||
    body.deviceName.length > 160 ||
    body.evidence.length > 80
  ) {
    return json({ error: 'Invalid Auto model request.' }, 400);
  }

  const evidence = body.evidence.filter(item =>
    item &&
    typeof item.id === 'string' &&
    item.id.length <= 120 &&
    typeof item.claim === 'string' &&
    item.claim.length <= 2_000 &&
    ['confirmed','reported','leak','historical','measured','editorial'].includes(item.kind)
  );

  const safeRequest: AutoModelRequest = {
    deviceKey: body.deviceKey,
    deviceName: body.deviceName,
    evidence,
    ...(body.intent === 'efficiency' || body.intent === 'performance' || body.intent === 'balanced'
      ? { intent: body.intent }
      : {}),
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
      return json({ error: 'Auto AI provider request failed.' }, 502);
    }

    const provider = await response.json() as any;
    const text = provider?.candidates?.[0]?.content?.parts
      ?.map((part: any) => typeof part?.text === 'string' ? part.text : '')
      .join('');

    if (!text) return json({ error: 'Auto AI returned no model.' }, 502);

    let draft: AutoModelDraft;
    try {
      draft = JSON.parse(text);
    } catch {
      return json({ error: 'Auto AI returned invalid structured output.' }, 502);
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
    return json({ error: 'Auto AI is temporarily unavailable.' }, 502);
  }
};
