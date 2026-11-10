
## Elevate pass (Apple-inspired)

Requested follow-up: calmer, more premium surfaces and motion. Adds `src/styles/editorial-elevate.css` (loaded after editorial-polish) and `src/lib/reveal-client.ts`.

- Motion: staggered scroll-reveal (fade + 24px rise, 70ms stagger, ease-out-quint) on masthead, stories, explore tiles, chips, newsletter, Labs tiles and newsroom cards. Content is never hidden without JS, under reduced motion, without IntersectionObserver, or when printing; a 4s safety timeout reveals everything. Reveal classes are removed after the entrance so hovers stay instant. Softer cross-document page transition.
- Homepage: very large masthead title, pill "All stories" link, rounded story imagery with slow hover zoom (crop unchanged), headline color shift on hover, branded gradient fallback for image-less cards, explore paths as rounded tiles with gradient sheen, circular arrow and gentle lift, pill section chips.
- Newsletter: large rounded panel with a soft brand glow, rounded inputs with focus halo, pill Subscribe button.
- Labs directory: oversized title, serif intro, rounded tiles with number pills, hover lift/glow and title color shift; dashed Suggest a lab tile.
- Header actions are pills. Simulator, Studio and form controls elsewhere are unchanged; the deliberate "no hover transform" polish rule is overridden only for home tiles, Labs tiles and newsroom cards.

Verified in a production build (`astro preview`): entrance animates and settles, reduced motion shows content immediately, no page errors. Preservation audit, Astro check, 970 tests, calibration and build pass.
