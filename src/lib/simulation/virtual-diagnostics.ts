export type VirtualFailureStage = 'configuration' | 'evidence' | 'provider' | 'parse' | 'provenance' | 'engineering' | 'runner';
export interface SafeProviderDiagnostic {
  upstreamStatus?: string;
  upstreamCode?: number;
  category: 'capacity' | 'quota_or_rate_limit' | 'invalid_request' | 'authentication' | 'permission' | 'not_found' | 'unavailable' | 'unknown';
  message: string;
  requestBytes?: number;
  elapsedMs?: number;
}
export class VirtualProviderError extends Error {
  constructor(public readonly code: 'provider_http' | 'provider_response_format' | 'model_json' | 'model_contract' | 'provider_response_size' | 'provider_timeout' | 'provider_transport', public readonly httpStatus?: number, public readonly diagnostic?: SafeProviderDiagnostic) { super(code); }
}
/** Diagnostics contain only allowlisted summaries and numeric metrics, never raw upstream text. */
export function logVirtualFailure(stage: VirtualFailureStage, code: string, httpStatus?: number, diagnostic?: SafeProviderDiagnostic) {
  console.warn(JSON.stringify({ event: 'virtual_device_failure', stage, code, ...(httpStatus === undefined ? {} : { httpStatus }), ...(diagnostic ? {upstream:diagnostic} : {}) }));
}
