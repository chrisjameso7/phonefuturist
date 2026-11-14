# About and publication identity: first stage

## Completed

- Added /about using the founder-supplied editorial copy, including the distinction between illustrative Interactive Leaks experiences and official product/laboratory results.
- Kept the title to About · PhoneFuturist, with a descriptive meta description and one main heading.
- Added section navigation, readable line lengths, responsive typography, visible keyboard focus and print styling.
- Connected the homepage About section and the shared footer to /about.
- Extracted the shared SiteFooter component, with Explore and Company navigation using existing routes and the supplied contact@phonefuturist.com address. No links to unpublished policies or team profiles are exposed.
- Desktop bottom row: © 2026 PhoneFuturist. All rights reserved. on the left; A Lumière Media & Entertainment publication. on the right. On phones the lines stack.
- Consolidated former footer CSS from global.css, observatory.css and brand-theme.css into the footer component. Removed contradictory mobile hiding rules. The mobile app navigation and product-mode footer exclusion remain intact.
- Team information request and publication deferred after the founder said to ignore the team message. No messages were sent, and no people, credentials or biographies were invented.

## Advertising and AI: existing implementation, not a completed policy audit

- Page.astro already loads AdSense using the configured publisher ID when canShowAds permits it. advertising.ts limits eligibility to editorial routes and trusted free-reader state. This work does not change advertising eligibility, scripts, CSP or billing behavior; /about is outside the ad-eligible routes.
- SponsoredSpotlight already supports Sponsored Spotlight and Advertisement labels when a campaign is supplied. A placement or script integration does not establish that a paid campaign or AdSense approval is active.
- Existing Labs and Interactive Leaks remain in the footer. No forthcoming advertising products, AI tools, subscriptions or audience statistics are presented as current offerings on the About page.
- The wider attached infrastructure brief remains a subsequent phase. Privacy, Cookie, Terms, AI Usage and Sponsored Content policies must be based on a complete data/provider audit and founder-confirmed operating practices. This About change does not establish legal compliance or substitute for that audit/review.

## Founder decisions for the next stage

- Confirm the operator/legal identity and jurisdiction separately from the supplied Lumière publication attribution; no registration, office or governing-law claim has been added.
- Confirm that the supplied contact inbox is monitored and how editorial, advertising, correction and privacy requests will be handled.
- Supply approved team profiles and publication permissions before creating Our Team.
- Verify actual analytics, advertising/consent configuration, AI processors and data sent to them, retention, newsletter/email services and any billing flow before publishing corresponding legal documents. Re-audit when planned integrations are enabled.
- Page.astro currently emits noindex for public pages across the site. This stage preserves that existing setting; search indexing requires a separate launch decision.

## Verification

- npm.cmd run check: 587 files; zero errors, warnings or hints.
- npm.cmd run build: passed. Existing oversized simulation/scene assets remain; this change adds no client JavaScript.
- Focused navigation/domain/advertising tests: 4 files, 39 tests passed.
- Full suite (npm.cmd test -- --maxWorkers=1 --testTimeout=15000): 229 files, 944 tests; 943 passed and one pre-existing source assertion rejected the earlier Simple Mode loading guard. Updated only that receipt-scope assertion (no simulator runtime change); isolated rerun passed all 4 receipt tests. Every test passed across the full run plus the focused retry; the initial full command exited 1, not a single clean full-suite run.
- Built local Cloudflare Worker /about: 200, one main heading, valid section anchors, exact copyright text, and no AdSense loader on About.
- Footer targets /, /about, /interactive-leaks, /labs and /interactive-leaks/explore returned 200. /articles resolves to the existing route and returned its 503 unavailable state because the local test uses an intentionally unreachable database fixture; no publication/database behavior was changed. The existing live /articles route was separately verified as 200. Contact uses the supplied mailto address.
- Browser checked at 360, 390, 430, 768 and 1440 pixels: no horizontal overflow, visible mobile footer, correct desktop left/right attribution, and no console errors. Screenshots are saved under .wrangler/about-desktop.png and .wrangler/about-footer-desktop.png.
- Commits: 6d52bde (About and footer), b30fc1b (receipt assertion maintenance).
- No deployment, database, authentication, secret, Cloudflare or production setting changes were made in this stage.
