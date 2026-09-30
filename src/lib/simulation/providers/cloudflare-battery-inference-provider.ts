import {
  buildBatteryInferencePrompt,
} from '../battery-inference-prompt';

import type {
  BatteryInferenceProvider,
  BatteryInferenceProviderContext,
  BatteryInferenceRequest,
} from '../inference-service';

const DEFAULT_BASE_URL =
  'https://api.cloudflare.com/client/v4';

const DEFAULT_TIMEOUT_MS = 30_000;

export interface CloudflareBatteryInferenceProviderOptions {
  accountId: string;
  apiToken: string;
  model: string;

  gatewayId?: string;
  baseUrl?: string;
  timeoutMs?: number;

  fetch?: typeof globalThis.fetch;
}

interface ResponsesContentItem {
  type?: unknown;
  text?: unknown;
}

interface ResponsesOutputItem {
  type?: unknown;
  content?: unknown;
}

interface ResponsesApiResponse {
  output_text?: unknown;
  output?: unknown;
}

function requiredValue(
  value: string,
  name: string,
): string {
  const trimmed = value.trim();

  if (!trimmed) {
    throw new Error(
      `Cloudflare battery inference provider requires ${name}.`,
    );
  }

  return trimmed;
}

function normalizedBaseUrl(
  value: string | undefined,
): string {
  return (
    value?.trim() || DEFAULT_BASE_URL
  ).replace(/\/+$/, '');
}

function responseText(
  payload: unknown,
): string {
  if (
    payload === null ||
    typeof payload !== 'object'
  ) {
    throw new Error(
      'Cloudflare battery inference returned an invalid response body.',
    );
  }

  const response =
    payload as ResponsesApiResponse;

  if (
    typeof response.output_text === 'string' &&
    response.output_text.trim()
  ) {
    return response.output_text;
  }

  if (!Array.isArray(response.output)) {
    throw new Error(
      'Cloudflare battery inference response contained no model output.',
    );
  }

  const pieces: string[] = [];

  for (const outputItem of response.output) {
    if (
      outputItem === null ||
      typeof outputItem !== 'object'
    ) {
      continue;
    }

    const item =
      outputItem as ResponsesOutputItem;

    if (!Array.isArray(item.content)) {
      continue;
    }

    for (const contentItem of item.content) {
      if (
        contentItem === null ||
        typeof contentItem !== 'object'
      ) {
        continue;
      }

      const content =
        contentItem as ResponsesContentItem;

      if (
        content.type === 'output_text' &&
        typeof content.text === 'string'
      ) {
        pieces.push(content.text);
      }
    }
  }

  const text = pieces.join('').trim();

  if (!text) {
    throw new Error(
      'Cloudflare battery inference response contained no model text.',
    );
  }

  return text;
}

function parseModelJson(
  text: string,
): unknown {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(
      'Cloudflare battery inference model returned malformed JSON.',
    );
  }
}

async function errorMessage(
  response: Response,
): Promise<string> {
  let detail = '';

  try {
    const text =
      (await response.text()).trim();

    if (text) {
      detail = ` ${text.slice(0, 500)}`;
    }
  } catch {
    // The HTTP status is still useful if the
    // response body cannot be consumed.
  }

  return [
    'Cloudflare battery inference request failed',
    `with HTTP ${response.status}.`,
    detail,
  ]
    .join(' ')
    .trim();
}

export function createCloudflareBatteryInferenceProvider(
  options: CloudflareBatteryInferenceProviderOptions,
): BatteryInferenceProvider {
  const accountId =
    requiredValue(
      options.accountId,
      'accountId',
    );

  const apiToken =
    requiredValue(
      options.apiToken,
      'apiToken',
    );

  const model =
    requiredValue(
      options.model,
      'model',
    );

  const gatewayId =
    options.gatewayId?.trim() || undefined;

  const baseUrl =
    normalizedBaseUrl(options.baseUrl);

  const timeoutMs =
    options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  if (
    !Number.isFinite(timeoutMs) ||
    timeoutMs <= 0
  ) {
    throw new Error(
      'Cloudflare battery inference timeoutMs must be a positive finite number.',
    );
  }

  const fetchImpl =
    options.fetch ?? globalThis.fetch;

  if (typeof fetchImpl !== 'function') {
    throw new Error(
      'Cloudflare battery inference requires fetch.',
    );
  }

  return {
    modelId: `cloudflare:${model}`,

    async inferBattery(
      request: BatteryInferenceRequest,
      context: BatteryInferenceProviderContext,
    ): Promise<unknown> {
      const prompt =
        buildBatteryInferencePrompt({
          scenario: request.scenario,
          evidence: request.evidence,
        });

      const controller =
        new AbortController();

      const timeout =
        setTimeout(
          () => controller.abort(),
          timeoutMs,
        );

      try {
        const headers =
          new Headers({
            Authorization:
              `Bearer ${apiToken}`,

            'Content-Type':
              'application/json',
          });

        if (gatewayId) {
          headers.set(
            'cf-aig-gateway-id',
            gatewayId,
          );
        }

        const response =
          await fetchImpl(
            `${baseUrl}/accounts/${encodeURIComponent(
              accountId,
            )}/ai/v1/responses`,
            {
              method: 'POST',
              headers,
              signal: controller.signal,

              body: JSON.stringify({
                model,

                input: [
                  {
                    role: 'system',
                    content: prompt.system,
                  },
                  {
                    role: 'user',
                    content: prompt.user,
                  },
                ],

                stream: false,

                metadata: {
                  phonefuturist_prompt_version:
                    context.promptVersion,

                  phonefuturist_schema_version:
                    context.schemaVersion,
                },
              }),
            },
          );

        if (!response.ok) {
          throw new Error(
            await errorMessage(response),
          );
        }

        let payload: unknown;

        try {
          payload = await response.json();
        } catch {
          throw new Error(
            'Cloudflare battery inference returned a non-JSON API response.',
          );
        }

        return parseModelJson(
          responseText(payload),
        );
      } catch (error) {
        if (
          error instanceof Error &&
          error.name === 'AbortError'
        ) {
          throw new Error(
            `Cloudflare battery inference timed out after ${timeoutMs}ms.`,
          );
        }

        throw error;
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}