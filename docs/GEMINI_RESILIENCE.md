# Simple Mode Gemini capacity resilience

The preferred configured model remains gemini-3.8-flash. For this model only, a Google HTTP 503 with canonical UNAVAILABLE and capacity/unavailable classification permits one retry after 750 ms. A second matching failure permits one gemini-3.7-flash attempt. All other failures stop. Maximum three requests, each retaining the existing 60-second request timeout, one bounded delay, no unbounded loop, no model switch for quota/auth/request/parse/provenance/engineering errors. No new service or credential configuration.

The service assembles one frozen request/evidence snapshot. Each attempt receives that same object and serializes identical request body bytes. Provider/model attribution is returned per call via optional proposeWithMetadata, preserving legacy propose implementations. No mutable provider-wide last-model state is used. An accepted model records the actual successful model; fallback metadata records the preferred model and transient-provider-capacity reason. Failed outputs never create an accepted receipt. All attempts pass through the unchanged parsing, provenance and engineering validators.

The user-facing endpoint and its one-minute limiter are unchanged: one generation consumes one limiter entry, independent of internal attempts. Logs contain fixed model IDs, phase, attempt number and elapsed milliseconds; no prompt, headers or secrets. Provider success denotes parsed provider JSON, not validator acceptance.

## Request size

Measured exact Unknown-fields S27 Pro fixture: 101,527 bytes on the wire. Small differences from the observed 102,221-byte live request may reflect configuration/IDs/schema/version differences; the exact deployed payload was not captured.

Serialized user object: 91,826 bytes:
- Evidence bundle: 77,770 bytes.
- Output schema: 13,568 bytes.
- Device configuration: 442 bytes.

Largest evidence sections:
- Reviewed policies: 38,202 bytes (rationale and mandatory transfer assumptions dominate).
- Analogy assessments: 13,725 bytes.
- Source snapshot: 10,648 bytes.
- Parameter slots: 7,497 bytes.
- Decisions: 6,216 bytes.
- Relationships: 1,241 bytes.

The outer JSON adds escaping, system instructions and generation configuration. Policies, assessments and slots overlap intentionally but carry different validation/transfer semantics. No evidence or prompt trimming is included in this resilience patch.

## Verification scope

Regression tests use synthetic provider responses, including exact body equality across all attempts and successful model attribution. No live provider request, secret edit, deployment, push or merge is part of this patch.

## Files changed

- src/lib/simulation/providers/google-virtual-device-provider.ts — bounded capacity-only retry/fallback and logs.
- src/lib/simulation/virtual-device-inference.ts — per-call actual-model attribution.
- src/lib/simulation/virtual-device.ts — optional explicit fallback receipt metadata.
- tests/virtual-provider-resilience.test.ts — retry/fallback, non-retry failures, identical request, attribution and immutability regressions.
- tests/google-error-diagnostics.test.ts — fresh upstream Response per simulated attempt.
- docs/GEMINI_RESILIENCE.md — behavior and request-size analysis.
