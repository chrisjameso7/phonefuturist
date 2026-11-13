import type { Source } from './schema';

/**
 * Every value in the catalogue points at one of these. No URLs are invented:
 * standards are cited by name, and planning assumptions are labelled as such.
 */
export const SOURCES: Record<string, Source> = Object.fromEntries(([
  ['pf-representative', 'assumption', 'PhoneFuturist representative part class',
    'A generic part typical of its class. Dimensions, mass and ratings are planning estimates and do not describe a specific commercial product or any real device.'],
  ['pf-layout', 'assumption', 'PhoneFuturist representative internal layout',
    'Part positions follow a generic arrangement for the chosen architecture. They are not a teardown of a real device.'],
  ['pf-bom', 'catalogue', 'PhoneFuturist BOM planning catalogue', 'Cost estimates from docs/labs-component-pricing.md. Planning values, not supplier quotations.'],
  ['design-input', 'user', 'Your studio settings', 'Chassis dimensions, finishes and openings set in the 3D device studio.'],
  ['fitted-geometry', 'derivation', 'Derived from chassis geometry', 'Sized by the studio to fit the chassis you defined.'],
  ['material-density', 'standard', 'Published material densities',
    'Aluminium alloy about 2.70 g/cm³, Ti-6Al-4V about 4.43 g/cm³, stainless steel about 8.0 g/cm³, aluminosilicate glass about 2.45 g/cm³, zirconia ceramic about 6.0 g/cm³, polycarbonate about 1.20 g/cm³, copper about 8.96 g/cm³.'],
  ['usb-c-spec', 'standard', 'USB Type-C Cable and Connector Specification (USB-IF)', 'Receptacle shell opening of about 8.34 × 2.56 mm.'],
  ['usb-pd-spec', 'standard', 'USB Power Delivery Specification 3.1 (USB-IF)', 'Standard Power Range up to 100 W at 20 V and 5 A; Extended Power Range up to 240 W at 48 V and 5 A.'],
  ['etsi-4ff', 'standard', 'ETSI TS 102 221, 4FF card', 'Nano-SIM card of 12.3 × 8.8 × 0.67 mm.'],
  ['optical-format', 'derivation', 'Optical-format convention', 'Image diagonal derived from the sensor type designation, at about 16 mm per 1-inch type. Actual sensors vary slightly.'],
  ['jedec-memory', 'standard', 'JEDEC LPDDR and UFS standards', 'Interface generations named by JEDEC (LPDDR4X, LPDDR5, LPDDR5X; UFS 2.2, 3.1, 4.0). Generation names only; device speeds vary.'],
  ['mipi', 'standard', 'MIPI Alliance interface specifications', 'CSI-2 for cameras and DSI for displays. Interface names only.'],
  ['ieee-80211', 'standard', 'IEEE 802.11 / Wi-Fi Alliance generations', 'Wi-Fi 6 is 802.11ax in 2.4 and 5 GHz; Wi-Fi 6E adds 6 GHz; Wi-Fi 7 is 802.11be.'],
  ['3gpp-nr', 'standard', '3GPP NR frequency ranges', 'FR1 covers sub-7.125 GHz bands; FR2 covers millimetre-wave bands from 24.25 GHz.'],
  ['nfc-13-56', 'standard', 'ISO/IEC 14443 and 18092', 'Near-field communication at 13.56 MHz using inductive coupling.'],
  ['wpc-qi', 'standard', 'Wireless Power Consortium Qi specification', 'Inductive power transfer between planar coils. Power classes above the Qi profiles are vendor-specific.'],
  ['li-ion-typical', 'assumption', 'Typical smartphone lithium-ion pouch cell ranges',
    'Nominal voltage about 3.85 V; volumetric energy density roughly 650 to 800 Wh/L depending on chemistry. Planning ranges, not a cell datasheet.'],
  ['em-shielding', 'principle', 'Electromagnetic shielding by conductors',
    'A continuous conductive sheet attenuates both inductive power transfer and radio signals passing through it.'],
  ['oled-optics', 'principle', 'Optical under-display sensing', 'Optical under-display fingerprint readers image through the gaps of an emissive panel; an LCD backlight stack blocks that path.'],
  ['thermal-heuristic', 'assumption', 'Handheld thermal budget heuristic',
    'A passively cooled handheld can shed only a few watts continuously before its surface becomes uncomfortably warm. The budget used here is a planning heuristic scaled by surface area, not a thermal simulation.'],
] as Array<[string, Source['kind'], string, string]>).map(([id, kind, title, note]) => [id, { id, kind, title, note }]));
