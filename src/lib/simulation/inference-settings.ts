import { logVirtualFailure } from './virtual-diagnostics';
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
/** Explicit opt-in; never enables billing, switches accounts, or falls back to another provider. */
export function virtualDeviceInferenceSettings(): import('./providers/google-virtual-device-provider').GoogleVirtualSettings | null {
  const provider = value('VIRTUAL_DEVICE_PROVIDER');
  const model = value('VIRTUAL_DEVICE_MODEL');
  if (!provider) { logVirtualFailure('configuration', 'provider_missing'); return null; }
  if (!model) { logVirtualFailure('configuration', 'model_missing'); return null; }
  if (provider === 'gemini') {
    const apiKey = value('GEMINI_API_KEY');
    if (!apiKey) { logVirtualFailure('configuration', 'gemini_key_missing'); return null; }
    return { provider, apiKey, model };
  }
  if (provider === 'gemma') {
    const accountId = value('CLOUDFLARE_ACCOUNT_ID');
    const apiToken = value('CLOUDFLARE_AI_API_TOKEN');
    if (!accountId || !apiToken) { logVirtualFailure('configuration', 'gemma_credentials_missing'); return null; }
    return { provider, accountId, apiToken, model };
  }
  logVirtualFailure('configuration', 'provider_unsupported');
  return null;
}
