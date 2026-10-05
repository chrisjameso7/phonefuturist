export type VirtualFailureStage = 'configuration' | 'evidence' | 'provider' | 'parse' | 'provenance' | 'engineering' | 'runner';
export class VirtualProviderError extends Error {
  constructor(public readonly code: 'provider_http' | 'provider_response_format' | 'model_json' | 'provider_response_size', public readonly httpStatus?: number) { super(code); }
}
/** Only fixed codes, stage names and numeric HTTP status are logged. Never log error objects or model text. */
export function logVirtualFailure(stage: VirtualFailureStage, code: string, httpStatus?: number) {
  console.warn(JSON.stringify({ event: 'virtual_device_failure', stage, code, ...(httpStatus === undefined ? {} : { httpStatus }) }));
}
