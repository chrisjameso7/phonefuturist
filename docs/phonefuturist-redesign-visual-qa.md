# PhoneFuturist redesign: visual acceptance checklist

Status: **CI green, visual review pending**. Do not merge this branch until desktop/mobile review is complete.

## Required viewport matrix

- 360 × 780: small phone
- 390 × 844: common phone
- 768 × 1024: tablet
- 1280 × 800: small desktop
- 1440 × 900: desktop

## Homepage

- Header, hero, story cards, coverage rail, and footer use one dark visual language.
- Headline, CTA, and house Spotlight remain legible over the image at every breakpoint.
- No horizontal scroll, cropped headlines, obstructed CTAs, or overlapping floating navigation.
- A paid Spotlight shows **Sponsored Spotlight** and **Advertisement**, clearly separated from editorial headlines.
- Without a paid campaign, the house Spotlight does *not* claim to be sponsored.
- All destination links navigate to the expected existing routes.

## Interactive Leaks

- Simple/Advanced mode switch is usable by keyboard and touch; active state is obvious.
- In Simple Mode, Light/Typical/Heavy selects exactly one preset.
- Device fields remain labelled and usable at 360 px; no inputs extend past their cards.
- In Advanced Mode, long metric values, tables, and cards wrap or scroll internally rather than expanding the page.
- Input changes and simulation results remain functional with no alterations to engine calculations.
- Empty results and unresolved estimates never display fabricated numeric values.
- Feedback, share, save, and account controls remain usable.

## Share cards

- Test both Simple and Advanced PNG downloads in browser.
- Confirm exported size **1080 × 1350 px**, readable headings, metrics, and footer.
- Verify long device names fit, including names with unusual punctuation.
- Verify unresolved input values display Unknown/Unresolved, not zero or made-up values.
- Confirm the on-page sharing UI matches the respective visual theme.
- Verify download and share buttons have visible focus and working feedback.

## Motion and accessibility

- Entrance animations do not leave content hidden if JS fails.
- Reduce Motion OS setting prevents nonessential transforms and entrances.
- Hover effects are cosmetic; every feature remains usable on touch.
- All important actions use 44 px or larger touch targets.
- Contrast, keyboard focus, and screen-reader names are sensible.

## Functional gates

1. `npm ci`
2. `npm run verify`
3. Browser screenshots at all viewports
4. Simple and Advanced simulations with realistic and incomplete inputs
5. Export both PNG cards and inspect the files
6. Auth / Studio navigation and article links smoke test

**Deployment gate:** Do not deploy or merge solely because CI passes. Capture screenshots and inspect rendered results first.
