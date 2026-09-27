# Liquid Graphite navigation

The previous shared `Page.astro` header was relatively positioned, so it scrolled away. Only Home had an active state. At intermediate widths, the desktop navigation wrapped onto a second row. Mobile already used a native details menu and moved account controls inside it.

## Implementation

The same shared layout remains authoritative for publication, articles, account, Studio and Interactive Leaks. No second header or authentication implementation was introduced.

- `src/styles/navigation-glass.css` defines reusable material tokens and applies them only to navigation. The outer graphite surface, darker inner rail and highlighted active lens have separate optical depth. Cream account controls remain secondary to the publication navigation.
- Sticky offset is 14 px on desktop and 8 px on compact screens, with safe-area support. The global anchor offset reserves room for the header; the existing skip link is fixed and remains above it. Header stacking level 100 sits above page imagery/simulator content, below the skip link.
- An IntersectionObserver watches a 40 px sentinel starting at 120 px. Desktop contracts after 160 px and expands below 120 px, preventing threshold jitter. A centered 56 px capsule survives the 260 ms transition; the 84 px layout box remains fixed. Branding and account controls fade out and become inert. Focus moves to navigation if a disappearing control held it. Mobile never contracts.
- Layered highlights, shadow/refraction, graphite tint, blur, saturation and brightness respond to the content underneath. No pointer glow, perpetual animation loop, scroll listener or repeated geometry query is needed.
- Below 1280 px, the entire header switches to the compact logo/menu layout. The menu has bounded viewport height, its own scroll area and safe-area padding. It is a nonmodal native disclosure, usable without JavaScript. JavaScript adds Escape/focus return, outside-click dismissal, focus-leave dismissal, expanded state and closure when switching to desktop.
- `activeNavigation` supplies the same section state to desktop and mobile, including article, Lab and Studio subroutes. The active link has a raised bordered lens and heavier type, without an underline; aria-current remains authoritative.
- Reduced motion disables transitions and smooth anchor scrolling. Reduced transparency uses the opaque fallback. Standard and prefixed backdrop filters are provided; unsupported engines retain the graphite surface. Forced-colors mode preserves outlines and system colors.

Server session/account controls, Studio visibility rules and POST sign-out forms are unchanged. Simulation models, data, versions, permissions, secrets and dependencies were not modified by this navigation feature.

## Verification

Canonical command: `npm.cmd run verify`. Route-state regressions extend the existing navigation authorization tests; no pixel-perfect tests were added. Browser review results are recorded below; this pass has no release or deployment.

The implementation is defensive for Chromium, WebKit and Firefox. Only the browser engine available in Codex is claimed as directly exercised; physical iOS safe areas and other native browsers require follow-up device testing.

## Second optical pass

`src/lib/navigation-optics.ts` creates a static rounded-rectangle displacement map when the header dimensions change. R/G encode outward boundary normals; distortion is bounded to approximately four pixels in a 12 px perimeter band. The center stays clear. The blue channel masks stronger rim diffusion. An SVG feDisplacementMap samples the actual backdrop, rather than reproducing page content. A slight center blur, stronger edge diffusion, asymmetric upper highlights and a darker lower rim communicate thickness. Navigation text is outside the filtered surface.

A conservative desktop Chromium gate enables this enhancement. CSS.supports alone cannot prove SVG backdrop rendering works. Firefox and WebKit retain the existing graphite blur approximation; engines without backdrop-filter use opaque graphite. Reduced motion, reduced transparency and forced colors disable displacement. Mobile retains the reviewed material and disclosure layout.

References: [MDN displacement model](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/feDisplacementMap), [WebKit SVG backdrop issue 245510](https://bugs.webkit.org/show_bug.cgi?id=245510), [Mozilla SVG backdrop issue 2018607](https://bugzilla.mozilla.org/show_bug.cgi?id=2018607). Browser detection is deliberately conservative, not a promise that every Chromium-derived build renders identically.

Maps are bounded to 2048 by 84 pixels with at most four cached data URLs. Canvas is used only to generate static displacement data, never to capture or animate the page. ResizeObserver updates dimensions; IntersectionObserver changes compact state. There is no scroll listener, perpetual animation frame, pixel analysis, external image service or dependency. Optical processing stays within the header surface.

Unchanged scope: account/session architecture, role checks, Studio permissions, simulation models and calibration, deployment configuration and secrets. WIP review artifacts remain outside the feature.

This second pass is intentionally uncommitted. Do not push, merge or deploy before the user's visual review.

## Visual review, 2026-09-27

Reviewed locally in the available Chromium engine at desktop 1440, breakpoint 1280/1279, and mobile 390 px. Checked top and scrolled homepage, hero imagery, simulator controls and active Lab lens, and a temporary long cream reading surface. The temporary straight-grid page compared the same filter with displacement scale 12 and 0: the boundary shifts grid detail subtly, while the center remains straight. Also compared the blur-only fallback. The temporary route and toggle were removed before final verification.

The observed desktop header layout stays 84 px high; the visible capsule is 56 px at a 14 px sticky offset. Captured the contraction in progress and verified the settled state. Escape closes mobile navigation and returns focus; crossing into desktop removes the mobile menu; crossing back restores brand/menu interaction. An account control focused before contraction transfers focus to Home. No console warnings/errors were recorded during simulator review. No horizontal overflow was observed at the desktop breakpoint or mobile size.

Limitations: this preview intentionally has no Supabase credentials, so real database-backed articles were unavailable locally. Long-reading review used explicitly labeled temporary test prose, never published journalism. Native Firefox, Safari, physical iOS safe areas and authenticated account rendering were not manually exercised in this pass; existing permission tests remain in place. Actual raster quality depends on engine/device GPU. Refraction is subtle, not a magnifying or animated distortion effect. Preference fallback rules are preserved in code; OS preference emulation was not available through the current browser controls.

Feature files: Page.astro, navigation.ts, navigation-client.ts, navigation-optics.ts, navigation-glass.css, navigation.test.ts, navigation-optics.test.ts, and this document. The first-pass layout/route tests were preserved; five new optical/hysteresis tests cover neutral interior, opposite edge direction, displacement bounds and threshold stability.

Final `npm.cmd run verify`: PASS — 85 files checked, 0 errors/warnings/hints; 18 test files and 242 tests passed; battery calibration PASS; production Astro/Cloudflare build PASS. `git diff --check` passed. The increase from 83 checked files reflects the new optical module and test file. No commit, push, merge or deployment was performed for this pass.
