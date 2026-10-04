import { buildVirtualDevicePrompt } from '../virtual-device-prompt';
import { VIRTUAL_DEVICE_PROMPT_VERSION, type VirtualDeviceProvider } from '../virtual-device-inference';
import { VIRTUAL_DEVICE_SCHEMA_VERSION } from '../virtual-device';
import { createCloudflareInferenceTransport, type CloudflareInferenceTransportOptions } from './cloudflare-inference-transport';

export function createCloudflareVirtualDeviceProvider(options: CloudflareInferenceTransportOptions): VirtualDeviceProvider {
  const transport = createCloudflareInferenceTransport(options);
  return {
    providerId: 'cloudflare', modelId: transport.modelId,
    propose(request) {
      return transport.infer(buildVirtualDevicePrompt(request), {
        promptVersion: VIRTUAL_DEVICE_PROMPT_VERSION, schemaVersion: VIRTUAL_DEVICE_SCHEMA_VERSION,
      });
    },
  };
}
