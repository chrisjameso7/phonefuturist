/**
 * Build a Phone — what the inspector and assembly controls show.
 *
 * Pure functions over a resolved assembly. Every figure carries the
 * confidence class and source it came from, and representative parts say so.
 */
import { BOM_GROUPS } from '../bom-catalog';
import { accessBlockers, dependants, describePosition, installPart, isDesignBound, uninstallPart, type Assembly } from './assembly';
import { SLOT_BY_ID } from './architectures';
import { COMPONENTS } from './catalog';
import { ASSEMBLY_STEPS, CONFIDENCE_LABELS, GEOMETRY_LEVELS, SUBSYSTEMS, type ComponentDefinition, type Confidence, type InterfaceType, type PhoneBuild, type PlacedPart } from './schema';
import { SOURCES } from './sources';

export const INTERFACE_LABELS: Record<InterfaceType, string> = {
  'mipi-dsi': 'MIPI DSI', 'mipi-csi': 'MIPI CSI-2', lpddr4x: 'LPDDR4X', lpddr5: 'LPDDR5', lpddr5x: 'LPDDR5X', 'ufs-2.2': 'UFS 2.2', 'ufs-3.1': 'UFS 3.1', 'ufs-4.0': 'UFS 4.0',
  'usb-2.0': 'USB 2.0', 'usb-3.2': 'USB 3.2', i2c: 'I²C', spi: 'SPI', i3c: 'I³C', pcie: 'PCIe', sdio: 'SDIO', i2s: 'I²S', 'rf-coax': 'RF coax', 'rf-feed': 'RF feed',
  'battery-power': 'Battery power', vbus: 'USB power (VBUS)', 'board-to-board': 'Board-to-board', 'spring-contact': 'Spring contact', 'thermal-contact': 'Thermal contact', mechanical: 'Mechanical',
};

export type Figure = { label: string; value: string; confidence: Confidence; source: string };
export type Inspection = {
  slotId: string; slotLabel: string; name: string; description: string;
  representative: boolean; manufacturer: string; model: string;
  subsystem: string; step: string; installed: boolean; location: string; position: string;
  figures: Figure[];
  materials: string[];
  contains: Array<{ label: string; description: string }>;
  connections: Array<{ slotId: string; name: string; interface: string; via: string | null; description: string; present: boolean }>;
  alternatives: Array<{ id: string; name: string; difference: string }>;
  sources: Array<{ title: string; note?: string; kind: string }>;
  geometry: string;
  access: { blockers: string[]; carried: string[] };
};

const round = (n: number, places = 1) => Number(n.toFixed(places)).toLocaleString('en-GB');
const sizeText = (box: Pick<PlacedPart['box'], 'w' | 'h' | 'd'>) => `${round(box.w)} × ${round(box.h)} × ${round(box.d, 2)} mm`;
const eachBox = (part: PlacedPart) => { const size = part.detail?.size as number[] | undefined, [w, h, d] = size ?? part.component.dimensions; return { w, h, d }; };

export function bomEstimate(component: ComponentDefinition): { cost: number; label: string } | null {
  if (!component.bom) return null;
  const option = BOM_GROUPS.find(g => g.id === component.bom!.group)?.options.find(o => o.id === component.bom!.option);
  return option ? { cost: option.cost, label: option.name } : null;
}

export function inspectPart(assembly: Assembly, slotId: string): Inspection | null {
  const part = assembly.bySlot[slotId];
  if (!part) return null;
  const c = part.component, slot = part.slot;
  const figures: Figure[] = [
    { label: c.dimensionBasis.fitted ? 'Size, fitted to your chassis' : part.instances ? 'Size of each' : 'Size', value: part.instances ? `${part.instances.length} shown, ${sizeText(eachBox(part))} each` : sizeText(part.box), confidence: part.sizeConfidence, source: c.dimensionBasis.fitted ? 'fitted-geometry' : c.dimensionBasis.source },
    { label: c.dimensionBasis.fitted && c.traits.density ? 'Mass, from volume and material density' : 'Mass', value: `${round(Number(part.detail?.weightG ?? c.weightG))} g`, confidence: 'estimated', source: c.dimensionBasis.fitted && c.traits.density ? 'material-density' : 'pf-representative' },
    ...c.specs.map(s => ({ label: s.label, value: `${typeof s.value === 'number' ? round(s.value, 2) : s.value}${s.unit ? (s.unit === '%' || s.unit === '×' ? s.unit : ' ' + s.unit) : ''}`, confidence: s.confidence, source: s.source })),
  ];
  const e = c.electrical;
  if (e) {
    if (e.activeW !== undefined) figures.push({ label: 'Typical active power', value: `${round(e.activeW, 2)} W`, confidence: e.confidence, source: e.source });
    if (e.sustainedHeatW !== undefined && !c.specs.some(s => s.label.startsWith('Sustained heat'))) figures.push({ label: 'Heat under sustained load', value: `${round(e.sustainedHeatW, 2)} W`, confidence: e.confidence, source: e.source });
    if (e.peakW !== undefined) figures.push({ label: 'Peak draw', value: `${round(e.peakW, 1)} W`, confidence: e.confidence, source: e.source });
  }
  const bom = bomEstimate(c);
  if (bom) figures.push({ label: 'Planning cost', value: `about $${round(bom.cost, 2)}`, confidence: 'estimated', source: 'pf-bom' });
  const name = (id: string) => assembly.bySlot[id]?.component.name ?? SLOT_BY_ID[id]?.label ?? id;
  const incoming = assembly.parts.flatMap(p => p.slot.connections.filter(l => l.to === slotId).map(l => ({ ...l, to: p.slot.id })));
  const seen = new Set<string>();
  const connections = [...slot.connections, ...incoming].filter(l => { const key = l.to + l.interface; if (seen.has(key) || l.to === slotId) return false; seen.add(key); return true; }).map(l => ({
    slotId: l.to, name: name(l.to), interface: INTERFACE_LABELS[l.interface], via: l.via ? name(l.via) : null, description: l.description, present: !!assembly.bySlot[l.to],
  }));
  const alternatives = slot.options.filter(id => id !== c.id).map(id => COMPONENTS[id]).map(o => ({ id: o.id, name: o.name, difference: difference(c, o) }));
  return {
    slotId, slotLabel: slot.label, name: c.name, description: c.description,
    representative: c.representative, manufacturer: c.manufacturer ?? 'None, generic part class', model: c.model ?? 'None, generic part class',
    subsystem: SUBSYSTEMS[slot.subsystem], step: `Step ${slot.step} · ${ASSEMBLY_STEPS[slot.step - 1]}`, installed: part.installed,
    location: slot.location, position: describePosition(part, assembly.layout),
    figures, materials: c.materials, contains: c.contains, connections, alternatives,
    sources: [...new Set([...c.sources, 'pf-layout'])].map(id => SOURCES[id]).filter(Boolean).map(s => ({ title: s.title, note: s.note, kind: s.kind })),
    geometry: GEOMETRY_LEVELS[c.asset.level],
    access: { blockers: accessBlockers(assembly, slotId).map(p => p.component.name), carried: dependants(assembly, slotId).map(p => p.component.name) },
  };
}

/** One short phrase on how an alternative differs, using traits both parts share. */
function difference(current: ComponentDefinition, other: ComponentDefinition): string {
  const t = current.traits, o = other.traits;
  const num = (key: string, unit: string, label: string) => typeof t[key] === 'number' && typeof o[key] === 'number' && t[key] !== o[key] ? `${label} ${round(Number(o[key]), 2)}${unit} vs ${round(Number(t[key]), 2)}${unit}` : '';
  const parts = [num('energyWh', ' Wh', 'stores'), num('ratedW', ' W', 'rated'), num('gb', ' GB', ''), num('diagonal', ' mm image diagonal', ''), num('cover', '', 'covers')].filter(Boolean);
  if (parts.length) return parts[0].trim();
  const [w, h, d] = other.dimensions, [cw, ch, cd] = current.dimensions;
  if (w && cw && (w !== cw || h !== ch || d !== cd)) return `${round(w)} × ${round(h)} × ${round(d, 2)} mm`;
  return other.description.split('. ')[0];
}

export function confidenceLabel(c: Confidence) { return CONFIDENCE_LABELS[c]; }

// ── Assembly steps ─────────────────────────────────────────────────────────
export type StepSummary = { step: number; label: string; parts: PlacedPart[]; installed: number; total: number; complete: boolean };
export function stepSummaries(assembly: Assembly): StepSummary[] {
  return ASSEMBLY_STEPS.map((label, i) => {
    const parts = assembly.parts.filter(p => p.slot.step === i + 1).sort((a, b) => Math.abs(a.slot.layer) - Math.abs(b.slot.layer));
    const installed = parts.filter(p => p.installed).length;
    return { step: i + 1, label, parts, installed, total: parts.length, complete: installed === parts.length };
  }).filter(s => s.total > 0);
}

export type ActionResult = { build: PhoneBuild; message: string; ok: boolean };

/** Removes a part and anything mounted on it, explaining what had to come off first. */
export function removePart(assembly: Assembly, slotId: string): ActionResult {
  const part = assembly.bySlot[slotId], build = assembly.build;
  if (!part || !part.installed) return { build, ok: false, message: 'That part is not installed.' };
  if (part.slot.step === 1 && part.slot.id !== 'seals') return { build, ok: false, message: `The ${inSentence(part.component.name)} is the structure everything else mounts to, so it stays in place.` };
  const carried = dependants(assembly, slotId).filter(p => p.installed);
  let next = uninstallPart(build, slotId);
  for (const p of carried) next = uninstallPart(next, p.slot.id);
  const blockers = accessBlockers(assembly, slotId).map(p => p.component.name);
  const reach = blockers.length ? ` To reach it, ${list(blockers)} ${blockers.length === 1 ? 'was' : 'were'} lifted out and put back.` : '';
  const with_ = carried.length ? ` ${carried.length === 1 ? `The ${inSentence(carried[0].component.name)} is mounted on it and came out too.` : `${carried.length} parts mounted on it came out too.`}` : '';
  return { build: next, ok: true, message: `Removed the ${inSentence(part.component.name)}.${reach}${with_}` };
}
export function installPartChecked(assembly: Assembly, slotId: string): ActionResult {
  const part = assembly.bySlot[slotId], build = assembly.build;
  if (!part || part.installed) return { build, ok: false, message: 'That part is already installed.' };
  const parent = part.parent ? assembly.bySlot[part.parent] : undefined;
  if (parent && !parent.installed) return { build, ok: false, message: `Install the ${inSentence(parent.component.name)} first: the ${inSentence(part.component.name)} mounts on it.` };
  return { build: installPart(build, slotId), ok: true, message: `Installed the ${inSentence(part.component.name)}.` };
}
/** Installs every part of the next incomplete step, in stack order. */
export function installNextStep(assembly: Assembly): ActionResult & { step: number | null } {
  const step = stepSummaries(assembly).find(s => !s.complete);
  if (!step) return { build: assembly.build, ok: false, message: 'Every part is installed.', step: null };
  let next = assembly.build;
  for (const p of step.parts) if (!p.installed) next = installPart(next, p.slot.id);
  return { build: next, ok: true, message: `Step ${step.step} · ${step.label}: installed ${step.parts.filter(p => !p.installed).length} parts.`, step: step.step };
}
/** Strips the phone back to its structure so it can be built up step by step. */
export function emptyChassis(assembly: Assembly): ActionResult {
  const keep = new Set(assembly.parts.filter(p => p.slot.step === 1).map(p => p.slot.id));
  const uninstalled = assembly.parts.filter(p => !keep.has(p.slot.id)).map(p => p.slot.id);
  return { build: { ...assembly.build, uninstalled }, ok: true, message: 'Stripped back to the frame and midframe. Install the steps in order to build it up.' };
}
export const assembleAll = (assembly: Assembly): ActionResult => ({ build: { ...assembly.build, uninstalled: [] }, ok: true, message: 'Every part installed.' });

export function canLeaveEmpty(slotId: string) { const slot = SLOT_BY_ID[slotId]; return !!slot && !slot.required && !isDesignBound(slotId); }

/** Lower-cases a leading capital for use mid-sentence, leaving acronyms ("NFC", "USB-C") alone. */
export const inSentence = (name: string) => /^[A-Z][a-z]/.test(name) ? name[0].toLowerCase() + name.slice(1) : name;
/** "the A, the B and 3 more parts" — names stay as written so acronyms survive. */
function list(items: string[]) {
  const shown = items.length > 4 ? items.slice(0, 3) : items, more = items.length - shown.length;
  const named = shown.map(n => 'the ' + inSentence(n));
  if (more) return `${named.join(', ')} and ${more} more parts`;
  return named.length <= 1 ? named.join('') : `${named.slice(0, -1).join(', ')} and ${named[named.length - 1]}`;
}
