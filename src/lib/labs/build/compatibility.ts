/**
 * Build a Phone — compatibility and engineering checks.
 *
 * Pure rules over a resolved assembly. Every finding states its basis, so a
 * planning estimate is never presented as a verified engineering fact:
 *   layout     — geometry of the representative layout (real maths on a generic arrangement)
 *   function   — what a part needs in order to work at all
 *   standard   — a published standard (USB PD, JEDEC, 3GPP)
 *   principle  — physics that holds for any design (conductors block RF and induction)
 *   estimate   — a planning heuristic or class value; indicative only
 */
import { boxRect, overlapXY, overlapZ, type Assembly } from './assembly';
import { COMPONENTS } from './catalog';
import type { PlacedPart } from './schema';

export type Level = 'blocker' | 'warning' | 'note' | 'pass';
export type Basis = 'layout' | 'function' | 'standard' | 'principle' | 'estimate';
export const BASIS_LABELS: Record<Basis, string> = {
  layout: 'Geometry of the representative layout',
  function: 'Required for the part to work',
  standard: 'Published standard',
  principle: 'Physical principle',
  estimate: 'Planning estimate · not verified',
};
export const LEVEL_LABELS: Record<Level, string> = { blocker: 'Will not work', warning: 'Needs attention', note: 'Worth knowing', pass: 'Checks out' };
export type Finding = { id: string; level: Level; title: string; detail: string; basis: Basis; sources: string[]; slots: string[] };
export type Report = { findings: Finding[]; counts: Record<Level, number>; thermal: ThermalBudget; power: PowerBudget };
export type ThermalBudget = { sustainedW: number; budgetW: number; spreader: string; confidence: 'estimated' };
export type PowerBudget = { peakW: number; batteryPeakW: number; confidence: 'estimated' };

const SOLID = ['camera-main', 'camera-ultrawide', 'camera-tele', 'camera-tele-2', 'camera-front', 'battery', 'loudspeaker', 'haptic', 'earpiece', 'face-ir', 'prox-als', 'usb-port', 'fingerprint', 'flash', 'wireless-coil', 'vapor-chamber'];
const fmt = (n: number, d = 1) => Number(n.toFixed(d)).toLocaleString('en-GB');
const lower = (s: string) => /^[A-Z][a-z]/.test(s) ? s[0].toLowerCase() + s.slice(1) : s;

/** Passive cooling heuristic: watts a handheld can shed per square metre of skin before it becomes uncomfortably warm. */
export const PASSIVE_W_PER_M2 = 170;

export function checkBuild(assembly: Assembly): Report {
  const out: Finding[] = [], { bySlot, layout } = assembly, d = layout.design;
  const part = (id: string) => { const p = bySlot[id]; return p && p.installed ? p : undefined; };
  const add = (f: Finding) => out.push(f);
  const t = (p: PlacedPart | undefined, key: string) => p?.component.traits[key];

  // ── Function: required parts ─────────────────────────────────────────────
  const missing = assembly.parts.filter(p => p.slot.required && !p.installed);
  for (const p of missing) add({ id: 'missing-' + p.slot.id, level: 'blocker', title: `${p.slot.label} is not installed`, detail: `The phone cannot work without the ${lower(p.component.name)}. Install it, or finish the assembly.`, basis: 'function', sources: ['pf-representative'], slots: [p.slot.id] });
  for (const slot of assembly.empty.filter(s => s.required)) add({ id: 'empty-' + slot.id, level: 'blocker', title: `No part in the ${lower(slot.label)} position`, detail: 'Choose a part for this position.', basis: 'function', sources: ['pf-representative'], slots: [slot.id] });

  // ── Layout geometry ──────────────────────────────────────────────────────
  for (const p of assembly.parts.filter(p => p.unplaced)) add({ id: 'unplaced-' + p.slot.id, level: 'blocker', title: `No room on the logic board for the ${lower(p.component.name)}`, detail: 'Choose a smaller part, the stacked-board layout, or a larger chassis.', basis: 'layout', sources: ['pf-layout'], slots: [p.slot.id] });
  const solids = SOLID.map(part).filter((p): p is PlacedPart => !!p);
  const clashes: string[] = [];
  for (let i = 0; i < solids.length; i++) for (let j = i + 1; j < solids.length; j++) {
    const a = solids[i], b = solids[j];
    if ((a.slot.id === 'wireless-coil' && b.slot.id === 'battery') || (a.slot.id === 'battery' && b.slot.id === 'wireless-coil') || a.slot.id === 'vapor-chamber' || b.slot.id === 'vapor-chamber') continue;
    if (overlapXY(a.box, b.box, .2) && overlapZ(a.box, b.box, .2)) {
      clashes.push(a.slot.id + b.slot.id);
      add({ id: `clash-${a.slot.id}-${b.slot.id}`, level: 'blocker', title: `The ${lower(a.component.name)} and the ${lower(b.component.name)} occupy the same space`, detail: 'Choose a smaller part, move the cameras, or enlarge the chassis.', basis: 'layout', sources: ['pf-layout'], slots: [a.slot.id, b.slot.id] });
    }
  }
  const cell = part('battery');
  if (cell) {
    const bay = layout.bay, coil = part('wireless-coil'), r = boxRect(cell.box);
    const depthLeft = layout.z.ceiling - (cell.box.z + cell.box.d / 2) - (coil ? coil.box.d : 0);
    const fits = r.x0 >= bay.x0 - .05 && r.x1 <= bay.x1 + .05 && r.y0 >= bay.y0 - .05 && r.y1 <= bay.y1 + .05;
    if (!fits) {
      const over = Math.max(bay.y0 - r.y0, r.y1 - bay.y1, bay.x0 - r.x0, r.x1 - bay.x1);
      add({ id: 'battery-bay', level: 'blocker', title: 'The battery is larger than its bay', detail: `With its protection board the ${lower(cell.component.name)} overruns the bay by ${fmt(over)} mm. Choose a smaller cell, the stacked-board layout or a taller chassis.`, basis: 'layout', sources: ['pf-layout'], slots: ['battery'] });
    }
    if (depthLeft < 0) add({ id: 'battery-depth', level: 'blocker', title: 'The battery is too thick for this chassis', detail: `It pushes ${fmt(-depthLeft, 2)} mm into the rear cover.`, basis: 'layout', sources: ['pf-layout'], slots: ['battery'] });
    else if (depthLeft < .2) add({ id: 'battery-swell', level: 'warning', title: 'No room for the battery to swell', detail: `Pouch cells grow slightly with age; ${fmt(depthLeft, 2)} mm is left above this one. Planning practice leaves about 0.2 mm or more.`, basis: 'estimate', sources: ['li-ion-typical', 'pf-layout'], slots: ['battery'] });
    else if (fits) add({ id: 'battery-fit', level: 'pass', title: 'Battery fits its bay', detail: `${fmt(depthLeft, 2)} mm of swelling clearance above the cell.`, basis: 'layout', sources: ['pf-layout'], slots: ['battery'] });
  }
  for (const id of ['camera-main', 'camera-ultrawide', 'camera-tele', 'camera-tele-2']) {
    const cam = part(id); if (!cam) continue;
    const clearance = cam.box.z - cam.box.d / 2 - layout.z.stackBack;
    if (clearance < 0) add({ id: 'cam-depth-' + id, level: 'blocker', title: `The ${lower(cam.component.name)} is too deep for this phone`, detail: `It reaches ${fmt(-clearance, 2)} mm into the display. Choose a shallower module, raise the camera island or thicken the chassis.`, basis: 'layout', sources: ['pf-layout', 'design-input'], slots: [id] });
  }
  if (!out.some(f => f.id.startsWith('cam-depth') || f.id.startsWith('clash'))) add({ id: 'space', level: 'pass', title: 'Major parts clear each other and the display', detail: 'Cameras, battery, speakers and ports occupy separate space.', basis: 'layout', sources: ['pf-layout'], slots: [] });

  // ── Interfaces: what the processor supports ──────────────────────────────
  const soc = part('soc'), ram = part('ram'), storage = part('storage');
  if (soc && ram) {
    const supported = String(t(soc, 'ram')).split(','), type = String(t(ram, 'type'));
    if (!supported.includes(type)) add({ id: 'ram-interface', level: 'blocker', title: `The processor cannot drive ${type.toUpperCase()} memory`, detail: `This processor class supports ${supported.map(s => s.toUpperCase()).join(' and ')}. Choose memory of one of those generations.`, basis: 'estimate', sources: ['jedec-memory', 'pf-representative'], slots: ['soc', 'ram'] });
    else add({ id: 'ram-ok', level: 'pass', title: 'Memory matches the processor', detail: `${type.toUpperCase()} is among the generations this processor class supports.`, basis: 'estimate', sources: ['jedec-memory', 'pf-representative'], slots: ['ram'] });
  }
  if (soc && storage && Number(t(storage, 'ufs')) > Number(t(soc, 'ufs')))
    add({ id: 'ufs-speed', level: 'note', title: `Storage will run at UFS ${Number(t(soc, 'ufs')).toFixed(1)} speed`, detail: `UFS is backward compatible, so the UFS ${Number(t(storage, 'ufs')).toFixed(1)} part works, but no faster than the processor's interface.`, basis: 'standard', sources: ['jedec-memory'], slots: ['storage', 'soc'] });
  if (soc) {
    const cams = ['camera-main', 'camera-ultrawide', 'camera-tele', 'camera-tele-2', 'camera-front'].map(part).filter((p): p is PlacedPart => !!p);
    const streams = cams.length + (part('face-ir') ? 1 : 0), limit = Number(t(soc, 'cameras'));
    if (streams > limit) add({ id: 'csi-count', level: 'warning', title: `${streams} camera streams, but this processor class handles ${limit} at once`, detail: 'Cameras will have to take turns. Use fewer cameras or a higher processor class.', basis: 'estimate', sources: ['mipi', 'pf-representative'], slots: ['soc', ...cams.map(c => c.slot.id)] });
    const biggest = cams.reduce<PlacedPart | null>((m, c) => !m || Number(t(c, 'mp')) > Number(t(m, 'mp')) ? c : m, null);
    if (biggest && Number(t(biggest, 'mp')) > Number(t(soc, 'maxSensorMp'))) add({ id: 'isp-mp', level: 'warning', title: `The ${lower(biggest.component.name)} exceeds the image processor's sensor limit`, detail: `Its ${t(biggest, 'mp')} MP class is above the ${t(soc, 'maxSensorMp')} MP this processor class is assumed to handle.`, basis: 'estimate', sources: ['pf-representative'], slots: [biggest.slot.id, 'soc'] });
    const board = part('daughterboard');
    if (board && Number(t(board, 'usb')) > Number(t(soc, 'usb'))) add({ id: 'usb-speed', level: 'note', title: 'USB data limited to USB 2.0 speed', detail: 'The port board is wired for USB 3.2, but this processor class only provides USB 2.0.', basis: 'estimate', sources: ['pf-representative'], slots: ['daughterboard', 'soc'] });
    const pa = part('pa-module'), mm = part('antenna-mmwave'), modem = part('modem');
    if (pa && t(pa, 'rfClass') === 'mmwave') {
      if (!mm) add({ id: 'mmwave-antenna', level: 'warning', title: 'Millimetre-wave front-end without millimetre-wave antennas', detail: 'Millimetre-wave signals need antenna-in-package modules at the phone edges. Add them, or use a sub-6 GHz front-end.', basis: 'standard', sources: ['3gpp-nr'], slots: ['pa-module'] });
      if (t(soc, 'modem') !== 'mmwave' && !modem) add({ id: 'mmwave-modem', level: 'warning', title: 'The modem does not support millimetre-wave', detail: 'This processor class has a sub-6 GHz modem. Add a discrete 5G modem or use a sub-6 GHz front-end.', basis: 'estimate', sources: ['3gpp-nr', 'pf-representative'], slots: ['pa-module', 'soc'] });
    }
  }

  // ── Physics: what metal does to radio and induction ──────────────────────
  const rear = part('rear-cover'), conductiveRear = !!t(rear, 'conductive');
  if (conductiveRear && part('wireless-coil')) add({ id: 'wpc-shield', level: 'blocker', title: `Wireless charging cannot work through a ${lower(rear!.component.name)}`, detail: 'A continuous metal sheet absorbs the charging field. Choose a glass, ceramic or plastic rear cover, or remove the coil.', basis: 'principle', sources: ['em-shielding', 'wpc-qi'], slots: ['rear-cover', 'wireless-coil'] });
  if (conductiveRear && part('antenna-nfc')) add({ id: 'nfc-shield', level: 'blocker', title: 'NFC cannot read through a metal rear cover', detail: 'The 13.56 MHz field is blocked. Choose a non-metal rear cover, or move NFC to an antenna window.', basis: 'principle', sources: ['em-shielding', 'nfc-13-56'], slots: ['rear-cover', 'antenna-nfc'] });
  const frame = part('frame');
  if (t(frame, 'conductive') && d.antenna === false) add({ id: 'antenna-breaks', level: 'warning', title: 'A metal frame without antenna breaks', detail: 'A closed metal band shields the antennas inside it. Turn antenna cutouts back on, or choose a polycarbonate frame.', basis: 'principle', sources: ['em-shielding'], slots: ['frame', 'antenna-cell-top', 'antenna-cell-bottom'] });

  // ── Optics and biometrics ────────────────────────────────────────────────
  const panel = part('panel'), fp = part('fingerprint');
  if (fp && t(fp, 'type') === 'optical' && t(panel, 'tech') === 'lcd') add({ id: 'fp-lcd', level: 'blocker', title: 'An optical fingerprint reader cannot see through an LCD', detail: 'It images the fingertip through gaps in an emissive panel; an LCD backlight stack blocks that. Choose an OLED panel or another reader.', basis: 'principle', sources: ['oled-optics'], slots: ['fingerprint', 'panel'] });
  if (part('face-ir') && d.selfieStyle !== 'pill') add({ id: 'face-opening', level: 'warning', title: 'Face recognition needs a wider display opening', detail: 'The dot projector, illuminator and infrared camera sit side by side. Choose the pill-shaped opening in the exterior settings.', basis: 'layout', sources: ['pf-layout', 'design-input'], slots: ['face-ir'] });

  // ── Power and charging ───────────────────────────────────────────────────
  const charger = part('charging-ic'), rated = Number(t(charger, 'ratedW') ?? 0), wh = Number(t(cell, 'energyWh') ?? 0);
  if (charger && rated > 100) add({ id: 'pd-range', level: 'note', title: `${rated} W is above the USB PD standard power range`, detail: 'USB PD carries up to 100 W in its standard range and 240 W in its extended range. Above 100 W this charger needs an extended-range cable and adapter or a vendor protocol.', basis: 'standard', sources: ['usb-pd-spec'], slots: ['charging-ic'] });
  if (charger && cell && wh > 0) {
    const cRate = rated / wh, limit = Number(t(cell, 'maxChargeC'));
    // Five per cent tolerance: planning limits are rounded class values, not cell datasheet maxima.
    if (cRate <= limit * 1.05) add({ id: 'charge-ok', level: 'pass', title: `The battery can take ${rated} W`, detail: `A ${fmt(cRate, 1)}C rate, within the roughly ${limit}C planned for this cell class.`, basis: 'estimate', sources: ['li-ion-typical', 'pf-representative'], slots: ['charging-ic', 'battery'] });
    else add({ id: 'charge-rate', level: 'warning', title: `This battery cannot accept ${rated} W`, detail: `That is a ${fmt(cRate, 1)}C rate; this cell class is planned for about ${limit}C, so charging would be held near ${Math.round(limit * wh)} W. A dual-cell pack accepts more.`, basis: 'estimate', sources: ['li-ion-typical', 'pf-representative'], slots: ['charging-ic', 'battery'] });
  }
  // Realistic worst case: processor and radio at peak with the display on, plus the larger of flash or speaker amplifier.
  const pk = (id: string) => part(id)?.component.electrical?.peakW ?? part(id)?.component.electrical?.activeW ?? 0;
  const peak = pk('soc') + pk('modem') + pk('pa-module') + (part('panel')?.component.electrical?.activeW ?? 0) + Math.max(pk('flash'), pk('audio-amp'));
  const batteryPeak = wh * 2;
  if (cell && peak > batteryPeak) add({ id: 'peak-power', level: 'warning', title: 'Peak demand exceeds what the battery can deliver', detail: `With the processor and radio at full power, the display on and the flash firing, the parts draw about ${fmt(peak)} W; this cell is planned to supply about ${fmt(batteryPeak)} W. Expect brown-out protection under heavy load.`, basis: 'estimate', sources: ['li-ion-typical', 'pf-representative'], slots: ['battery'] });

  // ── Thermal ──────────────────────────────────────────────────────────────
  const thermal = thermalBudget(assembly);
  if (soc) {
    if (thermal.sustainedW > thermal.budgetW) add({ id: 'thermal', level: 'warning', title: 'Sustained heat exceeds the passive cooling budget', detail: `Under a long heavy load the main chips produce about ${fmt(thermal.sustainedW)} W; with ${thermal.spreader} this chassis can shed about ${fmt(thermal.budgetW)} W. Expect throttling. Choose a larger vapor chamber, a lower processor class or a larger chassis.`, basis: 'estimate', sources: ['thermal-heuristic', 'pf-representative'], slots: ['soc', ...(part('vapor-chamber') ? ['vapor-chamber'] : [])] });
    else add({ id: 'thermal-ok', level: 'pass', title: 'Sustained heat within the passive budget', detail: `About ${fmt(thermal.sustainedW)} W against roughly ${fmt(thermal.budgetW)} W with ${thermal.spreader}.`, basis: 'estimate', sources: ['thermal-heuristic', 'pf-representative'], slots: ['soc'] });
  }

  // ── Weight and thickness ─────────────────────────────────────────────────
  const grams = assembly.totals.installedWeightG;
  if (grams > 240) add({ id: 'weight', level: 'note', title: `About ${Math.round(grams)} g`, detail: 'Heavier than most phones; steel frames, ceramic backs and large batteries add the most.', basis: 'estimate', sources: ['material-density', 'pf-representative'], slots: [] });
  const proud = d.protrusion!;
  if (proud > 4) add({ id: 'bump', level: 'note', title: `The camera island stands ${fmt(proud)} mm proud`, detail: `The phone is ${fmt(d.thickness + proud + .8)} mm at its thickest point and will rock on a table.`, basis: 'layout', sources: ['design-input'], slots: ['camera-housing'] });

  const order: Record<Level, number> = { blocker: 0, warning: 1, note: 2, pass: 3 };
  out.sort((a, b) => order[a.level] - order[b.level]);
  const counts = { blocker: 0, warning: 0, note: 0, pass: 0 } as Record<Level, number>;
  for (const f of out) counts[f.level]++;
  return { findings: out, counts, thermal, power: { peakW: +peak.toFixed(1), batteryPeakW: +batteryPeak.toFixed(1), confidence: 'estimated' } };
}

/** Planning heuristic: sustained heat of the always-on chips against what the skin can shed, scaled by the best spreader. */
export function thermalBudget(assembly: Assembly): ThermalBudget {
  const d = assembly.layout.design, inst = (id: string) => assembly.bySlot[id]?.installed ? assembly.bySlot[id] : undefined;
  const sustainedW = ['soc', 'modem', 'pmic', 'rf-transceiver', 'pa-module', 'wifi-bt'].map(inst).reduce((n, p) => n + (p?.component.electrical?.sustainedHeatW ?? 0), 0);
  const areaM2 = (2 * d.width * d.height + 2 * d.thickness * (d.width + d.height)) / 1e6;
  const spreaders = ['vapor-chamber', 'graphite'].map(inst).filter((p): p is PlacedPart => !!p);
  const best = spreaders.reduce<PlacedPart | null>((m, p) => !m || Number(p.component.traits.spreadGain) > Number(m.component.traits.spreadGain) ? p : m, null);
  const gain = best ? Number(best.component.traits.spreadGain) : .85;
  return { sustainedW: +sustainedW.toFixed(2), budgetW: +(PASSIVE_W_PER_M2 * areaM2 * gain).toFixed(2), spreader: best ? 'a ' + lower(best.component.name) : 'no heat spreader', confidence: 'estimated' };
}

/** Cheapest swap in a slot that clears a blocker, for suggestions. Never claims a fix it has not re-checked. */
export function componentName(id: string) { return COMPONENTS[id]?.name ?? id; }
