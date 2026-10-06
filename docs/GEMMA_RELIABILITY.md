# Gemma production-shaped reliability investigation — 2026-10-06

## Findings and boundaries

The reported provider_timeout originates from the adapter's explicit 60-second fetch deadline. It is not evidence of a Cloudflare Worker CPU timeout. The old non-streaming request allowed 32,768 output tokens and did not disable the model's thinking mode. It required the model to repeat all trusted IDs, ranges, conditions, references and long mandatory assumptions. That made generation perform expensive, error-prone copying unrelated to the engineering assessment. Without the old upstream trace we cannot separate queue time, prefill, thinking and output-generation time quantitatively.

A separate confirmed defect: the adapter expected result.response, but current Gemma uses a chat-completion choices/message/content response. Fixing timeout alone would not have fixed that parser mismatch.

Live trials exposed two additional transport-contract issues: unconstrained JSON repeated overlong assumptions, and numerical assessment references produced incomplete/invalid coverage. Those trials were rejected. Named required decision properties and server-owned assumption reconstruction removed the unnecessary tasks without relaxing the original VDM validator.

## Final architecture

- Retain @cf/google/gemma-4-26b-a4b-it; REST /ai/v1/chat/completions with model in body. No native binding or infrastructure change required.
- One compact, all-domain prompt. Preserve original evidence records and operating conditions; deduplicate repeated policy text into an indexed dictionary. Remove redundant audit/slot/assessment copies and the full VDM output schema from the AI transport only; full provenance stays in the receipt.
- Structured output requires an exact named decision for every inferable parameter and one rationale per domain. AI assesses and can decline the approved envelope. It does not merely receive a hardcoded success response.
- Server reconstructs fixed metadata, full uncertainty ranges, low confidence, mandatory assumptions and explicit voltage dependencies. Unknown remains unknown. Model knowledge is not promoted to evidence.
- Original strict parser, provenance validator, engineering sanity checks and deterministic runners run afterward. Advanced and legacy battery inference paths remain intact.
- Thinking disabled via chat_template_kwargs.enable_thinking=false. max_completion_tokens=6144. Keep the original 60-second deadline; no arbitrary timeout increase.
- Reject incomplete finish_reason, missing/extra decisions, authority fields and fabricated references. The compact output has no source-authority fields to rewrite.
- Existing Gemini capacity retry/fallback remains available only when Gemini is configured. Gemma has one bounded attempt; no untested fallback model or silent switch to overloaded Gemini. The one-minute per-user rate limiter remains unchanged.
- Sanitized logs expose request/response/output byte counts, protocol, elapsed time, stages and actual known model ID. No credentials, headers or prompt content.

## Live acceptance

Existing local Wrangler OAuth was captured in memory, used for Workers AI requests and never printed/persisted. No production secret was read or changed; no deployment occurred. This uses the actual provider adapter, evidence assembly, model validators and all five runners locally against the live Workers AI service, not a mocked provider or a hello-world prompt. The deployed authenticated HTTP route/Worker CPU budget is still a post-deployment check.

Fixture: Galaxy S27 Pro, rated 5100 mAh, 6.47-inch 1440x3120 120 Hz, Exynos 2700, vapor chamber, One UI 9 / Android 17, Typical, 5G, 500 nits, 25 C. These remain hypothetical user inputs.

Two final live runs succeeded with all five domains resolved:

| Metric | Run 1 | Run 2 |
|---|---:|---:|
| Total generation + validation + runners | 9,852 ms | 15,516 ms |
| Request bytes | 39,758 | 39,758 |
| HTTP response bytes | 2,159 | 2,266 |
| AI content bytes | 1,633 | 1,696 |
| Provider/model | Gemma 4 26B A4B | Gemma 4 26B A4B |

The previous request was about 102 KB. These counts are bytes, not token counts. The final request contains schema twice (prompt and structured-output declaration) intentionally for semantics and decoding. No claims of statistically established reliability from two successes.

Both accepted models produced the same conservative policy envelopes (low confidence, not measured hardware):
- Battery: 9.03–34.59 hours elapsed endurance, including standby.
- CPU: 2000–3800 single-core / 6000–12000 multi-core equivalent scores.
- GPU: 60–130 FPS synthetic; 40–60 FPS 1080p Medium generic gaming; 30–75 FPS 1440p High generic gaming.
- Thermals: 37–67 C junction at 30 minutes; 21.6–99.4% modeled retention, not an accuracy percentage.
- Charging: 16.04–49.98 minutes to 50%, 30.48–94.96 to 80%, 56.94–214.91 to modeled full charge; battery node peak 25.9–45.0 C.

Ranges remain intentionally broad; AI judges the reviewed hypotheses, and numerical output remains constrained by the existing engineering policy. This patch improves inference reliability, not calibration accuracy.

## Reproduce and deploy (user-controlled)

1. Run `npm.cmd run verify` from the repository.
2. Optional live check: `npm.cmd run diagnose:virtual-device -- --live`. It uses your existing Wrangler login when local environment credentials are absent, requires an unambiguous account, consumes AI quota, and writes only a sanitized report to .cache/virtual-device-live-report.json. Without --live it makes no API call. Do not paste credentials into chat.
3. When ready, use the existing `npm.cmd run deploy` workflow. Keep the current provider/model and existing Cloudflare credentials. No secret updates, native AI binding, migration or paid dependency are required.
4. Sign in to the deployed site, submit the fixture once, and watch `npx.cmd wrangler tail --format json`. Expect compact-assessment-1 payload metrics, provider success, HTTP 200, and five resolved categories. Download the receipt and verify model=gemma:@cf/google/gemma-4-26b-a4b-it and promptVersion=compact-assessment-1.
5. Confirm one-minute user rate limiting and reject incomplete/invalid provider responses. Check live CPU-limit errors and free AI quota before admitting users.

Remaining risks: upstream capacity/quota can still fail; only two final live samples; no deployed Worker/authenticated browser acceptance performed; Worker CPU budget remains unmeasured; broad uncalibrated transfer/thermal hypotheses are unsuitable as claims of measured product performance. No paid service or quota upgrade was enabled.

Sources:
- https://developers.cloudflare.com/workers-ai/models/gemma-4-26b-a4b-it/
- https://developers.cloudflare.com/workers-ai/get-started/workers-wrangler/
- https://developers.cloudflare.com/workers-ai/features/json-mode/
- https://developers.cloudflare.com/workers-ai/configuration/open-ai-compatibility/
