# Gemini upstream HTTP 503 investigation

## Confirmed

The supplied deployed event (`provider_http`, `httpStatus:503`) records the actual HTTP status returned by fetch from the configured Google generateContent endpoint. The adapter copies `response.status`; it does not transform an abort, JSON failure, validation failure or another HTTP status into 503. PhoneFuturist's route returns 502 for this failed generation. Its own configuration-only 503 is a separate path.

The provider request uses v1beta generateContent, a systemInstruction, one user contents message, responseMimeType application/json and maxOutputTokens 32768. No responseSchema, tools, sampling overrides or unsupported minimal-thinking setting is sent. Official Gemini 3.8 documentation lists structured output support, a 1,048,576-token input limit and 65,536-token output limit.

The actual S27 Pro / Unknown-fields request measured locally is 101,527 UTF-8 bytes (system text 1,421 characters; user text 91,780 characters). These are byte/character counts, not a Google tokenizer measurement. The payload is not remotely close to the documented context capacity; no evidence of a context-limit error was obtained. Account-specific token-per-minute quotas cannot be determined from payload size.

## Not established

The original Google response body was discarded, so its canonical status/message cannot be recovered from the supplied log. General Google documentation associates 503 with temporary unavailability/capacity, and quota/rate failures with 429. This is not proof that this particular request failed due to overload or free-tier quota. A successful small request at another time does not rule out a transient or workload-dependent failure.

No API key is available to this local process, and only example environment files exist. Remote Worker secrets were not retrieved, exposed or modified. Authenticated smallest-request and full-request reproductions therefore could not be executed. Local tests use synthetic HTTP responses through the actual provider/service path; they are not live Google requests. Google API infrastructure returned an HTTP response according to the provided log; model execution is not proven.

## Changes

- Bounded (16 KB) reading of upstream error JSON.
- Preserve allowlisted Google canonical status and numeric error code separately from actual HTTP status.
- Classify capacity, quota/rate limits, bad arguments, authentication, permission, missing resources and generic unavailability. Messages are normalized summaries, not verbatim upstream text.
- Record numeric request byte size and elapsed time on HTTP failures, without request content or headers.
- Distinguish AbortError/TimeoutError from HTTP errors.
- Preserve strict parsing/provenance/engineering validation and single-attempt behavior. No speculative fallback, secret edits or model change.

Files: src/lib/simulation/providers/google-error-diagnostics.ts; src/lib/simulation/providers/google-virtual-device-provider.ts; src/lib/simulation/virtual-diagnostics.ts; src/lib/simulation/virtual-device-inference.ts; tests/google-error-diagnostics.test.ts; this report.

Redeployment is required to obtain the enhanced diagnostics on the live Worker. No deployment, push or merge was performed. The precise upstream cause remains pending a captured sanitized Google error response.

Official references:
- https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash
- https://ai.google.dev/gemini-api/docs/troubleshooting
- https://ai.google.dev/gemini-api/docs/api-errors
