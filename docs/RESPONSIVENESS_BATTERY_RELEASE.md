# PhoneFuturist reliability and responsiveness release

Date: 26 October 2026. Branch: `fix/simulation-validation-followup`.

## Changes

- Signed-in page requests start the verified identity lookup and read-only access lookup concurrently, removing a serial database round trip. Identity must still verify before roles are used. Private responses remain uncached; failed verification still blocks protected pages.
- Public navigation links opt into Astro's intent prefetching. Account, Studio, authentication and write routes are excluded. Page entrance motion is shortened from 220ms to 140ms. Actual gains depend on network latency and browser prefetch support.
- Both simulation modes show a spinning run indicator and an animated result placeholder while the calculation worker is pending. Repeated runs are disabled. The result replaces the placeholder immediately when available; there is no artificial delay or invented completion percentage. Reduced-motion users receive a static indicator.
- Battery cohorts count independent marketed models rather than storage variants. Model aliases cannot leak into their own held-out evaluation; Plus models remain distinct. Duplicate readings no longer inflate a single phone's weight or reported independence.
- Invalid capacity, energy and drain arithmetic is withheld. Overflowing daily energy budgets cannot claim zero or infinite days of battery life.
- Existing share-card and worker fixes are included: six Advanced receipts, no Advanced summary card, missing voltage remains unknown, stale results invalidate, and failed/hung workers recover with an error.
- Feedback now uses a native modal dialog above sticky navigation, with Escape dismissal and focus restoration, plus a bounded submission timeout. The approved feedback migration has already been applied; its operations record is in the repository.

## Battery accuracy: measured limitation

The reconstructed same-protocol historical validation has 291 predictions: **16.70% mean absolute percentage error**, **70.10% within 20%**. Gaming MAPE is **22.41%**. The existing >=80% within-20% accuracy gate still fails. Leave-one-model-out checks exclude aliases and report no model leakage. These changes correct reliability and validation defects; they do not establish a 99%-accurate real-world battery model.

No reference measurements or acceptance thresholds were changed. Better accuracy requires representative independent measurements under documented workloads, brightness, radio, firmware and battery health conditions. PhoneArena's lab controls use fixed brightness and Wi-Fi; uncontrolled daily use is a different target. Source: https://www.phonearena.com/howdowerate/battery

## Validation

Earlier simulation batches and targeted reruns covered 187 suites / 748 tests for the share-card release. Follow-up regression groups passed 71 tests in 14 suites covering battery/model identity, loading, navigation, session safety and feedback. This is not a claim that the complete repository suite ran in one invocation.

- Final `npm run check`: 501 files, zero errors/warnings/hints.
- Final `npm run build`: passed, 2429.0 KiB client JS across 22 files; the existing >500 kB simulator asset warning remains.
- Rebuilt browser check: Simple and Advanced runs complete without alerts; Advanced exposes exactly six section receipts. Native feedback dialog is in the browser top layer; Escape closes it and restores focus to Beta feedback. Community navigation works. No desktop horizontal overflow.
- The browser viewport override did not take effect on the verification tab (it remained 1280px), so this release does not claim a fresh mobile viewport pass. Prior mobile verification remains documented for the earlier share-card/community changes.
- Loading status and duplicate-run prevention passed component tests. Browser calculations completed before a loading-state screenshot could be captured; no artificial delay was added for a demonstration.

Deployment uses the existing `phonefuturist-dev` Worker under the user's explicit deploy instruction. Deployment identity and live smoke results are appended to the delivered report.
