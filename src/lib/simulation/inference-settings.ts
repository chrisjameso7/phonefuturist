import {
  getSecret,
} from 'astro:env/server';

export interface BatteryInferenceSettings {
  accountId: string;
  apiToken: string;
  model: string;
  gatewayId?: string;
}

function value(
  name: string,
): string | undefined {
  const resolved =
    getSecret(name)?.trim();

  return resolved || undefined;
}

export function batteryInferenceSettings():
  BatteryInferenceSettings | null {
  const accountId =
    value('CLOUDFLARE_ACCOUNT_ID');

  const apiToken =
    value('CLOUDFLARE_AI_API_TOKEN');

  const model =
    value('BATTERY_INFERENCE_MODEL');

  if (
    !accountId ||
    !apiToken ||
    !model
  ) {
    return null;
  }

  const gatewayId =
    value(
      'CLOUDFLARE_AI_GATEWAY_ID',
    );

  return {
    accountId,
    apiToken,
    model,

    ...(gatewayId
      ? {
          gatewayId,
        }
      : {}),
  };
}