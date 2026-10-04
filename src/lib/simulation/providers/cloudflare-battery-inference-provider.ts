import { buildBatteryInferencePrompt } from '../battery-inference-prompt';
import type { BatteryInferenceProvider } from '../inference-service';
import { createCloudflareInferenceTransport, type CloudflareInferenceTransportOptions } from './cloudflare-inference-transport';

export interface CloudflareBatteryInferenceProviderOptions extends CloudflareInferenceTransportOptions {}

export function createCloudflareBatteryInferenceProvider(options: CloudflareBatteryInferenceProviderOptions): BatteryInferenceProvider {
  const transport = createCloudflareInferenceTransport(options);
  return {
    modelId: transport.modelId,
    async inferBattery(request, context) {
      return transport.infer(buildBatteryInferencePrompt(request), context);
    },
  };
}
