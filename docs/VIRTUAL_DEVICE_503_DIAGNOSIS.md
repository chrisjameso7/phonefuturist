# Virtual Device 503 investigation

## Established facts

- The current `/api/simulation/virtual-device` route returns 503 only when `virtualDeviceInferenceSettings()` returns null, before provider construction or inference. Auth middleware's other 503 branches apply to account/studio pages, not this API route.
- `wrangler secret list` confirmed the three required binding names on `phonefuturist-dev`. Secret values were not read, printed, or modified.
- The built Astro environment module delegates to the runtime getter. The installed Cloudflare adapter registers its Worker environment with that getter. There is no evidence of build-time secret inlining or a broken getter in the inspected code.
- Local regression tests resolve the exact Gemini 3.8 model configuration using synthetic secret values. Missing runtime bindings reproduce 503 without any provider call.
- The S27 Pro configuration with Unknown chipset/cooling/software completes all five categories through mocked Gemini responses and the real validator/service/runners. Unknown context is not a 503 cause.
- The Gemini adapter requests JSON MIME output and sends the full schema as prompt data; it does not send a potentially unsupported provider response-schema option. Official Gemini 3.8 documentation retains generateContent with candidates/content/parts responses.

## Remaining live uncertainty

Binding names cannot establish runtime values, provider recognition, or which artifact is serving the observed request. The precise live rejection (provider missing, model missing, API key missing, or unsupported provider) cannot be established from current generic logs. No speculative secret normalization, runtime fallback or validation relaxation was added. This is not a claim that the production root cause has been fixed.

New diagnostics emit fixed codes only, never raw errors, provider text, credentials, user input or tokens. Configuration codes identify the missing category without exposing values. Later stages distinguish provider HTTP (numeric status), transport, response format/size, model JSON, schema parse, provenance, engineering, evidence assembly and runner rejection/exception.

A redeploy is required to observe these new diagnostics in production. Deployment and secret changes were explicitly prohibited and were not performed. After an authorized deployment, reproduce once and inspect the `virtual_device_failure` event; no secret values are needed.

## Integrity

No prediction policy, authority check, evidence ID validation, impossible-value validation, authentication, or deterministic engine was weakened. Markdown/extra-text output remains rejected instead of silently repaired; this cannot explain the observed pre-provider 503.

## Files changed

- `docs/VIRTUAL_DEVICE_503_DIAGNOSIS.md`
- `src/components/interactive-leaks/VirtualDeviceWorkspace.tsx`
- `src/lib/simulation/inference-settings.ts`
- `src/lib/simulation/providers/google-virtual-device-provider.ts`
- `src/lib/simulation/virtual-device-inference.ts`
- `src/lib/simulation/virtual-diagnostics.ts`
- `src/lib/simulation/virtual-launch-service.ts`
- `src/pages/api/simulation/virtual-device.ts`
- `tests/virtual-google-provider.test.ts`
- `tests/virtual-launch-api.test.ts`
- `tests/virtual-settings.test.ts`

## Regression coverage

Runtime secret lookup after module initialization; missing and unsupported provider configuration; exact S27 Pro Unknown-fields endpoint case; 503 occurs before provider construction; Gemini 3.8 transport with accepted synthetic proposals; sanitized malformed-output diagnostics.
