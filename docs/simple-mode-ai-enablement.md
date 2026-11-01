# Simple Mode battery analysis and AI fallback

Implemented on design/phonefuturist-system-v1. Advanced numerical engines, calibration records and coefficients are unchanged.

## Behavior

Simple submits a bounded hardware request to POST /api/hardware-analysis (kind simple-battery). Measured-reference calculations remain the default. Exact-generation, matched-score processor power differences can be used only with a qualifying independent whole-phone reference cohort. Missing coverage retains the reference estimate. Software tuning and nominal voltage are explicit user scenarios. Video decoding does not inherit a CPU/GPU benchmark power curve.

Optional AI supplies missing processor-specific endurance and explicitly requested missing Geekbench 6 scores. Existing CPU results take priority. AI power output is bounded, converted to active-use hours using pack energy and the selected use mix, and labeled Simulated. Invalid JSON, unsupported results, provider failures and rate limits retain reference results. AI is not evidence of measured accuracy. Missing required user inputs are not invented.

Requests are tied to the submitted job, canceled on another calculation or switching to Advanced, and timed out after 25 seconds. Downloads and Community use the matching returned Simple result. Sharing waits until the request finishes. No database or authentication policy changes are needed.

## Verification

- npm.cmd run check: 585 files, zero errors, warnings or hints.
- Focused Vitest run: 7 files, 73 tests passed, including existing battery and sharing tests.
- npm.cmd run build: passed; pre-existing oversized scene/data chunks remain.
- Local built Cloudflare Worker: Simple POST returns 200. Browser test showed 10.1 hours on the standard scenario and 10.7 hours on the optimized scenario, with the same values on the share card. These are UI consistency checks, not real-device battery accuracy validation.
- At 390px the document did not overflow horizontally. Switching to Advanced preserved 5500 mAh, 6.8 inches and 1440 x 3200 resolution. Advanced recalculated 10.1 hours, independently of the Simple-only optimized software setting. No browser console errors were reported.

## Production enablement required

No production setting has been changed by this implementation. The AI path requires all of:

- AI_VALUATION_ENABLED=true.
- Existing server-only CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_AI_API_TOKEN.
- BOM_VALUATION_MODEL or VIRTUAL_DEVICE_MODEL.
- AI_VALUATION_LIMITER Worker binding.
- An active, verified signed-in account. Public reference calculations remain available anonymously.

Proposed Wrangler rate limiter (not applied):

```json
"ratelimits": [
  { "name": "AI_VALUATION_LIMITER", "namespace_id": "1002", "simple": { "limit": 2, "period": 60 } }
]
```

Confirm the namespace is unused before applying it. This bounds requests per account per Cloudflare location; it is not an account-wide spending cap. Leave credentials in Cloudflare secrets. The original task requires approval before changing production Worker settings. After that approval, enable the flag, add the binding, rebuild and deploy with npm.cmd run deploy, and verify a signed-in missing-data request against the actual provider. Do not claim the AI fallback is live before that verification.
