# Simple Mode launch verification

Uncommitted implementation; no deployment. Fixture provider output is synthetic test data, not a live Gemini/Gemma response or a forecast of actual S27 Pro hardware. All five results have low confidence.

## Architecture

One authenticated generation request assembles server-owned evidence and reviewed analogy policies, obtains one untrusted provider proposal, strictly validates provenance and engineering constraints, freezes an accepted model, and runs all five categories. Accepted objects are tracked in-process; clients cannot submit an accepted model. No persistence or migrations. Battery uses the existing BatteryExperience engine. Typical includes 270 active minutes and 1170 standby minutes.

CPU/GPU are analogical benchmark envelopes, not executed hardware benchmarks. Thermal RC coefficients, DVFS response and charge taper are explicitly uncalibrated policy sensitivity assumptions. Surface temperature remains unknown. This is an exploratory alpha, not validated performance forecasting.

## Provider configuration

Set VIRTUAL_DEVICE_PROVIDER to gemini or gemma and VIRTUAL_DEVICE_MODEL explicitly. Gemini uses server secret GEMINI_API_KEY. Gemma uses existing CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_AI_API_TOKEN. Keep secrets in deployment secret storage, never source control or chat. No SDK, billing change, automatic fallback, retry or paid account activation is added. Operators must use an account with appropriate free-tier limits; code cannot determine account billing status. Missing configuration fails closed. Legacy battery configuration remains unchanged.

Verified official examples (2026-10-05): Gemini gemini-3.5-flash via https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent; Gemma @cf/google/gemma-4-26b-a4b-it via Cloudflare /accounts/{account}/ai/run/{model}. Model identifiers remain configuration, not simulation constants.

Sources: https://ai.google.dev/gemini-api/docs/generate-content/whats-new-gemini-3.5 and https://developers.cloudflare.com/ai/models/%40cf/google/gemma-4-26b-a4b-it/

## Acceptance outputs

### battery

- Elapsed endurance: 9.031038123167157–34.59322278298486 h

### cpu

- Single-core equivalent: 2000–3800 score
- Multi-core equivalent: 6000–12000 score
- CPU power: 3–8 W

### gpu

- 1440p High offscreen synthetic: 60–130 fps
- Synthetic GPU power: 4–10 W
- 1080p Medium generic gaming: 40–60 fps
- 1080p gaming power: 3–8 W
- 1440p High generic gaming: 30–75 fps
- 1440p gaming power: 4–10 W

### thermal

- Junction temperature at 30 min: 36.99999999331581–66.99999999999977 °C
- Sustained performance retention: 21.62162162162162–99.43342320224882 %
- Sustained CPU single-core equivalent: 432.43243243243245–3778.470081685455 score
- Sustained CPU multi-core equivalent: 1297.2972972972973–11932.010784269858 score
- Sustained synthetic GPU throughput: 12.972972972972974–129.26345016292345 fps

### charging

- 0–50% modeled charge: 16.039499999999993–49.98000000000004 min
- 0–80% modeled charge: 30.475049999999964–94.96200000000012 min
- 0–100% modeled charge: 56.94022500000005–214.9139999999983 min
- Peak battery-node temperature: 25.903166064895313–44.998640213703396 °C

## Predicted parameters

- battery.nominalVoltage (pack): 3.7–4 V; low confidence.
- battery.energy (pack): 18.87–20.4 Wh; low confidence.
- battery.usableFraction (pack): 0.85–0.98 fraction; low confidence.
- battery.averagePower (web_browsing): 2–5.5 W; low confidence.
- battery.averagePower (video_playback): 1.5–4 W; low confidence.
- battery.averagePower (gaming): 7.08–18.5 W; low confidence.
- battery.averagePower (camera_use): 3–8 W; low confidence.
- battery.averagePower (standby): 0.08–0.5 W; low confidence.
- cpu.singleCore (cpu-burst): 2000–3800 score; low confidence.
- cpu.multiCore (cpu-burst): 6000–12000 score; low confidence.
- cpu.power (cpu-burst): 3–8 W; low confidence.
- gpu.frameRate (gpu-synthetic): 60–130 fps; low confidence.
- gpu.frameRate (gaming-balanced): 40–60 fps; low confidence.
- gpu.frameRate (gaming-demanding): 30–75 fps; low confidence.
- gpu.power (gpu-synthetic): 4–10 W; low confidence.
- gpu.power (gaming-balanced): 3–8 W; low confidence.
- gpu.power (gaming-demanding): 4–10 W; low confidence.
- thermal.resistance (sustained-combined): 3–6 K/W; low confidence.
- thermal.resistance (charging): 1–3 K/W; low confidence.
- thermal.capacitance (sustained-combined): 10–30 J/K; low confidence.
- thermal.capacitance (charging): 100–250 J/K; low confidence.
- thermal.throttleTemperature (sustained-combined): 70–90 degC; low confidence.
- thermal.throttleTemperature (charging): 40–45 degC; low confidence.
- thermal.sustainedPower (sustained-combined): 4–7 W; low confidence.
- charging.peakPower (charging): 25–45 W; low confidence.
- charging.efficiency (charging): 0.75–0.93 fraction; low confidence.
- charging.acceptedPower (charging): 12–30 W; low confidence.
- charging.acceptedPower (charging): 8–20 W; low confidence.
- charging.acceptedPower (charging): 3–10 W; low confidence.
- charging.acceptedPower (charging): 1–4 W; low confidence.

## Limitations

No live AI request or production CPU-limit verification was performed. Per-account request limiting is best-effort per Worker isolate, not a durable global quota. Curated policies currently cover a large flagship slab-phone cohort; unsupported categories remain unresolved. No percentage accuracy is claimed.

## Working-tree files

- `data/virtual-device/battery-evidence.json`
- `data/virtual-device/launch-evidence.json`
- `docs/SIMPLE_MODE_LAUNCH.md`
- `docs/adr/adr-013.md`
- `src/components/interactive-leaks/InteractiveLeaksSimulator.tsx`
- `src/components/interactive-leaks/VirtualDeviceWorkspace.tsx`
- `src/lib/simulation/inference-settings.ts`
- `src/lib/simulation/providers/google-virtual-device-provider.ts`
- `src/lib/simulation/virtual-battery-policy.ts`
- `src/lib/simulation/virtual-battery-runner.ts`
- `src/lib/simulation/virtual-device-evidence.ts`
- `src/lib/simulation/virtual-device-inference.ts`
- `src/lib/simulation/virtual-device-prompt.ts`
- `src/lib/simulation/virtual-device.ts`
- `src/lib/simulation/virtual-launch-client.ts`
- `src/lib/simulation/virtual-launch-policy.ts`
- `src/lib/simulation/virtual-launch-runners.ts`
- `src/lib/simulation/virtual-launch-service.ts`
- `src/pages/api/simulation/virtual-device.ts`
- `src/styles/lab-simulator.css`
- `tests/fixtures/virtual-device.ts`
- `tests/simulation-alpha.test.ts`
- `tests/virtual-battery-runner.test.ts`
- `tests/virtual-google-provider.test.ts`
- `tests/virtual-launch-api.test.ts`
- `tests/virtual-launch.test.ts`

## Verification

- Astro: 134 files, 0 errors, 0 warnings, 0 hints.
- Vitest: 507 tests passed across 34 files.
- Calibration: passed (5 devices, 8 measurements).
- Local browser verification remains blocked by the Astro development server startup timeout. API/service/provider integration is covered with synthetic provider responses; no live provider run is claimed.
- Production build: passed; full `npm.cmd run verify` exited 0.
