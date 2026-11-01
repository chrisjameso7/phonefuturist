# Hardware valuation and battery analysis

## Scope

A modular server-only service powers an optional Custom hardware analysis panel in the existing BOM lab. The catalog calculator, its fixed editorial prices and exports are unchanged. The custom panel is a separate handset planning scenario, not a quote or a price prediction for the selected catalog build. Baseline values update after a short debounce; AI requests require an explicit Analyze cost drivers action. No schema, authentication policy, secret or production Worker setting was changed for this implementation.

POST /api/hardware-analysis accepts {kind:"bom", parameters:DeviceParameters, analyze:boolean}. Parameters include node/foundry/die area/package, RAM type and GB, storage type and GB, panel size/pixels/refresh, camera sensor areas/MP/periscope, chassis, retail multiplier and released/custom status. Costs, overhead, BOM sum, target retail multiplier, retail scenario, analytical confidence and concise summary are returned in validated JSON. Scores are not statistically calibrated probabilities. Public presentation retains Estimated BOM, concise costs and cost-driver analysis; raw prompts and diagnostics stay off the page.

## Pricing and evidence policy

The baseline's wafer scenarios (e.g. USD28,000 at 2nm and USD20,000 at 3nm), yields, packaging, supplier margin, component rates and overhead are **editorial planning assumptions** in baseline.ts, not confirmed foundry quotes or licensed teardown tables. No foundry gets an invented discount. Interpolated node labels do not claim equivalence across vendors. Larger dies, advanced packaging, memory, panels and camera modules scale explicitly. Radio/board/power and battery/audio/accessory packages fill the remaining handset scope without double counting. This is not a complete laptop/foldable cost model.

Research reviewed 2026-11-01:

- [Counterpoint historical iPhone 14 Pro Max analysis](https://counterpointresearch.com/en/insights/producing-a-128gb-iphone-14-pro-max-mmwave-smartphone-costs-apple-up-to-474): historical aggregate/configuration context only; not a current merchant-chip quote.
- [TechInsights public supply-chain analysis](https://library.techinsights.com/hg-asset/f2e8e8be-0c86-4476-bd6b-e74b8a93889c): public context only. No inaccessible paid component ratios invented or imported.
- [TSMC N2 research](https://research.tsmc.com/page/transistor-structure/59.html): silicon-level efficiency and density claims; no extrapolation into actual negotiated wafer prices or full-device battery improvement.
- [Cloudflare compatible endpoints](https://developers.cloudflare.com/workers-ai/configuration/open-ai-compatibility/) and [platform rate limiter](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/).

The AI receives only validated numerical/enumerated specs, baseline items and curated evidence summaries. It has no browsing/tools, account identity or private editorial notes. Cost changes must stay within 25% of the approved scenario; every ID/label must match, totals reconcile to cents, multiplier remain unchanged and confidence stay capped (0.55 unreleased, 0.75 otherwise). Invalid/truncated JSON, provider HTTP/timeout/envelope failures or contradictory totals return the deterministic baseline. Responses never include raw provider failures or credentials.

## Enablement (not deployed automatically)

Reuse existing server-side CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_AI_API_TOKEN and VIRTUAL_DEVICE_MODEL; optional BOM_VALUATION_MODEL overrides the model. Set AI_VALUATION_ENABLED=true only after provider acceptance testing and budget review. No provider key may be PUBLIC_ or checked in. Bind AI_VALUATION_LIMITER using the existing Cloudflare account's chosen unused namespace ID, for example this Wrangler binding (replace the illustrative namespace after checking account configuration):

```json
{"ratelimits":[{"name":"AI_VALUATION_LIMITER","namespace_id":"1007","simple":{"limit":6,"period":60}}]}
```

No actual namespace or production setting was changed. Without explicit enablement, credentials, a supported JSON-schema model and this limiter, the route serves baseline analysis. AI requests additionally require a verified active authenticated session and origin middleware. The limiter is per Cloudflare location, not a global billing cap; set provider/account budget limits separately. Baseline is public. This is not a paywall.

## Battery

kind:"battery" accepts an exact measured SoC/protocol/score, explicit duty, idle/display/peripheral watts, pack Wh/usable fraction and softwareConsumptionMultiplier (0.8–1.2). The adapter reuses existing measured SoC interpolation and software-coefficient resolution. It changes no existing simulator algorithm, coefficient, corpus or headline. Software adjustment applies to board consumption only. Unknown/out-of-range processors remain unresolved; OS/brand labels never create efficiency coefficients. AI may summarize the computed scenario; it cannot replace runtime or supply a software advantage. Provider failure retains deterministic results.

This battery endpoint is an internal integration seam, not a replacement public battery calculator. Its benchmark-power what-if scenario has not been prospectively validated as full-phone runtime. The analysis prompt and response retain Simulated.

Run node node_modules/tsx/dist/cli.mjs scripts/audit-hardware-battery.ts for a reproducible real-world comparison of the existing runtime estimator. All target phone records are excluded, no coefficients are fitted, and only the same Tom’s Guide current browsing protocol is used. Pinned evidence date: 2026-10-12. The seven-device audit resolves four devices, with 15.58% mean absolute percentage error among those four and three unresolved; references are sparse. See hardware-battery-validation-2026-11-01.json. This is limited retrospective coverage, not a claim of universal accuracy or AI improvement. No model-only number replaces public measured results.

## Advanced build sharing

The public Interactive Leaks simulator now renders Share build to Community directly with its calculated result. It snapshots the submitted input, result and Advanced settings before asynchronous calculation finishes; later edits cannot silently replace that shared configuration. Selected processor, charging, cooling and other hardware parameters persist in the published build. Publishing remains explicit and uses existing community_create_post and RLS. No new table or migration is needed.
