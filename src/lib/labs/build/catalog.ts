/**
 * Build a Phone — component catalogue.
 *
 * Almost every entry is a representative class part: a generic component with
 * planning dimensions, not a named product. Where a value comes from a public
 * standard it is marked `documented` and cites that standard. Nothing here
 * describes the internals of a real device.
 */
import type { ComponentDefinition, ComponentInterface, Confidence, Electrical, GeometryLevel, Spec, Subsystem } from './schema';

const REP = 'pf-representative';
type SpecTuple = [label: string, value: string | number, unit?: string, confidence?: Confidence, source?: string];
type Extra = {
  specs?: SpecTuple[]; traits?: ComponentDefinition['traits']; interfaces?: Array<ComponentInterface | ComponentInterface['type']>;
  requires?: string[]; contains?: Array<[string, string]>; electrical?: Omit<Electrical, 'confidence' | 'source'> & Partial<Pick<Electrical, 'confidence' | 'source'>>;
  bom?: [group: string, option: string]; builder?: string; options?: Record<string, number | string | boolean>; level?: GeometryLevel;
  materials?: string[]; fitted?: boolean; sources?: string[]; manufacturer?: string; model?: string; dimensionConfidence?: Confidence; dimensionSource?: string;
};

const list: ComponentDefinition[] = [];
function add(subsystem: Subsystem, kind: string, id: string, name: string, description: string, dimensions: [number, number, number], weightG: number, extra: Extra = {}) {
  const specs: Spec[] = (extra.specs ?? []).map(([label, value, unit, confidence, source]) => ({ label, value, unit, confidence: confidence ?? 'estimated', source: source ?? REP }));
  const sources = new Set<string>([REP, ...(extra.sources ?? []), ...specs.map(s => s.source)]);
  if (extra.fitted) sources.add('fitted-geometry');
  if (extra.bom) sources.add('pf-bom');
  list.push({
    id, kind, subsystem, name, description,
    manufacturer: extra.manufacturer ?? null, model: extra.model ?? null, representative: !extra.manufacturer,
    dimensions, dimensionBasis: { confidence: extra.dimensionConfidence ?? 'estimated', source: extra.dimensionSource ?? (extra.fitted ? 'fitted-geometry' : REP), fitted: extra.fitted },
    weightG, materials: extra.materials ?? [], specs,
    electrical: extra.electrical ? { confidence: 'estimated', source: REP, ...extra.electrical } : undefined,
    interfaces: (extra.interfaces ?? []).map(i => typeof i === 'string' ? { type: i } : i),
    requires: extra.requires ?? [], traits: extra.traits ?? {},
    contains: (extra.contains ?? []).map(([label, text]) => ({ label, description: text })),
    asset: { type: 'procedural', builder: extra.builder ?? 'block', level: extra.level ?? 1, options: extra.options },
    sources: [...sources], bom: extra.bom ? { group: extra.bom[0], option: extra.bom[1] } : undefined,
  });
}

// ── Mechanical construction ────────────────────────────────────────────────
// Structural parts are fitted to the chassis; their mass is computed from
// volume and published material density in assembly.ts.
const frames: Array<[string, string, string, number, boolean, string]> = [
  ['plastic', 'Polycarbonate frame', 'Polycarbonate', 1.2, false, 'A moulded polymer perimeter. Radio-transparent, so antennas can sit behind it without breaks.'],
  ['steel', 'Stainless-steel frame', 'Stainless steel', 8.0, true, 'A machined stainless-steel band. Stiff and heavy; the band itself is segmented to act as antennas.'],
  ['matteAluminium', 'Aluminium frame, matte', 'Aluminium alloy', 2.7, true, 'A machined aluminium band with a bead-blasted anodised surface.'],
  ['glossyAluminium', 'Aluminium frame, polished', 'Aluminium alloy', 2.7, true, 'A machined aluminium band with a polished anodised surface.'],
  ['brushedTitanium', 'Titanium frame, brushed', 'Ti-6Al-4V titanium', 4.43, true, 'A titanium alloy band, usually bonded to an aluminium inner structure. Brushed surface.'],
  ['glossyTitanium', 'Titanium frame, polished', 'Ti-6Al-4V titanium', 4.43, true, 'A titanium alloy band with a polished surface.'],
];
for (const [key, name, material, density, conductive, text] of frames) add('mechanical', 'frame', 'frame-' + key, name, text + ' Carries the buttons, port openings and antenna breaks.', [0, 0, 0], 0, {
  fitted: true, builder: 'frame', materials: [material], traits: { density, conductive, finish: key }, interfaces: ['mechanical'],
  specs: [['Material density', density, 'g/cm³', 'documented', 'material-density'], ['Wall thickness', 2.2, 'mm']],
  ...(key.includes('itanium') ? { bom: ['chassis', 'titanium'] as [string, string] } : key.includes('luminium') ? { bom: ['chassis', 'aluminum'] as [string, string] } : {}), sources: ['material-density'],
});
add('mechanical', 'midplate', 'midplate-aluminium', 'Midframe plate', 'A stamped and machined aluminium plate joined to the frame. It separates the display from the electronics, stiffens the phone and gives every board, bracket and screw something to fasten to.', [0, 0, .5], 0, {
  fitted: true, builder: 'midplate', materials: ['Aluminium alloy'], traits: { density: 2.7 }, interfaces: ['mechanical', 'thermal-contact'],
  specs: [['Plate thickness', .5, 'mm'], ['Material density', 2.7, 'g/cm³', 'documented', 'material-density']], sources: ['material-density'],
});
const rears: Array<[string, string, string, number, boolean, number, string, string]> = [
  ['frostedGlass', 'Frosted glass rear cover', 'Aluminosilicate glass', 2.45, false, .6, 'glass-rear', 'Chemically strengthened glass with an etched matte surface.'],
  ['glossyGlass', 'Glossy glass rear cover', 'Aluminosilicate glass', 2.45, false, .6, 'glass-rear', 'Chemically strengthened glass with a polished surface.'],
  ['frostedPlastic', 'Polycarbonate rear cover', 'Polycarbonate', 1.2, false, .8, 'polycarbonate-rear', 'A moulded polymer cover with a frosted surface.'],
  ['ceramic', 'Ceramic rear cover', 'Zirconia ceramic', 6.0, false, .6, 'ceramic-rear', 'A sintered zirconia cover. Hard, heavy and radio-transparent.'],
  ['titanium', 'Titanium rear cover', 'Ti-6Al-4V titanium', 4.43, true, .5, 'aluminum-rear', 'A brushed titanium sheet. Conductive, so it blocks wireless charging and rear-mounted antennas.'],
  ['steel', 'Steel rear cover', 'Stainless steel', 8.0, true, .5, 'aluminum-rear', 'A polished stainless-steel sheet. Conductive, so it blocks wireless charging and rear-mounted antennas.'],
];
for (const [key, name, material, density, conductive, thickness, bom, text] of rears) add('mechanical', 'rear-cover', 'rear-' + key, name, text + ' Bonded to the frame with a perimeter adhesive that also seals against water.', [0, 0, thickness], 0, {
  fitted: true, builder: 'exterior-rear', materials: [material], traits: { density, conductive, finish: key }, interfaces: ['mechanical'],
  specs: [['Panel thickness', thickness, 'mm'], ['Material density', density, 'g/cm³', 'documented', 'material-density'], ['Passes radio and inductive power', conductive ? 'No' : 'Yes', undefined, 'documented', 'em-shielding']],
  bom: ['back', bom], sources: ['material-density', 'em-shielding'],
});
add('mechanical', 'camera-housing', 'camera-housing', 'Camera housing and lens glass', 'The raised metal surround and the cover glass over each rear lens. It protects the lens stacks and sets how far each module can protrude.', [0, 0, 0], 0, {
  fitted: true, builder: 'exterior-camera', materials: ['Aluminium alloy', 'Sapphire or strengthened glass'], traits: { density: 2.7 }, interfaces: ['mechanical'],
  specs: [['Protrusion', 'Set in the studio', undefined, 'user', 'design-input']], sources: ['design-input'],
});
add('mechanical', 'buttons', 'buttons-side', 'Power and volume buttons', 'Machined key caps that press dome switches on the button flex through sealed openings in the frame.', [1.3, 40, 3], .9, {
  builder: 'exterior-buttons', materials: ['Frame alloy'], interfaces: ['mechanical'], requires: ['button-flex'],
});
add('mechanical', 'sim-tray', 'sim-tray-nano', 'Nano-SIM tray', 'A removable tray carrying one 4FF card. A rubber gasket around its face seals the frame opening.', [10.2, 14.6, 1.2], .5, {
  builder: 'sim-tray', materials: ['Aluminium alloy', 'Silicone gasket'], interfaces: ['mechanical'], requires: ['sim-reader'],
  specs: [['Card format', '4FF nano-SIM, 12.3 × 8.8 × 0.67 mm', undefined, 'documented', 'etsi-4ff']], sources: ['etsi-4ff'],
});
add('mechanical', 'screws', 'screws-m1-4', 'Machine screws', 'Small pan-head screws that fasten the board, brackets and connector covers to the midframe. Shown as a representative set; real phones use several lengths and drive types.', [1.8, 1.8, 1.6], .6, {
  builder: 'screw', materials: ['Stainless steel'], interfaces: ['mechanical'], specs: [['Representative count', 14], ['Thread', 'M1.4 class']],
});
add('mechanical', 'brackets', 'bracket-set', 'Connector retention brackets', 'Thin steel plates screwed over board-to-board connectors so they cannot lift when the phone flexes or is dropped.', [12, 7, .3], .7, {
  builder: 'bracket', materials: ['Stainless steel'], interfaces: ['mechanical'],
});
add('mechanical', 'seals', 'seal-kit', 'Gaskets and waterproofing seals', 'Silicone rings and membrane vents around the port, SIM tray, buttons, microphones and speakers. Together with the perimeter adhesives they keep water out.', [0, 0, .4], .5, {
  fitted: true, builder: 'seal-ring', materials: ['Silicone', 'ePTFE membrane'], interfaces: ['mechanical'], bom: ['sealing', 'water-resistant-phone-seal-kit'],
});
add('mechanical', 'rear-adhesive', 'rear-adhesive', 'Rear cover adhesive', 'A die-cut pressure-sensitive adhesive frame bonding the rear cover to the chassis. It has to be softened with heat before the cover can be removed.', [0, 0, .15], .3, {
  fitted: true, builder: 'adhesive-ring', materials: ['Pressure-sensitive adhesive'], interfaces: ['mechanical'],
});

// ── Display ────────────────────────────────────────────────────────────────
const glasses: Array<[string, string, string, string]> = [
  ['antiReflective', 'Cover glass, anti-reflective', 'anti-reflective-cover-glass', 'Strengthened cover glass with a multi-layer anti-reflective coating.'],
  ['nanoTexture', 'Cover glass, nano-texture', 'matte-etched-finish', 'Strengthened cover glass with an etched nano-scale texture that scatters reflections.'],
  ['glossy', 'Cover glass, glossy', 'strengthened-flagship-glass', 'Strengthened cover glass with an oleophobic coating.'],
];
for (const [key, name, bom, text] of glasses) add('display', 'cover-glass', 'glass-' + key, name, text + ' The outermost layer of the display stack; a black ink border on its underside hides the panel edges.', [0, 0, .6], 0, {
  fitted: true, builder: 'cover-glass', materials: ['Aluminosilicate glass'], traits: { density: 2.45, finish: key }, interfaces: ['mechanical'],
  specs: [['Thickness', .6, 'mm'], ['Material density', 2.45, 'g/cm³', 'documented', 'material-density']], bom: ['glass', bom], sources: ['material-density'],
});
add('display', 'touch-layer', 'touch-oncell', 'Touch digitizer', 'A grid of transparent electrodes that senses capacitance changes under a finger. On modern OLED panels it is deposited on the panel encapsulation rather than being a separate sheet.', [0, 0, .05], 0, {
  fitted: true, builder: 'film', options: { tint: 'touch' }, materials: ['Transparent conductor mesh'], traits: { density: 1.4 }, interfaces: ['i2c'], requires: ['panel'], bom: ['touch', 'phone-capacitive-digitizer'],
});
add('display', 'polarizer', 'polarizer-circular', 'Circular polarizer', 'A polarizing film that stops ambient light reflecting off the metal layers of the panel, which keeps blacks dark outdoors.', [0, 0, .1], 0, {
  fitted: true, builder: 'film', options: { tint: 'polarizer' }, materials: ['Polarizing film'], traits: { density: 1.3 }, interfaces: ['mechanical'], requires: ['panel'],
});
const panels: Array<[string, string, string, number, number, string, string]> = [
  ['ltpo-oled', 'LTPO OLED panel', 'oled', .35, 1, 'ltpo', 'A flexible OLED panel whose LTPO backplane can slow its refresh rate to save power on static content.'],
  ['ltps-oled', 'LTPS OLED panel', 'oled', .35, 1.15, 'ltps-oled', 'A flexible OLED panel on a fixed-rate LTPS backplane. Each pixel emits its own light, so black areas draw almost no power.'],
  ['ips-lcd', 'IPS LCD panel with backlight', 'lcd', 1.3, 1.5, 'ips-lcd', 'A liquid-crystal panel with an LED edge backlight and light-guide stack. Thicker than OLED and opaque to under-display sensors.'],
];
for (const [key, name, tech, thickness, power, bom, text] of panels) add('display', 'panel', 'panel-' + key, name, text, [0, 0, thickness], 0, {
  fitted: true, builder: 'panel', options: { tech }, materials: tech === 'oled' ? ['Polyimide substrate', 'Organic emitters', 'Thin-film encapsulation'] : ['Glass substrates', 'Liquid crystal', 'Backlight unit'],
  traits: { tech, density: tech === 'oled' ? 1.6 : 2.2, thickness }, interfaces: ['mipi-dsi'], requires: ['ddic', 'display-flex'],
  specs: [['Panel technology', tech === 'oled' ? 'Emissive OLED' : 'Transmissive LCD'], ['Stack thickness', thickness, 'mm']],
  electrical: { activeW: power }, bom: ['display', bom],
});
add('display', 'backplane', 'backplane-tft', 'Display backplane', 'The thin-film transistor array that addresses each sub-pixel. It is built into the panel substrate and shown here as its own layer for inspection.', [0, 0, .05], 0, {
  fitted: true, builder: 'film', options: { tint: 'backplane' }, materials: ['Thin-film transistors on polyimide'], traits: { density: 1.5 }, interfaces: ['mechanical'], requires: ['panel'],
});
add('display', 'display-support', 'display-support', 'Display support and cushion layer', 'A copper or graphite sheet on embossed foam behind the panel. It spreads heat, shields the panel electrically and cushions it against the midframe.', [0, 0, .2], 0, {
  fitted: true, builder: 'film', options: { tint: 'copper' }, materials: ['Copper foil', 'Graphite', 'Embossed foam'], traits: { density: 2.6 }, interfaces: ['thermal-contact'],
});
add('display', 'display-adhesive', 'display-adhesive', 'Display adhesive', 'A die-cut adhesive frame that bonds the display assembly to the front of the chassis and forms the front water seal.', [0, 0, .15], .3, {
  fitted: true, builder: 'adhesive-ring', materials: ['Pressure-sensitive adhesive'], interfaces: ['mechanical'],
});
add('display', 'ddic', 'ddic-cop', 'Display driver IC', 'The chip that converts the image stream from the processor into the voltages driving each pixel row and column. Mounted on the folded tail of the panel.', [28, 1.4, .3], .1, {
  builder: 'driver-ic', materials: ['Silicon die'], interfaces: ['mipi-dsi'], requires: ['panel'], electrical: { activeW: .15 },
});
add('display', 'display-flex', 'display-flex', 'Display flex cable', 'A flexible printed circuit folded behind the panel. It carries the image stream, touch signals and panel power to a connector on the logic board.', [16, 24, .2], .4, {
  builder: 'flex', options: { shape: 'display' }, materials: ['Polyimide', 'Copper'], interfaces: ['mipi-dsi', 'i2c', 'board-to-board'],
});

// ── Processing and motherboard ─────────────────────────────────────────────
const boards: Array<[string, string, number, number, string, string]> = [
  ['pcb-8l', 'Logic board, 8-layer', 1, .7, 'compact-8-layer-pcb', 'A single rigid board. Cheapest to build, but every chip has to fit on one level.'],
  ['pcb-10l-hdi', 'Logic board, 10-layer HDI', 1, .7, '10-layer-hdi-pcb', 'A high-density board with microvias, allowing finer chip packages and tighter routing on one level.'],
  ['pcb-12l-stacked', 'Stacked logic board', 2, .6, '12-layer-stacked-hdi', 'Two boards soldered face to face around an interposer frame. Doubles the mounting area in the same footprint at the cost of height.'],
];
for (const [id, name, tiers, thickness, bom, text] of boards) add('processing', 'pcb', id, name, text, [0, 0, thickness], 0, {
  fitted: true, builder: 'pcb', options: { tiers }, materials: ['FR-4 class laminate', 'Copper', 'Solder mask'], traits: { tiers, density: 2.0, thickness },
  interfaces: ['board-to-board', 'mechanical'], specs: [['Mounting levels', tiers], ['Board thickness', thickness, 'mm']], bom: ['board', bom],
});
const socs: Array<[string, string, [number, number, number], number, number, Record<string, number | string>, string | null, string]> = [
  ['ap-flagship', 'Application processor, flagship class', [14, 14, .9], 6.5, 11, { cameras: 4, maxSensorMp: 320, ram: 'lpddr5x,lpddr5', ufs: 4.0, usb: 3.2, modem: 'mmwave', tier: 3 }, 'flagship',
    'A leading-node system-on-chip. One die holds the CPU cores, GPU, neural processor, image signal processor and, in most designs, the cellular modem.'],
  ['ap-sub', 'Application processor, upper-mid class', [12.5, 12.5, .9], 4.2, 7, { cameras: 3, maxSensorMp: 200, ram: 'lpddr5x,lpddr5', ufs: 4.0, usb: 3.2, modem: 'sub6', tier: 2 }, 'sub',
    'A system-on-chip one step below the flagship tier, with fewer high-performance cores and a smaller GPU.'],
  ['ap-efficiency', 'Application processor, efficiency class', [11, 11, .9], 2.6, 4.5, { cameras: 3, maxSensorMp: 108, ram: 'lpddr5,lpddr4x', ufs: 3.1, usb: 2.0, modem: 'sub6', tier: 1 }, null,
    'A cost- and power-optimised system-on-chip for mainstream phones.'],
];
for (const [id, name, dims, sustained, peak, traits, bom, text] of socs) add('processing', 'soc', id, name, text, dims, .4, {
  builder: 'chip', options: { style: 'soc' }, materials: ['Silicon die', 'Organic substrate', 'Solder balls'], traits,
  interfaces: [{ type: 'mipi-csi', count: traits.cameras as number }, 'mipi-dsi', { type: 'usb-' + (traits.usb === 3.2 ? '3.2' : '2.0') as 'usb-3.2' }, 'i2c', 'spi', 'i2s', 'thermal-contact'],
  requires: ['ram', 'storage', 'pmic', 'pcb'],
  contains: [['CPU', 'General-purpose processor cores. A block on the die, not a separate part.'], ['GPU', 'Graphics processor. A block on the die.'], ['NPU', 'Neural-network accelerator. A block on the die.'], ['ISP', 'Image signal processor that turns raw sensor data into pictures. A block on the die.'], ...(traits.modem ? [['Modem', 'Cellular baseband, integrated on the die in this class.'] as [string, string]] : [])],
  specs: [['Concurrent camera interfaces', traits.cameras], ['Largest supported sensor', traits.maxSensorMp, 'MP'], ['Memory interfaces', String(traits.ram).toUpperCase().replace(',', ', '), undefined, 'estimated'], ['Storage interface', 'UFS ' + (traits.ufs as number).toFixed(1)], ['Sustained heat under load', sustained, 'W']],
  electrical: { activeW: sustained * .45, sustainedHeatW: sustained, peakW: peak }, ...(bom ? { bom: ['silicon', bom] as [string, string] } : {}),
});
const rams: Array<[number, 'lpddr4x' | 'lpddr5' | 'lpddr5x', string]> = [[6, 'lpddr4x', '6-gb-lpddr4x'], [8, 'lpddr5', '8-gb-lpddr5'], [8, 'lpddr5x', '8-gb-lpddr5x'], [12, 'lpddr5x', '12-gb-lpddr5x'], [16, 'lpddr5x', '16-gb-lpddr5x'], [24, 'lpddr5x', '24-gb-lpddr5x']];
for (const [gb, type, bom] of rams) add('processing', 'ram', `ram-${gb}-${type}`, `${gb} GB ${type.toUpperCase()} memory`, 'Low-power DRAM. In phones it is usually soldered directly on top of the application processor (package-on-package) to keep the signal paths short.', [12.4, 12.4, .7], .3, {
  builder: 'chip', options: { style: 'memory' }, materials: ['Stacked silicon dies', 'Mould compound'], traits: { gb, type }, interfaces: [type], requires: ['soc'],
  specs: [['Capacity', gb, 'GB', 'documented', REP], ['Interface generation', type.toUpperCase(), undefined, 'documented', 'jedec-memory']], electrical: { activeW: .25 + gb * .012 }, bom: ['ram', bom], sources: ['jedec-memory'],
});
const stores: Array<[number, number, string]> = [[128, 2.2, '128-gb-ufs-2-2'], [256, 3.1, '256-gb-ufs-3-1'], [256, 4.0, '256-gb-ufs-4-0'], [512, 4.0, '512-gb-ufs-4-0'], [1024, 4.0, '1-tb-ufs-4-0']];
for (const [gb, ufs, bom] of stores) add('processing', 'storage', `ufs-${gb}-${ufs.toFixed(1)}`, `${gb >= 1024 ? '1 TB' : gb + ' GB'} UFS ${ufs.toFixed(1)} storage`, 'NAND flash with a built-in controller in one soldered package. It holds the operating system, apps and user data.', [11.5, 13, .9], .5, {
  builder: 'chip', options: { style: 'storage' }, materials: ['3D NAND dies', 'Controller die', 'Mould compound'], traits: { gb, ufs }, interfaces: [`ufs-${ufs.toFixed(1)}` as 'ufs-4.0'], requires: ['soc'],
  specs: [['Capacity', gb, 'GB', 'documented', REP], ['Interface generation', 'UFS ' + ufs.toFixed(1), undefined, 'documented', 'jedec-memory']], electrical: { activeW: .3 }, bom: ['storage', bom], sources: ['jedec-memory'],
});
add('processing', 'modem', 'modem-5g-discrete', 'Discrete 5G modem', 'A separate cellular baseband processor, used when the application processor has no modem of its own. Takes board area and adds heat.', [10.5, 10.5, .85], .3, {
  builder: 'chip', options: { style: 'modem' }, materials: ['Silicon die', 'Organic substrate'], traits: { modem: 'mmwave' }, interfaces: ['pcie', 'rf-feed'], requires: ['rf-transceiver'],
  electrical: { activeW: .9, sustainedHeatW: .8, peakW: 2.5 }, bom: ['modem', '5g-flagship-discrete-modem'],
});
const chip = (kind: string, id: string, name: string, text: string, dims: [number, number, number], subsystem: Subsystem, extra: Extra = {}) =>
  add(subsystem, kind, id, name, text, dims, +(dims[0] * dims[1] * dims[2] * .0025).toFixed(2), { builder: 'chip', materials: ['Silicon die', 'Mould compound'], ...extra, options: { style: 'generic', ...extra.options } });
chip('pmic', 'pmic-main', 'Power-management IC', 'Generates and sequences the many low-voltage rails the processor, memory and radios need from the single battery voltage.', [5.6, 5.6, .7], 'processing', { interfaces: ['i2c', 'battery-power'], electrical: { sustainedHeatW: .35 }, options: { style: 'power' }, bom: ['pmic', 'flagship-pmic-set'] });
chip('rf-transceiver', 'rf-transceiver', 'RF transceiver', 'Converts between the digital baseband signals of the modem and the radio-frequency signals sent to the front-end and antennas.', [6.2, 6.2, .7], 'connectivity', { interfaces: ['rf-feed', 'spi'], electrical: { sustainedHeatW: .3 }, requires: ['pa-module'] });
for (const [gen, text, bom] of [['6', 'Wi-Fi 6 in the 2.4 and 5 GHz bands.', 'wi-fi-6-bluetooth-module'], ['6E', 'Wi-Fi 6E, adding the 6 GHz band.', 'wi-fi-6e-bluetooth-module'], ['7', 'Wi-Fi 7 with wider channels and multi-link operation.', 'wi-fi-7-bluetooth-module']] as Array<[string, string, string]>)
  chip('wifi-bt', 'wifi-' + gen.toLowerCase(), `Wi-Fi ${gen} and Bluetooth controller`, `A combined wireless LAN and Bluetooth radio. ${text}`, [5.2, 5.6, .75], 'connectivity', { traits: { wifi: gen }, interfaces: ['pcie', 'sdio', 'rf-feed'], requires: ['antenna-wifi'], electrical: { activeW: .4, sustainedHeatW: .25 }, specs: [['Wi-Fi generation', 'Wi-Fi ' + gen, undefined, 'documented', 'ieee-80211']], bom: ['wifi', bom], sources: ['ieee-80211'] });
chip('gnss', 'gnss-receiver', 'GNSS receiver', 'Receives satellite navigation signals and computes position. Often folded into the modem or Wi-Fi chip; shown as its own part here.', [3.2, 3.2, .6], 'connectivity', { interfaces: ['spi', 'rf-feed'], requires: ['antenna-gnss'], electrical: { activeW: .05 } });
for (const [id, name, text, bom, uwb] of [['nfc-controller', 'NFC controller', 'Drives the 13.56 MHz antenna loop for contactless payments and tag reading.', 'nfc-module', false], ['nfc-se', 'NFC controller with secure element', 'NFC controller packaged with a tamper-resistant secure element that stores payment credentials.', 'nfc-secure-element', false], ['nfc-uwb', 'NFC and ultra-wideband kit', 'NFC controller plus an ultra-wideband radio for precise ranging.', 'nfc-uwb-kit', true]] as Array<[string, string, string, string, boolean]>)
  chip('nfc', id, name, text, [4, 4, .6], 'connectivity', { traits: { uwb }, interfaces: ['i2c', 'rf-feed'], requires: ['antenna-nfc'], specs: [['Carrier frequency', 13.56, 'MHz', 'documented', 'nfc-13-56']], bom: ['proximity', bom], sources: ['nfc-13-56'] });
chip('secure-element', 'secure-processor', 'Security processor', 'An isolated microcontroller that stores keys and biometric templates and checks that the system software has not been altered.', [3.4, 3.4, .6], 'processing', { interfaces: ['spi', 'i2c'], options: { style: 'secure' } });
chip('audio-codec', 'audio-codec', 'Audio codec', 'Converts between digital audio and the analogue signals of microphones and speakers.', [3.6, 3.6, .6], 'processing', { interfaces: ['i2s', 'i2c'] });
add('processing', 'clock', 'clock-set', 'Clock generators', 'A temperature-compensated crystal oscillator for the radios and a 32.768 kHz crystal for the real-time clock. Every other clock in the phone is derived from these.', [2, 1.6, .7], .02, {
  builder: 'crystal', materials: ['Quartz', 'Ceramic package', 'Metal lid'], interfaces: ['mechanical'], specs: [['Real-time clock crystal', 32.768, 'kHz', 'documented', REP]],
});
add('processing', 'shield', 'shield-compute', 'Processor shield can', 'A folded metal lid soldered over the processor, memory and power chips. It contains their electrical noise and doubles as a heat spreader.', [0, 0, 1.5], .9, {
  fitted: true, builder: 'shield', materials: ['Nickel-silver'], interfaces: ['thermal-contact', 'mechanical'], traits: { group: 'compute' },
});
add('connectivity', 'shield', 'shield-rf', 'RF shield can', 'A metal lid over the radio chips that keeps their signals from interfering with each other and the rest of the board.', [0, 0, 1.4], .7, {
  fitted: true, builder: 'shield', materials: ['Nickel-silver'], interfaces: ['mechanical'], traits: { group: 'rf' },
});
for (const [id, name, text, builder, count] of [
  ['passive-capacitors', 'Capacitor cluster', 'Multilayer ceramic capacitors that smooth every supply rail. A phone carries several hundred; this is a representative cluster, not a counted bill of materials.', 'mlcc', 46],
  ['passive-resistors', 'Resistor cluster', 'Chip resistors that set bias points, pull-ups and terminations. Shown as a representative cluster.', 'resistor', 28],
  ['passive-inductors', 'Inductor cluster', 'Power inductors for the switching regulators around the power-management chip. Shown as a representative cluster.', 'inductor', 9],
] as Array<[string, string, string, string, number]>) add('processing', id, id, name, text, builder === 'inductor' ? [2, 1.6, 1] : [1, .5, .5], .2, {
  builder, materials: builder === 'mlcc' ? ['Ceramic dielectric', 'Nickel electrodes'] : builder === 'resistor' ? ['Alumina', 'Resistive film'] : ['Ferrite', 'Copper winding'],
  interfaces: ['mechanical'], traits: { count }, specs: [['Representative count shown', count], ['Typical case size', builder === 'inductor' ? '2.0 × 1.6 mm' : '1.0 × 0.5 mm (0402)']],
});

// ── Camera ─────────────────────────────────────────────────────────────────
type Cam = [id: string, kind: string, name: string, dims: [number, number, number], format: string, diagonal: number, mp: number, window: number, ois: boolean, bom: [string, string] | null, text: string, folded?: boolean];
const cams: Cam[] = [
  ['cam-main-1in', 'camera-main', 'Main camera, 1-inch type', [23, 23, 11.4], '1-inch', 16, 50, 11, true, ['sensor', 'sony-imx989'], 'A very large sensor behind a wide-aperture lens. Gathers the most light, and needs the deepest module of any phone camera.'],
  ['cam-main-1-1.3', 'camera-main', 'Main camera, 1/1.3-inch type', [17.5, 17.5, 8.6], '1/1.3-inch', 12.3, 50, 9, true, ['sensor', 'omnivision-ov50h'], 'A large sensor typical of current flagship main cameras. Its size sets the module height, and with it the camera bump.'],
  ['cam-main-1-1.56', 'camera-main', 'Main camera, 1/1.56-inch type', [14.5, 14.5, 7.2], '1/1.56-inch', 10.3, 50, 7.5, true, ['sensor', 'imx890'], 'A mid-size sensor used in upper-mid main cameras. A shallower lens stack than the larger formats, so it suits thinner phones.'],
  ['cam-main-1-2', 'camera-main', 'Main camera, 1/2-inch type', [11.5, 11.5, 6.0], '1/2-inch', 8, 50, 6, false, ['sensor', 'sony-imx882'], 'A compact sensor for slim or mainstream phones. It gathers less light per shot but needs the least depth of the main cameras.'],
  ['cam-uw-1-2.5', 'camera-ultrawide', 'Ultrawide camera, 1/2.5-inch type', [10.5, 10.5, 5.9], '1/2.5-inch', 6.4, 50, 6.5, false, ['ultrawide', '50-mp-ultrawide-module'], 'A short-focal-length module with a wide field of view and autofocus for close-ups.'],
  ['cam-uw-1-3', 'camera-ultrawide', 'Ultrawide camera, 1/3-inch type', [9, 9, 5.2], '1/3-inch', 5.3, 12, 5.5, false, ['ultrawide', '12-mp-ultrawide-module'], 'A small fixed-focus wide-angle module. With no focus motor it is shallow and light, but cannot focus on close subjects.'],
  ['cam-tele-3x', 'camera-tele', 'Telephoto camera, 3× upright', [11.5, 11.5, 7.4], '1/2.5-inch', 6.4, 50, 6.5, true, ['telephoto', '50-mp-3-ois-module'], 'A conventional upright lens stack with a longer focal length. Its reach is limited by the thickness of the phone.'],
  ['cam-tele-peri-5x', 'camera-tele', 'Periscope camera, 5× folded', [12, 27, 6.4], '1/2.5-inch', 6.4, 50, 7, true, ['telephoto', '50-mp-5-periscope'], 'A prism turns the light path ninety degrees so a long lens can lie flat inside the phone. Long reach, large footprint.', true],
];
for (const [id, kind, name, dims, format, diagonal, mp, window, ois, bom, text, folded] of cams) add('camera', kind, id, name, text, dims, +(dims[0] * dims[1] * dims[2] * .0034).toFixed(1), {
  builder: folded ? 'camera-periscope' : 'camera-module', options: { lens: window, ois }, level: 1, materials: ['Plastic lens elements', 'Image sensor', 'Voice-coil actuator', 'Steel shield'],
  traits: { format, diagonal, mp, lensWindow: window, ois, folded: !!folded }, interfaces: ['mipi-csi', 'i2c', 'board-to-board'], requires: ['soc', 'camera-housing'],
  contains: [
    ['Image sensor', `A ${format} type CMOS sensor on a ceramic or rigid-flex substrate.`], ['Lens elements', 'A stack of moulded plastic aspheric elements; the count and prescription vary by product.'],
    ['Lens barrel', 'A threaded or bonded holder that keeps the elements aligned.'], ['Autofocus actuator', 'A voice-coil motor that moves the lens barrel along the optical axis.'],
    ...(ois ? [['Optical stabilisation', 'Coils and magnets that shift the lens or sensor to cancel hand shake.'] as [string, string]] : []),
    ...(folded ? [['Prism', 'A glass prism or mirror that folds the light path sideways.'] as [string, string]] : []),
    ['Camera flex', 'A rigid-flex tail ending in a board-to-board connector.'],
  ],
  specs: [['Sensor type', format, undefined, 'estimated'], ['Image diagonal', diagonal, 'mm', 'estimated', 'optical-format'], ['Resolution class', mp, 'MP'], ['Module height', dims[2], 'mm'], ['Minimum lens window', window, 'mm'], ['Optical stabilisation', ois ? 'Yes' : 'No']],
  electrical: { activeW: .35 + diagonal * .03, sustainedHeatW: .3 + diagonal * .02 }, ...(bom ? { bom } : {}), sources: ['optical-format', 'mipi'],
});
for (const [id, name, dims, mp, bom, text] of [['cam-front-12', 'Front camera, 12 MP autofocus', [6.8, 6.8, 4.8], 12, '12-mp-autofocus-module', 'A small autofocus module looking through the display opening.'], ['cam-front-32', 'Front camera, 32 MP fixed focus', [6.5, 6.5, 4.5], 32, '32-mp-module', 'A small fixed-focus module with a high-resolution sensor, looking through the display opening.']] as Array<[string, string, [number, number, number], number, string, string]>)
  add('camera', 'camera-front', id, name, text, dims, .5, { builder: 'camera-module', options: { lens: 3.2, ois: false, front: true }, materials: ['Plastic lens elements', 'Image sensor'], traits: { mp, format: '1/3-inch', lensWindow: 2.6 }, interfaces: ['mipi-csi', 'i2c', 'board-to-board'], requires: ['soc'], contains: [['Image sensor', 'A small CMOS sensor.'], ['Lens elements', 'A short stack of moulded elements.'], ['Camera flex', 'A flex tail with a board-to-board connector.']], specs: [['Resolution class', mp, 'MP'], ['Module height', dims[2], 'mm']], electrical: { activeW: .25 }, bom: ['frontCamera', bom], sources: ['mipi'] });
add('camera', 'flash', 'flash-dual-led', 'LED flash', 'One or two high-power white LEDs under a small Fresnel lens, driven in short pulses by a dedicated flash driver.', [4.2, 4.2, 1.6], .1, {
  builder: 'flash', materials: ['LED die', 'Phosphor', 'Fresnel lens'], interfaces: ['i2c'], electrical: { peakW: 3.5 },
});

// ── Power ──────────────────────────────────────────────────────────────────
type Cell = [id: string, name: string, dims: [number, number, number], mah: number, chem: 'li-ion' | 'si-c', cells: 1 | 2, bom: string | null];
const cells: Cell[] = [
  ['cell-1800-small', '1,800 mAh small lithium-ion cell', [44, 60, 4.6], 1800, 'li-ion', 1, null],
  ['cell-2800-compact', '2,800 mAh compact lithium-ion cell', [50, 68, 4.4], 2800, 'li-ion', 1, null],
  ['cell-3200-slim', '3,200 mAh slim lithium-ion cell', [64, 84, 3.4], 3200, 'li-ion', 1, null],
  ['cell-3600-narrow', '3,600 mAh narrow lithium-ion cell', [46, 92, 4.8], 3600, 'li-ion', 1, null],
  ['cell-4000', '4,000 mAh lithium-ion cell', [62, 76, 4.6], 4000, 'li-ion', 1, '4000-mah-li-ion'],
  ['cell-5000', '5,000 mAh lithium-ion cell', [66, 82, 5.0], 5000, 'li-ion', 1, '5000-mah-li-ion'],
  ['cell-5500-sic', '5,500 mAh silicon-carbon cell', [66, 82, 5.0], 5500, 'si-c', 1, '5500-mah-silicon-carbon'],
  ['cell-6000-sic', '6,000 mAh silicon-carbon cell', [68, 83, 5.4], 6000, 'si-c', 1, '6000-mah-silicon-carbon'],
  ['cell-7000-sic', '7,000 mAh silicon-carbon cell', [68, 88, 6.0], 7000, 'si-c', 1, '7000-mah-silicon-carbon'],
  ['cell-4500-narrow', '4,500 mAh narrow lithium-ion cell', [52, 98, 5.0], 4500, 'li-ion', 1, null],
  ['cell-5200-narrow-sic', '5,200 mAh narrow silicon-carbon cell', [52, 100, 5.2], 5200, 'si-c', 1, null],
  ['cell-dual-5000', '2 × 2,500 mAh dual-cell pack', [66, 82, 5.0], 5000, 'li-ion', 2, null],
  ['cell-dual-6000-sic', '2 × 3,000 mAh dual-cell silicon-carbon pack', [68, 83, 5.4], 6000, 'si-c', 2, null],
];
for (const [id, name, dims, mah, chem, count, bom] of cells) {
  const volts = 3.87, wh = +(mah * volts / 1000).toFixed(2), litres = dims[0] * dims[1] * dims[2] / 1e6;
  add('power', 'battery', id, name, `${chem === 'si-c' ? 'A pouch cell with a silicon-carbon anode, which stores more energy in the same volume than graphite.' : 'A lithium-ion pouch cell with a graphite anode.'}${count === 2 ? ' Two cells wired in series double the pack voltage, which lets a charger deliver more power at the same current.' : ''} The pouch swells slightly with age, so the bay needs clearance.`, dims, Math.round(wh / (chem === 'si-c' ? .30 : .27)), {
    builder: 'battery', options: { cells: count }, materials: chem === 'si-c' ? ['Silicon-carbon anode', 'Lithium cobalt oxide cathode', 'Aluminium laminate pouch'] : ['Graphite anode', 'Lithium cobalt oxide cathode', 'Aluminium laminate pouch'],
    traits: { capacityMah: mah, energyWh: wh, nominalV: volts * count, cells: count, chemistry: chem, maxChargeC: count === 2 ? 3 : chem === 'si-c' ? 2 : 1.5, densityWhL: Math.round(wh / litres) },
    interfaces: ['battery-power', 'i2c'], requires: ['battery-pcm', 'charging-ic'],
    specs: [['Rated capacity', mah, 'mAh'], ['Stored energy', wh, 'Wh'], ['Nominal pack voltage', +(volts * count).toFixed(2), 'V', 'estimated', 'li-ion-typical'], ['Implied energy density', Math.round(wh / litres), 'Wh/L', 'estimated', 'li-ion-typical'], ['Cells', count], ['Planning charge-rate limit', count === 2 ? 3 : chem === 'si-c' ? 2 : 1.5, 'C']],
    electrical: { nominalV: +(volts * count).toFixed(2), peakW: +(wh * 2).toFixed(1) }, ...(bom ? { bom: ['battery', bom] as [string, string] } : {}), sources: ['li-ion-typical'],
  });
}
add('power', 'battery-pcm', 'battery-pcm', 'Battery protection and fuel-gauge board', 'A narrow circuit board welded to the cell tabs. Its protection switch disconnects the cell on over-voltage, over-current or short circuit; its fuel gauge measures charge flowing in and out to report the percentage.', [38, 4.2, 1.6], .8, {
  builder: 'pcm', materials: ['FR-4 class laminate', 'MOSFET switches', 'Gauge IC'], interfaces: ['battery-power', 'i2c', 'board-to-board'], requires: ['battery'],
  contains: [['Protection circuit', 'Back-to-back MOSFETs and a supervisor IC.'], ['Fuel gauge', 'A coulomb-counting gauge IC with a sense resistor.'], ['Battery flex and connector', 'A short flex ending in the battery board-to-board connector.'], ['Cell thermistor', 'A temperature sensor bonded against the cell.']],
});
add('power', 'battery-insulation', 'battery-insulation', 'Battery insulation and pull tabs', 'A thin insulating film between the cell and the warm side of the phone, with stretch-release adhesive strips so the cell can be removed for service.', [0, 0, .12], .4, {
  fitted: true, builder: 'film', options: { tint: 'insulation' }, materials: ['Polyimide film', 'Stretch-release adhesive'], traits: { density: 1.4 }, interfaces: ['mechanical'],
});
for (const [watts, name, bom, text] of [[30, '30 W USB PD charging controller', '30-w-usb-pd', 'A single switching charger.'], [65, '65 W USB PD charging controller', '65-w-usb-pd', 'A switching charger with a charge-pump stage that halves the voltage with little loss.'], [100, '100 W USB PD charging controller', '100-w-usb-pd', 'Two charge-pump stages sharing the current. Operates at the top of the standard USB PD power range.'], [120, '120 W dual charge-pump controller', '120-w-dual-charge-pump', 'Parallel charge pumps for a vendor-specific fast-charging protocol above the standard USB PD range.']] as Array<[number, string, string, string]>)
  chip('charging-ic', 'charger-' + watts, name, `${text} It regulates current into the battery and negotiates voltage with the wall adapter.`, [4.6, 4.6, .7], 'power', {
    traits: { ratedW: watts }, interfaces: ['vbus', 'battery-power', 'i2c'], requires: ['usb-port', 'battery'], options: { style: 'power' },
    specs: [['Rated input power', watts, 'W'], ['USB PD standard range limit', 100, 'W', 'documented', 'usb-pd-spec']], electrical: { ratedW: watts, sustainedHeatW: +(watts * .05).toFixed(1) }, bom: ['charging', bom], sources: ['usb-pd-spec'],
  });
for (const [watts, name, bom] of [[15, '15 W wireless charging coil', '15-w-qi-coil-and-controller'], [25, '25 W magnetic wireless charging module', '25-w-magnetic-qi2-module'], [50, '50 W wireless charging module', '50-w-wireless-module']] as Array<[number, string, string]>)
  add('power', 'wireless-coil', 'coil-' + watts, name, `A flat spiral of litz wire on a ferrite sheet under the rear cover, with its receiver IC. A changing magnetic field from the charging pad induces current in the coil.${watts === 25 ? ' A ring of magnets around the coil aligns it with the pad.' : ''}`, [watts === 25 ? 56 : 48, watts === 25 ? 56 : 48, .35], watts === 25 ? 14 : 6, {
    builder: 'coil', options: { magnets: watts === 25 }, materials: ['Litz copper wire', 'Ferrite sheet', ...(watts === 25 ? ['Magnet array'] : [])], traits: { ratedW: watts, magnets: watts === 25 },
    interfaces: ['battery-power', 'i2c'], requires: ['battery', 'rear-cover'], specs: [['Rated receive power', watts, 'W'], ['Operating principle', 'Inductive coupling', undefined, 'documented', 'wpc-qi']],
    electrical: { ratedW: watts, sustainedHeatW: +(watts * .12).toFixed(1) }, bom: ['wirelessCharging', bom], sources: ['wpc-qi'],
  });

// ── Thermal management ─────────────────────────────────────────────────────
for (const [id, name, cover, gain, bom, text] of [
  ['vc-small', 'Small vapor chamber', .22, 1.25, 'small-vapor-chamber', 'A compact chamber over the processor area.'],
  ['vc-large', 'Large vapor chamber', .5, 1.5, 'large-vapor-chamber', 'A chamber reaching from the processor across much of the battery, so heat spreads over more of the phone.'],
  ['vc-stacked', 'Stacked vapor chamber', .6, 1.7, 'stacked-vapor-chamber', 'Two chamber layers for a higher heat flux, at the cost of thickness.'],
] as Array<[string, string, number, number, string, string]>) add('thermal', 'vapor-chamber', id, name, `${text} A sealed, flattened copper envelope holding a little water: it boils at the hot spot, condenses at the cool end and wicks back, moving heat far better than solid copper.`, [0, 0, id === 'vc-stacked' ? .6 : .4], 0, {
  fitted: true, builder: 'vapor-chamber', materials: ['Copper envelope', 'Sintered wick', 'Water'], traits: { cover, spreadGain: gain, density: 5.5 }, interfaces: ['thermal-contact'],
  specs: [['Share of interior covered', Math.round(cover * 100), '%'], ['Planning spreading gain', gain, '×', 'estimated', 'thermal-heuristic'], ['Thickness', id === 'vc-stacked' ? .6 : .4, 'mm']], bom: ['cooling', bom], sources: ['thermal-heuristic'],
});
add('thermal', 'graphite', 'graphite-rear', 'Graphite heat-spreading sheet', 'A synthetic graphite film under the rear cover. It conducts heat sideways far better than through its thickness, evening out hot spots on the back of the phone.', [0, 0, .07], 0, {
  fitted: true, builder: 'film', options: { tint: 'graphite' }, materials: ['Synthetic graphite', 'PET carrier'], traits: { density: 1.9, spreadGain: 1.1 }, interfaces: ['thermal-contact'], bom: ['cooling', 'graphite-sheet'],
});
for (const [id, name, gain, bom, text] of [['tim-pad', 'Thermal pad', 1, 'graphite-interface-pad', 'A soft, conformable pad.'], ['tim-phase', 'Phase-change thermal interface', 1.05, 'phase-change-pad', 'A film that softens at operating temperature to wet both surfaces.'], ['tim-paste', 'Thermal paste', 1.03, 'standard-thermal-paste', 'A filled grease applied as a thin layer.']] as Array<[string, string, number, string, string]>)
  add('thermal', 'tim', id, name, `${text} It fills the microscopic air gaps between the processor shield and the heat spreader; air is a poor conductor, so this thin layer matters more than its size suggests.`, [13, 13, .25], .1, { builder: 'tim', materials: ['Filled polymer'], traits: { spreadGain: gain }, interfaces: ['thermal-contact'], requires: ['soc'], bom: ['thermalInterface', bom] });
add('thermal', 'heat-spreader', 'heat-spreader-copper', 'Copper heat spreader', 'A copper foil bridging the processor shield to the midframe or vapor chamber, widening the path heat takes out of the board.', [0, 0, .15], 0, {
  fitted: true, builder: 'film', options: { tint: 'copper' }, materials: ['Copper foil'], traits: { density: 8.96 }, interfaces: ['thermal-contact'], specs: [['Material density', 8.96, 'g/cm³', 'documented', 'material-density']], sources: ['material-density'],
});
add('thermal', 'temp-sensors', 'ntc-set', 'Temperature sensors', 'Small thermistors whose resistance falls as they warm. The system reads them near the processor, charger and skin of the phone to decide when to slow down.', [1, .5, .5], .03, {
  builder: 'resistor', materials: ['NTC ceramic'], interfaces: ['i2c'], traits: { count: 4 }, specs: [['Representative count shown', 4]],
});

// ── Connectivity ───────────────────────────────────────────────────────────
for (const [id, name, cls, bom, text] of [['pa-4g', '4G power-amplifier module', '4g', '4g-rf-front-end', 'Covers LTE bands.'], ['pa-5g-sub6', '5G sub-6 GHz power-amplifier module', 'sub6', '5g-sub-6-rf-front-end', 'Covers LTE and 5G FR1 bands.'], ['pa-5g-mmwave', '5G millimetre-wave front-end set', 'mmwave', '5g-mmwave-rf-front-end', 'Adds FR2 millimetre-wave support, which also needs antenna-in-package modules at the phone edges.']] as Array<[string, string, string, string, string]>)
  chip('pa-module', id, name, `Boosts the transmit signal to the power needed to reach the cell tower. ${text} Integrates amplifiers with their matching filters and switches.`, [6.5, 5, .8], 'connectivity', {
    traits: { rfClass: cls }, interfaces: ['rf-feed', 'rf-coax'], requires: ['rf-transceiver', 'antenna-cell-top'], options: { style: 'rf' },
    specs: [['Frequency range', cls === 'mmwave' ? 'FR1 and FR2' : cls === 'sub6' ? 'FR1' : 'LTE bands', undefined, 'documented', '3gpp-nr']], electrical: { peakW: 2.2, sustainedHeatW: .5 }, bom: ['rf', bom], sources: ['3gpp-nr'],
  });
chip('rf-switch', 'rf-switch', 'Antenna switch module', 'Routes each radio path to the right antenna and band, and retunes antennas as the hand covers them.', [3, 3, .55], 'connectivity', { interfaces: ['rf-feed'], options: { style: 'rf' } });
chip('rf-filters', 'rf-filter-bank', 'Filters and duplexers', 'Acoustic-wave filters that pass one band and reject its neighbours. A duplexer pairs two so the phone can transmit and receive on one antenna at once.', [4.2, 3.2, .6], 'connectivity', { interfaces: ['rf-feed'], options: { style: 'rf' }, contains: [['Band filters', 'Surface- and bulk-acoustic-wave filters.'], ['Duplexers', 'Paired transmit and receive filters.']] });
chip('lna', 'lna-module', 'Low-noise amplifier module', 'Amplifies the very weak received signal right after the antenna, before cable and switch losses can bury it in noise.', [2.6, 2.6, .5], 'connectivity', { interfaces: ['rf-feed'], options: { style: 'rf' } });
for (const [kind, name, dims, text] of [
  ['antenna-cell-top', 'Upper cellular antenna', [34, 5, .6], 'Radiates from the top edge. With a metal frame the frame segment itself is the antenna and this part is its feed and tuning flex.'],
  ['antenna-cell-bottom', 'Lower cellular antenna', [34, 5, .6], 'The main transmit antenna at the bottom edge, kept away from the head during calls.'],
  ['antenna-wifi', 'Wi-Fi and Bluetooth antenna', [16, 4, .5], 'A flex antenna near a top corner serving the wireless LAN and Bluetooth radios.'],
  ['antenna-gnss', 'GNSS antenna', [12, 4, .5], 'A receive-only antenna near the top edge, where it has the clearest view of the sky.'],
] as Array<[string, string, [number, number, number], string]>) add('connectivity', kind, kind, name, text, dims, .25, {
  builder: 'antenna', materials: ['Polyimide flex', 'Copper trace', 'Spring contacts'], interfaces: ['rf-feed', 'spring-contact'], traits: { edge: true },
});
add('connectivity', 'antenna-nfc', 'antenna-nfc-loop', 'NFC antenna loop', 'A printed loop of a few turns on a ferrite sheet under the rear cover. It couples magnetically with a reader a few centimetres away.', [30, 22, .2], .6, {
  builder: 'nfc-loop', materials: ['Copper trace', 'Ferrite sheet'], interfaces: ['rf-feed'], requires: ['nfc', 'rear-cover'], specs: [['Carrier frequency', 13.56, 'MHz', 'documented', 'nfc-13-56']], sources: ['nfc-13-56'],
});
add('connectivity', 'antenna-mmwave', 'antenna-mmwave-aip', 'Millimetre-wave antenna modules', 'Antenna-in-package arrays that steer a narrow beam electronically. Millimetre waves are blocked by a hand or by metal, so several modules face different edges.', [18, 4.2, 1.6], .9, {
  builder: 'aip', materials: ['Laminate antenna array', 'Beamforming IC'], interfaces: ['rf-feed', 'board-to-board'], requires: ['pa-module'], traits: { count: 2 }, specs: [['Modules shown', 2], ['Frequency range', 'FR2', undefined, 'documented', '3gpp-nr']], sources: ['3gpp-nr'],
});
add('connectivity', 'coax', 'coax-main', 'Coaxial antenna cable', 'A thin shielded cable carrying radio signals from the logic board, past the battery, to the lower antenna. Its snap-on connectors are among the smallest in the phone.', [1.1, 0, 1.1], .3, {
  fitted: true, builder: 'coax', materials: ['Copper conductor', 'PTFE dielectric', 'Braided shield'], interfaces: ['rf-coax'],
});

// ── Audio ──────────────────────────────────────────────────────────────────
for (const [id, name, dims, bom, text] of [['speaker-standard', 'Loudspeaker module', [22, 13, 4.2], 'single-micro-speaker', 'A micro-speaker in a sealed plastic box.'], ['speaker-large', 'Large loudspeaker module', [30, 14, 4.6], 'stereo-phone-speakers', 'A longer-excursion driver in a larger box for more bass.']] as Array<[string, string, [number, number, number], string, string]>)
  add('audio', 'loudspeaker', id, name, `${text} The enclosed air behind the driver is its acoustic chamber; a bigger chamber gives deeper bass, so this is one of the largest parts at the bottom of the phone.`, dims, +(dims[0] * dims[1] * dims[2] * .0016).toFixed(1), {
    builder: 'speaker', materials: ['Polycarbonate enclosure', 'Neodymium magnet', 'Polymer diaphragm'], traits: { chamberCc: +(dims[0] * dims[1] * dims[2] * .00055).toFixed(2) }, interfaces: ['spring-contact'], requires: ['audio-amp'],
    contains: [['Driver', 'A moving-coil micro-speaker.'], ['Acoustic chamber', 'The sealed back volume moulded into the module.'], ['Speaker mesh', 'A fine mesh and membrane over the outlet that keeps out dust and water.']],
    specs: [['Approximate back volume', +(dims[0] * dims[1] * dims[2] * .00055).toFixed(2), 'cm³']], electrical: { peakW: 2 }, bom: ['speakers', bom],
  });
add('audio', 'earpiece', 'earpiece-speaker', 'Earpiece speaker', 'A slim speaker at the top edge for calls. Driven harder, it doubles as the second channel for stereo playback.', [12, 7, 2.6], .5, {
  builder: 'speaker', options: { small: true }, materials: ['Neodymium magnet', 'Polymer diaphragm'], interfaces: ['spring-contact'], requires: ['audio-amp'], electrical: { peakW: 1 },
});
add('audio', 'microphone', 'mic-mems', 'MEMS microphone', 'A silicon diaphragm etched on a chip, in a metal can with a sound port. Phones use several so software can cancel noise and pick out the direction of a voice.', [3.5, 2.7, 1.0], .04, {
  builder: 'mic', materials: ['Silicon MEMS die', 'Metal can'], interfaces: ['i2s'], requires: ['audio-codec'], bom: ['microphones', 'triple-mems-array'],
});
chip('audio-amp', 'audio-amp', 'Smart speaker amplifier', 'A class-D amplifier that boosts the battery voltage to drive the speaker hard while monitoring its temperature and excursion to protect it.', [3, 3, .6], 'audio', { interfaces: ['i2s', 'battery-power'], electrical: { peakW: 4 } });
for (const [id, name, dims, bom, text] of [['haptic-x-lra', 'X-axis linear actuator', [15, 6.5, 3.2], 'x-axis-linear-actuator', 'A mass on springs driven side to side by a coil. Starts and stops quickly, giving crisp taps.'], ['haptic-z-lra', 'Z-axis linear actuator', [8, 8, 3], 'z-axis-linear-actuator', 'A coin-shaped actuator moving through the thickness of the phone. Compact, with a softer feel.'], ['haptic-large', 'Large linear actuator', [22, 8, 3.6], 'large-linear-actuator', 'A heavier moving mass for stronger, lower-frequency feedback.']] as Array<[string, string, [number, number, number], string, string]>)
  add('audio', 'haptic', id, name, text, dims, +(dims[0] * dims[1] * dims[2] * .006).toFixed(1), { builder: 'haptic', materials: ['Tungsten mass', 'Copper coil', 'Steel springs'], interfaces: ['i2c', 'spring-contact'], electrical: { peakW: 1.2 }, bom: ['haptics', bom] });

// ── Sensors and biometrics ─────────────────────────────────────────────────
chip('imu', 'imu-6axis', 'Accelerometer and gyroscope', 'A six-axis inertial sensor: microscopic moving structures measure acceleration and rotation. Used for screen rotation, step counting and camera stabilisation.', [2.5, 3, .85], 'sensors', { interfaces: ['spi', 'i3c'], options: { style: 'sensor' }, contains: [['Accelerometer', 'Three-axis MEMS accelerometer.'], ['Gyroscope', 'Three-axis MEMS gyroscope.']], bom: ['motion', '6-axis-imu'] });
chip('magnetometer', 'magnetometer', 'Magnetometer', 'Measures the Earth’s magnetic field for the compass. Placed away from speaker and haptic magnets, which would swamp it.', [1.6, 1.6, .6], 'sensors', { interfaces: ['i2c'], options: { style: 'sensor' } });
chip('barometer', 'barometer', 'Barometer', 'A pressure sensor behind a vented port. Small pressure changes reveal changes in altitude, such as climbing a floor.', [2, 2, .8], 'sensors', { interfaces: ['i2c'], options: { style: 'sensor' } });
chip('hall', 'hall-sensor', 'Hall-effect sensor', 'Detects a nearby magnet, such as one in a folio case, to wake or sleep the screen.', [1.4, 1.1, .5], 'sensors', { interfaces: ['i2c'], options: { style: 'sensor' } });
add('sensors', 'prox-als', 'prox-als', 'Proximity and ambient-light sensor', 'An infrared emitter and detector sense a face near the screen during calls; a second detector measures room brightness for automatic screen brightness.', [4, 2.4, 1.1], .05, {
  builder: 'optical-sensor', materials: ['Photodiodes', 'Infrared emitter', 'Clear mould compound'], interfaces: ['i2c'], bom: ['ambient', 'ambient-light-and-proximity'],
});
for (const [id, name, type, dims, bom, text] of [
  ['fp-optical', 'Optical under-display fingerprint reader', 'optical', [9, 9, 1.6], 'optical-fingerprint', 'A tiny camera under the panel photographs the fingertip lit by the screen itself. Needs an emissive panel it can see through.'],
  ['fp-ultrasonic', 'Ultrasonic under-display fingerprint reader', 'ultrasonic', [20, 10, .4], 'ultrasonic-fingerprint', 'A thin piezoelectric sheet sends ultrasound through the display and maps the ridges from the echoes.'],
  ['fp-side', 'Side-mounted capacitive fingerprint reader', 'side', [14, 3, 2], 'side-capacitive-fingerprint', 'A narrow capacitive sensor built into the power button. It measures the tiny capacitance differences between skin ridges and valleys.'],
] as Array<[string, string, string, [number, number, number], string, string]>) add('sensors', 'fingerprint', id, name, text, dims, .3, {
  builder: 'fingerprint', options: { type }, materials: type === 'ultrasonic' ? ['Piezoelectric film', 'Thin-film transistors'] : type === 'optical' ? ['Micro-lens', 'Image sensor'] : ['Capacitive sensor die', 'Ceramic cover'],
  traits: { type }, interfaces: ['spi'], requires: ['secure-element'], bom: ['biometrics', bom], ...(type === 'optical' ? { sources: ['oled-optics'] } : {}),
});
add('sensors', 'face-ir', 'face-ir-kit', 'Infrared face-recognition hardware', 'A dot projector, flood illuminator and infrared camera that map the face in three dimensions. Needs a wide opening or notch at the top of the display.', [26, 5.5, 4.2], 1.1, {
  builder: 'face-ir', materials: ['VCSEL emitters', 'Diffractive optics', 'Infrared sensor'], interfaces: ['mipi-csi', 'i2c'], requires: ['soc', 'secure-element'],
  contains: [['Dot projector', 'A laser array behind a diffractive element.'], ['Flood illuminator', 'An infrared emitter for dark scenes.'], ['Infrared camera', 'A sensor filtered to the emitter wavelength.']], electrical: { peakW: 1.5 }, bom: ['biometrics', 'ir-face-authentication-kit'],
});

// ── Connectors and flex assemblies ─────────────────────────────────────────
for (const [id, name, usb, bom] of [['daughter-usb2', 'Charging daughterboard, USB 2.0', 2.0, 'usb-2-0-type-c-board'], ['daughter-usb3', 'Charging daughterboard, USB 3.2', 3.2, 'usb-3-2-type-c-board']] as Array<[string, string, number, string]>)
  add('interconnect', 'daughterboard', id, name, 'A small board at the bottom edge carrying the USB-C port, the lower microphone and the antenna contacts. Keeping it separate lets the most wear-prone part be replaced without touching the logic board.', [0, 9, .6], 1.6, {
    fitted: true, builder: 'pcb', options: { tiers: 1, small: true }, materials: ['FR-4 class laminate', 'Copper'], traits: { usb, density: 2 }, interfaces: [{ type: usb === 3.2 ? 'usb-3.2' : 'usb-2.0' }, 'vbus', 'board-to-board'], requires: ['main-flex'], bom: ['ports', bom],
  });
add('interconnect', 'usb-port', 'usb-c-receptacle', 'USB-C port', 'A reversible 24-contact receptacle soldered to the daughterboard, with a moulded seal around its mouth. Carries charging power, data and display output.', [8.94, 7.3, 3.2], .7, {
  builder: 'usb-c', level: 2, materials: ['Stainless-steel shell', 'Copper alloy contacts', 'Liquid-crystal polymer tongue'], traits: { maxA: 5 }, interfaces: ['usb-3.2', 'usb-2.0', 'vbus'], requires: ['daughterboard'],
  dimensionSource: 'usb-c-spec', specs: [['Receptacle opening', '8.34 × 2.56 mm', undefined, 'documented', 'usb-c-spec'], ['Contacts', 24, undefined, 'documented', 'usb-c-spec'], ['Maximum current', 5, 'A', 'documented', 'usb-pd-spec']], sources: ['usb-c-spec', 'usb-pd-spec'],
});
add('interconnect', 'main-flex', 'main-flex', 'Main interconnect flex', 'A wide flexible circuit running over the battery to join the logic board to the charging daughterboard. It carries charging current, USB data, audio and control signals.', [14, 0, .2], .9, {
  fitted: true, builder: 'flex', options: { shape: 'main' }, materials: ['Polyimide', 'Copper'], interfaces: ['board-to-board', 'vbus', 'usb-2.0'],
});
add('interconnect', 'button-flex', 'button-flex', 'Button flex', 'A narrow flex along the inside of the frame carrying the dome switches under the power and volume keys.', [1.6, 0, .5], .2, {
  fitted: true, builder: 'flex', options: { shape: 'button' }, materials: ['Polyimide', 'Copper', 'Steel dome switches'], interfaces: ['board-to-board'],
});
add('interconnect', 'sim-reader', 'sim-reader', 'SIM card reader', 'A socket of sprung contacts on the logic board that the tray slides into.', [13.5, 12, 1.4], .5, {
  builder: 'sim-reader', materials: ['Stainless-steel shell', 'Copper alloy contacts'], interfaces: ['spring-contact'], specs: [['Card format', '4FF nano-SIM', undefined, 'documented', 'etsi-4ff']], sources: ['etsi-4ff'],
});
add('interconnect', 'fpc-connectors', 'fpc-connector-set', 'Board-to-board connectors', 'Tiny press-fit sockets with contacts at a fraction of a millimetre pitch. Every flex in the phone ends in one. Shown as a representative set.', [7, 2.2, .7], .3, {
  builder: 'b2b', materials: ['Liquid-crystal polymer', 'Gold-plated copper alloy'], interfaces: ['board-to-board'], traits: { count: 6 }, specs: [['Representative count shown', 6]],
});

export const COMPONENTS: Record<string, ComponentDefinition> = Object.fromEntries(list.map(c => [c.id, c]));
export const COMPONENT_LIST: readonly ComponentDefinition[] = list;
export const componentsOfKind = (kind: string) => list.filter(c => c.kind === kind);
