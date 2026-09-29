# PhoneFuturist brand themes and Lab entrance

The supplied X banner and PF phone artwork establish midnight blue, cyan circuitry and violet highlights. The site uses those colors as UI accents rather than copying the X wordmark or verification badge into the publication.

Dark: page #070c18, surface #111c30, text #edf6ff, cyan #67deed, violet #ba9bff.
Light: page #f0f6fc, surface #ffffff, text #132740, cyan #006d83, violet #7041ba.
Light-mode accents are intentionally darker for readable text and controls.

A small same-origin script in the document head resolves the saved preference before paint. The default is System; the accessible native selects in desktop navigation, the mobile menu and footer offer System, Light and Dark. Device preference changes update System mode live. Manual choices persist in localStorage and synchronize between tabs. Storage denial falls back gracefully. With JavaScript unavailable, CSS still follows the system preference. No account data or server configuration is involved.

The approved navigation geometry, optical filter, cursor interaction and session controls are preserved. Only navigation palette tokens and its colored surface are adapted. Shared publication, form, Studio and Lab styles use semantic surface/text/accent values; hero photography retains a dark scrim in both modes.

The simulator entrance uses a 1.2-second CSS portal ring and welcome message. It plays on entering the simulator route, not when changing model inputs or running calculations. It captures no focus, blocks no input, and is hidden from assistive technology; the welcome is also present in the permanent page heading area. Reduced motion and forced colors omit the overlay entirely. No animation library, continuous rendering loop or paid service is added.

Simulation mathematics, calibration/evidence, authentication, database configuration and editorial permissions are unchanged.
