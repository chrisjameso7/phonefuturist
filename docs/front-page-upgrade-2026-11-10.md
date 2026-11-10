
## Elevate pass (Apple-inspired)

Requested follow-up: calmer, more premium surfaces and motion. Adds `src/styles/editorial-elevate.css` (loaded after editorial-polish) and `src/lib/reveal-client.ts`.

- Motion: staggered scroll-reveal (fade + 24px rise, 70ms stagger, ease-out-quint) on masthead, stories, explore tiles, chips, newsletter, Labs tiles and newsroom cards. Content is never hidden without JS, under reduced motion, without IntersectionObserver, or when printing; a 4s safety timeout reveals everything. Reveal classes are removed after the entrance so hovers stay instant. Softer cross-document page transition.
- Homepage: very large masthead title, pill "All stories" link, rounded story imagery with slow hover zoom (crop unchanged), headline color shift on hover, branded gradient fallback for image-less cards, explore paths as rounded tiles with gradient sheen, circular arrow and gentle lift, pill section chips.
- Newsletter: large rounded panel with a soft brand glow, rounded inputs with focus halo, pill Subscribe button.
- Labs directory: oversized title, serif intro, rounded tiles with number pills, hover lift/glow and title color shift; dashed Suggest a lab tile.
- Header actions are pills. Simulator, Studio and form controls elsewhere are unchanged; the deliberate "no hover transform" polish rule is overridden only for home tiles, Labs tiles and newsroom cards.

Verified in a production build (`astro preview`): entrance animates and settles, reduced motion shows content immediately, no page errors. Preservation audit, Astro check, 970 tests, calibration and build pass.

## Newsroom, article page and simulator pass

**Newsroom (`/articles`):** oversized title, iOS-style segmented pill tabs, featured first story spanning the row (image beside text), then a 3/2/1-column grid of tiles with rounded imagery, slow hover zoom, section kickers, clamped summaries and pill pagination. Image-less tiles get the branded gradient block. The page's three overlapping style blocks were replaced by one scoped set.

**Article page:** header aligned to the 720px reading column; section pill + confidence tag; larger headline and serif deck; meta row with byline · date · computed reading time (words ÷ 230); rounded hero; serif body with refined headings, italic pull quotes and brand list markers; rounded inline images with centered captions; pill share/like actions; editorial note and sources as rounded cards; pill "Back to the newsroom". Adds a scroll-linked reading-progress bar (CSS scroll timeline only, hidden where unsupported or under reduced motion) and a "More from the Newsroom" row (same section, up to three, current story excluded; a failed fetch hides the row).

**Simulator fixes:**
- *Load example* and *Clear* did nothing visible in Simple mode (the Simple panel keeps its own state). They now fill/reset the Simple form; the example run produces real CPU estimates instead of "Insufficient data".
- "Other phones to compare" repeated the brand ("Huawei Huawei …") and listed storage variants of the same phone. Labels now never repeat the manufacturer, storage-only variants collapse, and cards show a short name (codename/SIM/network/storage tokens dropped) with the full catalog name as a tooltip. Covered by new tests.
- On phones the result panel stayed collapsed below the form after running. It now opens and scrolls into view when a run completes (smooth unless reduced motion).
- Simple form now starts with Device name and Brand; Software tuning and Nominal cell voltage moved to the end.

**Simulator look:** segmented pill switches with a sliding thumb (reuses the existing tab indicator), pill toolbar actions, rounded builder/result cards, rounded fields with a focus halo, a larger pill Run button and a gently breathing empty-state orbit.

### Follow-up (approved)

- **Comparison phones:** suggestions now also weigh chip class and release age. `socClass()` classifies public chip names (flagship / upper-mid / entry; unknown stays unknown, it is not a performance measurement) and adds 0.35 per class step (0.2 if the catalog chip is unknown); phones older than a year drift down by 0.06/year (max 0.25). Battery and screen still gate eligibility. Carrier/region editions with identical maker, chip, battery and screen collapse to one card; names drop region and model codes, and chip names drop part numbers (full names in tooltips). Example: the flagship reference now compares with Sharp Aquos R9 Pro, iPhone 17 Pro Max and Xperia 1 VII instead of nova 13i / Moto G35.
- **Result title:** the panel bar reads "Simulation result · Estimated" (or runtime · Estimated); the duplicate inner "Simulation result / Estimated" row was removed, and the phone name appears once below.
