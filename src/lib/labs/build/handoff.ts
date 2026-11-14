/**
 * Build a Phone → Interactive Leaks hand-off, plus saved builds and comparison.
 *
 * The studio maps a build onto the simulator's own form vocabulary, keeps it
 * in sessionStorage for one page load, and the simulator validates it against
 * a fixed whitelist before using it. Nothing is sent to a server.
 *
 * This module has no runtime imports, so the simulator can use it without
 * loading the Build a Phone catalogue.
 */
import type { Assembly } from './assembly';
import type { Confidence, PhoneBuild } from './schema';

export const HANDOFF_KEY = 'pf:build-a-phone:handoff';
export const HANDOFF_PARAM = 'from=build-a-phone';
export const SAVED_KEY = 'pf:build-a-phone:saved';
export const MAX_SAVED = 20;

/** Simulator form fields the hand-off may set, and nothing else. */
export const HANDOFF_FIELDS = ['name', 'widthMm', 'heightMm', 'thicknessMm', 'weightG', 'diagonalInches', 'aspectWidth', 'aspectHeight', 'bezelTopMm', 'bezelRightMm', 'bezelBottomMm', 'bezelLeftMm', 'panelTechnology', 'batteryCapacityMah', 'batteryVoltageV', 'batteryChemistry', 'cellArchitecture', 'wiredChargeW', 'wirelessChargeW', 'chargingStandard', 'wirelessChargingStandard', 'coolingClass', 'batteryWidthMm', 'batteryHeightMm', 'batteryThicknessMm', 'batteryWeightG'] as const;
export type HandoffField = typeof HANDOFF_FIELDS[number];
const ENUMS: Partial<Record<HandoffField, readonly string[]>> = {
  panelTechnology: ['LTPO OLED', 'LTPS OLED', 'IPS LCD'], batteryChemistry: ['Lithium-ion', 'silicon-carbon'], cellArchitecture: ['single-cell', 'dual-cell'],
  chargingStandard: ['USB PD', 'USB PD 3.1 EPR', 'Proprietary / other'], wirelessChargingStandard: ['Qi', 'Qi2 Magnetic Power Profile', 'Proprietary / other'],
  coolingClass: ['passive-graphite', 'vapor-chamber', 'large-vapor-chamber', 'unknown'],
};
export const CAMERA_TYPES = ['wide', 'ultrawide', 'telephoto', 'periscope', 'front'] as const;
export type HandoffCamera = { type: typeof CAMERA_TYPES[number]; sensorFormatDenominator: string; resolutionMp: string; equivalentFocalLengthMm: string; moduleWidthMm: string; moduleHeightMm: string; moduleDepthMm: string };
/** 35 mm-equivalent focal length implied by the module class: 24 mm main, 13 mm ultrawide, and the main focal length times the stated zoom. */
const CLASS_FOCAL: Record<string, number> = { 'camera-main': 24, 'camera-ultrawide': 13, 'camera-front': 23 };
export type SimulatorHandoff = {
  version: 1; createdAt: string; name: string;
  form: Partial<Record<HandoffField, string>>;
  cameras: HandoffCamera[];
  /** Confidence of each field, shown to the visitor in the simulator. */
  provenance: Partial<Record<HandoffField | 'cameras', Confidence>>;
  /** What the hand-off deliberately leaves for the visitor to set. */
  notSet: string[];
};

const n = (v: number, d = 2) => String(Number(v.toFixed(d)));
const formatDenominator = (format: string) => format === '1-inch' ? '1' : (/^1\/([\d.]+)-inch$/.exec(format)?.[1] ?? '');

export function toSimulatorHandoff(assembly: Assembly): SimulatorHandoff {
  const { layout, bySlot, totals } = assembly, d = layout.design;
  const at = (id: string) => bySlot[id]?.installed ? bySlot[id] : undefined;
  const form: SimulatorHandoff['form'] = {}, provenance: SimulatorHandoff['provenance'] = {};
  const set = (key: HandoffField, value: string | undefined, confidence: Confidence) => { if (value === undefined || value === '') return; form[key] = value; provenance[key] = confidence; };
  set('name', (d.name || 'Build a Phone concept').slice(0, 80), 'user');
  set('widthMm', n(d.width, 1), 'user'); set('heightMm', n(d.height, 1), 'user'); set('thicknessMm', n(d.thickness, 2), 'user');
  set('weightG', n(totals.installedWeightG, 0), 'estimated');
  const dw = d.displayWidth ?? d.width - 2 * d.bezel, dh = d.displayHeight ?? d.height - 2 * d.bezel;
  set('diagonalInches', n(Math.hypot(dw, dh) / 25.4, 2), 'user'); set('aspectWidth', n(dw, 2), 'user'); set('aspectHeight', n(dh, 2), 'user');
  for (const [key, value] of [['bezelTopMm', (d.height - dh) / 2], ['bezelBottomMm', (d.height - dh) / 2], ['bezelLeftMm', (d.width - dw) / 2], ['bezelRightMm', (d.width - dw) / 2]] as Array<[HandoffField, number]>) set(key, n(value, 2), 'user');
  const panel = at('panel'); if (panel) set('panelTechnology', ({ 'panel-ltpo-oled': 'LTPO OLED', 'panel-ltps-oled': 'LTPS OLED', 'panel-ips-lcd': 'IPS LCD' } as Record<string, string>)[panel.component.id], 'estimated');
  const cell = at('battery');
  if (cell) {
    const t = cell.component.traits;
    set('batteryCapacityMah', String(t.capacityMah), 'estimated'); set('batteryVoltageV', '3.87', 'estimated');
    set('batteryChemistry', t.chemistry === 'si-c' ? 'silicon-carbon' : 'Lithium-ion', 'estimated'); set('cellArchitecture', Number(t.cells) === 2 ? 'dual-cell' : 'single-cell', 'estimated');
    set('batteryWidthMm', n(cell.box.w, 1), 'estimated'); set('batteryHeightMm', n(cell.box.h, 1), 'estimated'); set('batteryThicknessMm', n(cell.box.d, 2), 'estimated'); set('batteryWeightG', n(cell.component.weightG, 0), 'estimated');
  }
  const charger = at('charging-ic'); if (charger) { const w = Number(charger.component.traits.ratedW); set('wiredChargeW', String(w), 'estimated'); set('chargingStandard', w > 100 ? 'Proprietary / other' : 'USB PD', 'estimated'); }
  const coil = at('wireless-coil'); if (coil) { const w = Number(coil.component.traits.ratedW); set('wirelessChargeW', String(w), 'estimated'); set('wirelessChargingStandard', coil.component.traits.magnets ? 'Qi2 Magnetic Power Profile' : w > 15 ? 'Proprietary / other' : 'Qi', 'estimated'); }
  const vc = at('vapor-chamber'), graphite = at('graphite');
  set('coolingClass', vc ? (vc.component.id === 'vc-small' ? 'vapor-chamber' : 'large-vapor-chamber') : graphite ? 'passive-graphite' : 'unknown', 'estimated');
  const cameras: HandoffCamera[] = [];
  for (const id of ['camera-main', 'camera-ultrawide', 'camera-tele', 'camera-tele-2', 'camera-front']) {
    const cam = at(id); if (!cam) continue;
    const t = cam.component.traits, type: HandoffCamera['type'] = id === 'camera-main' ? 'wide' : id === 'camera-ultrawide' ? 'ultrawide' : id === 'camera-front' ? 'front' : t.folded ? 'periscope' : 'telephoto';
    const zoom = /(\d+(?:\.\d+)?)×/.exec(cam.component.name)?.[1], focal = CLASS_FOCAL[id] ?? (zoom ? 24 * Number(zoom) : 0);
    cameras.push({ type, sensorFormatDenominator: formatDenominator(String(t.format)), resolutionMp: String(t.mp), equivalentFocalLengthMm: focal ? String(focal) : '', moduleWidthMm: n(cam.component.dimensions[0], 1), moduleHeightMm: n(cam.component.dimensions[1], 1), moduleDepthMm: n(cam.component.dimensions[2], 1) });
  }
  if (cameras.length) provenance.cameras = 'estimated';
  return {
    version: 1, createdAt: new Date().toISOString(), name: form.name ?? 'Build a Phone concept', form, cameras, provenance,
    notSet: ['Processor: the build uses a generic processor class, so choose a real processor', 'Display resolution and refresh rate', 'Camera apertures and physical focal lengths'],
  };
}

/** Validates an untrusted hand-off. Returns null unless every field is on the whitelist and well formed. */
export function readHandoff(value: unknown): SimulatorHandoff | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  if (v.version !== 1 || typeof v.form !== 'object' || !v.form || !Array.isArray(v.cameras) || v.cameras.length > 6) return null;
  const form: SimulatorHandoff['form'] = {};
  for (const [key, raw] of Object.entries(v.form as Record<string, unknown>)) {
    if (!(HANDOFF_FIELDS as readonly string[]).includes(key) || typeof raw !== 'string' || raw.length > 80) return null;
    const field = key as HandoffField, allowed = ENUMS[field];
    if (allowed ? !allowed.includes(raw) : field !== 'name' && !/^\d{1,5}(\.\d{1,3})?$/.test(raw)) return null;
    form[field] = raw;
  }
  const cameras: HandoffCamera[] = [];
  for (const raw of v.cameras as unknown[]) {
    if (!raw || typeof raw !== 'object') return null;
    const c = raw as Record<string, unknown>;
    if (!CAMERA_TYPES.includes(c.type as HandoffCamera['type'])) return null;
    const nums = ['sensorFormatDenominator', 'resolutionMp', 'equivalentFocalLengthMm', 'moduleWidthMm', 'moduleHeightMm', 'moduleDepthMm'] as const;
    if (!nums.every(k => typeof c[k] === 'string' && /^(\d{1,4}(\.\d{1,3})?)?$/.test(c[k] as string))) return null;
    cameras.push({ type: c.type as HandoffCamera['type'], ...Object.fromEntries(nums.map(k => [k, c[k] as string])) } as HandoffCamera);
  }
  const provenance: SimulatorHandoff['provenance'] = {};
  if (v.provenance && typeof v.provenance === 'object') for (const [key, raw] of Object.entries(v.provenance as Record<string, unknown>))
    if (((HANDOFF_FIELDS as readonly string[]).includes(key) || key === 'cameras') && ['measured', 'documented', 'estimated', 'speculative', 'user'].includes(raw as string)) provenance[key as HandoffField] = raw as Confidence;
  const notSet = Array.isArray(v.notSet) ? (v.notSet as unknown[]).filter((s): s is string => typeof s === 'string').slice(0, 8).map(s => s.slice(0, 200)) : [];
  return { version: 1, createdAt: typeof v.createdAt === 'string' ? v.createdAt.slice(0, 40) : '', name: form.name ?? 'Build a Phone concept', form, cameras, provenance, notSet };
}

// ── Saved builds (this browser only) ───────────────────────────────────────
export type SavedBuild = { id: string; name: string; savedAt: string; build: Pick<PhoneBuild, 'design' | 'architecture' | 'selections' | 'uninstalled'> };

export function parseSaved(raw: string | null): SavedBuild[] {
  if (!raw) return [];
  try {
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    return list.filter((s): s is SavedBuild => !!s && typeof s === 'object' && typeof s.id === 'string' && typeof s.name === 'string' && typeof s.savedAt === 'string' && !!s.build && typeof s.build === 'object' && typeof s.build.architecture === 'string' && !!s.build.design && typeof s.build.selections === 'object' && Array.isArray(s.build.uninstalled)).slice(0, MAX_SAVED);
  } catch { return []; }
}
export function addSaved(list: SavedBuild[], entry: SavedBuild): SavedBuild[] {
  return [entry, ...list.filter(s => s.id !== entry.id)].slice(0, MAX_SAVED);
}

export type ComparisonRow = { label: string; a: string; b: string; better?: 'a' | 'b'; confidence: Confidence };
/** Side-by-side figures for two resolved builds; lower-is-better rows say so. */
export function compareBuilds(a: Assembly, b: Assembly, checks: (x: Assembly) => { counts: Record<string, number>; thermal: { sustainedW: number; budgetW: number } }): ComparisonRow[] {
  const ca = checks(a), cb = checks(b);
  const val = (x: Assembly, id: string, key: string) => x.bySlot[id]?.installed ? x.bySlot[id].component.traits[key] : undefined;
  const name = (x: Assembly, id: string) => x.bySlot[id]?.installed ? x.bySlot[id].component.name : 'None';
  const num = (label: string, va: number, vb: number, unit: string, prefer: 'high' | 'low', confidence: Confidence, d = 1): ComparisonRow =>
    ({ label, a: `${Number(va.toFixed(d))} ${unit}`.trim(), b: `${Number(vb.toFixed(d))} ${unit}`.trim(), better: va === vb ? undefined : (prefer === 'high') === (va > vb) ? 'a' : 'b', confidence });
  const headroom = (c: typeof ca) => c.thermal.budgetW - c.thermal.sustainedW;
  return [
    num('Thickness', a.layout.design.thickness, b.layout.design.thickness, 'mm', 'low', 'user'),
    num('Estimated mass', a.totals.installedWeightG, b.totals.installedWeightG, 'g', 'low', 'estimated', 0),
    num('Battery energy', Number(val(a, 'battery', 'energyWh') ?? 0), Number(val(b, 'battery', 'energyWh') ?? 0), 'Wh', 'high', 'estimated', 2),
    num('Wired charging', Number(val(a, 'charging-ic', 'ratedW') ?? 0), Number(val(b, 'charging-ic', 'ratedW') ?? 0), 'W', 'high', 'estimated', 0),
    { label: 'Processor', a: name(a, 'soc'), b: name(b, 'soc'), confidence: 'estimated' },
    { label: 'Main camera', a: name(a, 'camera-main'), b: name(b, 'camera-main'), confidence: 'estimated' },
    num('Rear cameras', ['camera-main', 'camera-ultrawide', 'camera-tele', 'camera-tele-2'].filter(id => a.bySlot[id]?.installed).length, ['camera-main', 'camera-ultrawide', 'camera-tele', 'camera-tele-2'].filter(id => b.bySlot[id]?.installed).length, '', 'high', 'user', 0),
    { label: 'Cooling', a: name(a, 'vapor-chamber') === 'None' ? name(a, 'graphite') : name(a, 'vapor-chamber'), b: name(b, 'vapor-chamber') === 'None' ? name(b, 'graphite') : name(b, 'vapor-chamber'), confidence: 'estimated' },
    num('Thermal headroom', headroom(ca), headroom(cb), 'W', 'high', 'estimated', 2),
    num('Problems that will not work', ca.counts.blocker, cb.counts.blocker, '', 'low', 'estimated', 0),
    num('Warnings', ca.counts.warning, cb.counts.warning, '', 'low', 'estimated', 0),
  ];
}
