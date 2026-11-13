/**
 * Build a Phone — placement solver.
 *
 * Turns a build (chassis design + architecture + component choices) into
 * positioned parts in chassis millimetres. Pure TypeScript with no renderer
 * imports, so the compatibility engine and tests can use the same geometry
 * the 3D view draws.
 *
 * Coordinates: origin at the chassis centre, +x to the right and +y up when
 * looking at the rear, +z out of the rear cover. The display faces −z.
 */
import { rearCameraLayout, type RearCameraLayout } from '../camera-layout';
import { normalizeDesign, type DeviceDesign } from '../device-design';
import { ARCHITECTURES, DEFAULT_ARCHITECTURE, SLOTS, SLOT_BY_ID, type Architecture } from './architectures';
import { COMPONENTS } from './catalog';
import { BUILD_SCHEMA_VERSION, type Box, type ComponentDefinition, type Confidence, type PhoneBuild, type PlacedPart, type SlotDefinition } from './schema';

export type Rect = { x0: number; y0: number; x1: number; y1: number };
export const WALL = 2.2, CELL = .5, BOTTOM_BAND = 15, EXPLODE_REAR = 7, EXPLODE_FRONT = 5;

/** Slots whose component follows a studio finish rather than a free choice. */
const DESIGN_BOUND: Record<string, (d: DeviceDesign) => string> = {
  frame: d => 'frame-' + (d.frameFinish ?? 'brushedTitanium'),
  'rear-cover': d => 'rear-' + (d.backFinish ?? 'titanium'),
  'cover-glass': d => 'glass-' + (d.frontFinish ?? 'antiReflective'),
};
export const isDesignBound = (slotId: string) => slotId in DESIGN_BOUND;
/** Design change needed to put `componentId` in a design-bound slot. */
export function designForBoundSlot(slotId: string, componentId: string): Partial<DeviceDesign> | null {
  const key = componentId.split('-').slice(1).join('-');
  if (slotId === 'frame') return { frameFinish: key as DeviceDesign['frameFinish'] };
  if (slotId === 'rear-cover') return { backFinish: key as DeviceDesign['backFinish'] };
  if (slotId === 'cover-glass') return { frontFinish: key as DeviceDesign['frontFinish'] };
  return null;
}

export function architectureOf(build: Pick<PhoneBuild, 'architecture'>): Architecture {
  return ARCHITECTURES[build.architecture] ?? ARCHITECTURES[DEFAULT_ARCHITECTURE];
}

/** Slots that exist for this chassis and architecture. */
export function activeSlots(build: Pick<PhoneBuild, 'design' | 'architecture'>): SlotDefinition[] {
  const d = normalizeDesign(build.design), arch = architectureOf(build), lenses = rearCameraLayout(build.design).positions.length;
  return SLOTS.filter(slot => {
    if (arch.omit.includes(slot.id)) return false;
    if (slot.id === 'camera-ultrawide') return lenses >= 2;
    if (slot.id === 'camera-tele') return lenses >= 3;
    if (slot.id === 'camera-tele-2') return lenses >= 4;
    if (slot.id === 'usb-port') return d.usbC !== false;
    return true;
  });
}

/** The component chosen for a slot, or null when the slot is deliberately empty. */
export function selectedComponent(build: Pick<PhoneBuild, 'design' | 'architecture' | 'selections'>, slot: SlotDefinition): ComponentDefinition | null {
  if (DESIGN_BOUND[slot.id]) return COMPONENTS[DESIGN_BOUND[slot.id](build.design)] ?? COMPONENTS[slot.options[0]];
  if (Object.hasOwn(build.selections, slot.id)) {
    const chosen = build.selections[slot.id];
    if (chosen === null) return slot.required ? COMPONENTS[defaultFor(build, slot)!] : null;
    if (slot.options.includes(chosen)) return COMPONENTS[chosen];
  }
  const fallback = defaultFor(build, slot);
  return fallback ? COMPONENTS[fallback] : null;
}
function defaultFor(build: Pick<PhoneBuild, 'design' | 'architecture'>, slot: SlotDefinition): string | null {
  const arch = architectureOf(build);
  if (Object.hasOwn(arch.defaults, slot.id)) { const value = arch.defaults[slot.id]; if (value === null || slot.options.includes(value)) return value; }
  if (slot.id === 'camera-tele' && build.design.camera === 'periscope' && rearCameraLayout(build.design).positions.length === 3) return 'cam-tele-peri-5x';
  if (slot.id === 'camera-tele-2' && build.design.camera === 'periscope') return 'cam-tele-peri-5x';
  if (slot.id === 'wireless-coil' && COMPONENTS[DESIGN_BOUND['rear-cover'](build.design)]?.traits.conductive) return null;
  if (slot.initial !== undefined) return slot.initial;
  return slot.options[0] ?? null;
}

export function defaultBuild(design: DeviceDesign, architecture = DEFAULT_ARCHITECTURE, name = design.name): PhoneBuild {
  return { version: BUILD_SCHEMA_VERSION, name, design, architecture: ARCHITECTURES[architecture] ? architecture : DEFAULT_ARCHITECTURE, selections: {}, uninstalled: [] };
}
/** Returns a copy with `componentId` chosen for a slot; null leaves an optional slot empty. */
export function replaceComponent(build: PhoneBuild, slotId: string, componentId: string | null): PhoneBuild {
  const slot = SLOT_BY_ID[slotId];
  if (!slot) return build;
  if (DESIGN_BOUND[slotId]) { const change = componentId && designForBoundSlot(slotId, componentId); return change ? { ...build, design: { ...build.design, ...change } } : build; }
  if (componentId === null ? slot.required : !slot.options.includes(componentId)) return build;
  return { ...build, selections: { ...build.selections, [slotId]: componentId } };
}
export const uninstallPart = (build: PhoneBuild, slotId: string): PhoneBuild => build.uninstalled.includes(slotId) ? build : { ...build, uninstalled: [...build.uninstalled, slotId] };
export const installPart = (build: PhoneBuild, slotId: string): PhoneBuild => ({ ...build, uninstalled: build.uninstalled.filter(id => id !== slotId) });

// ── Layout ─────────────────────────────────────────────────────────────────
export type Layout = {
  design: DeviceDesign; architecture: Architecture; camera: RearCameraLayout;
  interior: Rect;
  z: { front: number; stackBack: number; floor: number; ceiling: number; rearInner: number; rearOuter: number; boardBottom: number; boardTop: number; cavity: number };
  board: { rects: Rect[]; bottomY: number; tiers: number; tierPitch: number; thickness: number };
  bay: Rect; bottom: Rect;
  displayStack: number;
};
const rectBox = (r: Rect, z0: number, z1: number): Box => ({ x: (r.x0 + r.x1) / 2, y: (r.y0 + r.y1) / 2, z: (z0 + z1) / 2, w: r.x1 - r.x0, h: r.y1 - r.y0, d: z1 - z0 });
const at = (x: number, y: number, z0: number, w: number, h: number, d: number): Box => ({ x, y, z: z0 + d / 2, w, h, d });
export const boxRect = (b: Box): Rect => ({ x0: b.x - b.w / 2, x1: b.x + b.w / 2, y0: b.y - b.h / 2, y1: b.y + b.h / 2 });
export const overlapXY = (a: Box, b: Box, gap = 0) => Math.min(a.x + a.w / 2, b.x + b.w / 2) - Math.max(a.x - a.w / 2, b.x - b.w / 2) > gap && Math.min(a.y + a.h / 2, b.y + b.h / 2) - Math.max(a.y - a.h / 2, b.y - b.h / 2) > gap;
export const overlapZ = (a: Box, b: Box, gap = 0) => Math.min(a.z + a.d / 2, b.z + b.d / 2) - Math.max(a.z - a.d / 2, b.z - b.d / 2) > gap;

export type Assembly = {
  build: PhoneBuild; layout: Layout; parts: PlacedPart[]; bySlot: Record<string, PlacedPart>;
  /** Slots that exist but hold no component. */
  empty: SlotDefinition[];
  /** Slots whose component was fitted automatically because the user has not chosen one. */
  auto: Record<string, boolean>;
  totals: { weightG: number; installedWeightG: number; weightConfidence: Confidence; partCount: number; installedCount: number };
};

export function resolveBuild(build: PhoneBuild): Assembly {
  const design = normalizeDesign(build.design), arch = architectureOf(build), camera = rearCameraLayout(build.design);
  const slots = activeSlots(build), chosen = new Map<string, ComponentDefinition>(), empty: SlotDefinition[] = [];
  for (const slot of slots) { const c = selectedComponent(build, slot); if (c) chosen.set(slot.id, c); else empty.push(slot); }
  const pick = (id: string) => chosen.get(id);
  const auto: Record<string, boolean> = {};
  const explicit = (id: string) => Object.hasOwn(build.selections, id) && (build.selections[id] === null || !!SLOT_BY_ID[id]?.options.includes(build.selections[id]!));
  const { width: W, height: H, thickness: T } = design;
  const interior: Rect = { x0: -W / 2 + WALL, x1: W / 2 - WALL, y0: -H / 2 + WALL, y1: H / 2 - WALL };
  const Wi = interior.x1 - interior.x0, Hi = interior.y1 - interior.y0;

  // Display stack, front to back.
  const zFront = -T / 2;
  const stackOrder = ['cover-glass', 'touch-layer', 'polarizer', 'panel', 'backplane', 'display-support'];
  const stackZ: Record<string, [number, number]> = {};
  let zCursor = zFront;
  for (const id of stackOrder) { const c = pick(id); if (!c) continue; const d = c.dimensions[2]; stackZ[id] = [zCursor, zCursor + d]; zCursor += d; }
  const stackBack = zCursor, floorBase = stackBack + .5;
  const vc = pick('vapor-chamber'), vcT = vc?.dimensions[2] ?? 0, vcProtrude = Math.max(0, vcT - .4);
  const rear = pick('rear-cover')!, rearT = rear.dimensions[2], rearInner = T / 2 - rearT;
  const ceiling = rearInner - (pick('graphite') ? .07 : 0);
  const floor = floorBase + vcProtrude;

  // Bands along the height of the phone.
  const pcb = pick('pcb')!, tiers = Number(pcb.traits.tiers ?? 1), pcbT = pcb.dimensions[2], tierPitch = pcbT + 1.3;
  const boardBottomY = interior.y1 - arch.boardShare * Hi;
  const bottom: Rect = { x0: interior.x0, x1: interior.x1, y0: interior.y0, y1: interior.y0 + BOTTOM_BAND };
  const railSide = camera.cx <= 0 ? -1 : 1, railW = Math.max(15, .23 * Wi);
  const boardRects: Rect[] = [{ x0: interior.x0 + .6, x1: interior.x1 - .6, y0: boardBottomY, y1: interior.y1 - .8 }];
  let bay: Rect = { x0: interior.x0 + .8, x1: interior.x1 - .8, y0: bottom.y1 + 1, y1: boardBottomY - 1 };
  if (arch.layout === 'rail') {
    boardRects.push(railSide < 0 ? { x0: interior.x0 + .6, x1: interior.x0 + railW, y0: bottom.y1 + .5, y1: boardBottomY } : { x0: interior.x1 - railW, x1: interior.x1 - .6, y0: bottom.y1 + .5, y1: boardBottomY });
    bay = railSide < 0 ? { ...bay, x0: interior.x0 + railW + 1 } : { ...bay, x1: interior.x1 - railW - 1 };
  }
  const zBoard0 = floor + .35, zBoardTop = (level: number) => zBoard0 + pcbT + level * tierPitch;
  const layout: Layout = {
    design, architecture: arch, camera, interior, bay, bottom, displayStack: stackBack - zFront,
    z: { front: zFront, stackBack, floor, ceiling, rearInner, rearOuter: T / 2, boardBottom: zBoard0, boardTop: zBoardTop(tiers - 1), cavity: ceiling - floor },
    board: { rects: boardRects, bottomY: boardBottomY, tiers, tierPitch, thickness: pcbT },
  };

  const parts: PlacedPart[] = [], bySlot: Record<string, PlacedPart> = {};
  const put = (id: string, box: Box, more: Partial<PlacedPart> = {}) => {
    const slot = SLOT_BY_ID[id], component = pick(id);
    if (!slot || !component || !slots.includes(slot)) return undefined;
    const outward = slot.mount === 'edge' ? edgeNormal(box, interior) : [0, 0];
    const part: PlacedPart = {
      slot, component, installed: !build.uninstalled.includes(id), box, quarterTurns: 0,
      explode: [outward[0] * 14, outward[1] * 14, slot.layer > 0 ? slot.layer * EXPLODE_REAR : slot.layer * EXPLODE_FRONT],
      sizeConfidence: component.dimensionBasis.fitted ? 'estimated' : component.dimensionBasis.confidence, ...more,
    };
    parts.push(part); bySlot[id] = part; return part;
  };
  const full = (z0: number, z1: number) => rectBox({ x0: -W / 2, x1: W / 2, y0: -H / 2, y1: H / 2 }, z0, z1);
  const inner = (z0: number, z1: number, inset = 0) => rectBox({ x0: interior.x0 + inset, x1: interior.x1 - inset, y0: interior.y0 + inset, y1: interior.y1 - inset }, z0, z1);

  // Structure and display stack.
  put('frame', full(-T / 2, T / 2), { sizeConfidence: 'user' });
  put('midplate', inner(stackBack, stackBack + .5, -.4));
  put('seals', full(-T * .3, T * .3));
  const dw = design.displayWidth ?? W - 2 * design.bezel, dh = design.displayHeight ?? H - 2 * design.bezel;
  const displayRect: Rect = { x0: -dw / 2, x1: dw / 2, y0: -dh / 2, y1: dh / 2 };
  for (const id of stackOrder) {
    if (!stackZ[id]) continue;
    put(id, id === 'cover-glass' ? full(...stackZ[id]) : rectBox(displayRect, ...stackZ[id]), id === 'cover-glass' || id === 'panel' ? { sizeConfidence: 'user' } : {});
  }
  put('display-adhesive', full(zFront + .6, zFront + .75));
  put('ddic', at(0, -dh / 2 + 3, stackBack - .5, 28, 1.4, .3));
  put('display-flex', at(Math.min(8, Wi / 2 - 10), bay.y0 + 13, stackBack - .22, 16, 24, .2));

  // Thermal layer set into the midframe.
  if (vc) {
    const cover = Number(vc.traits.cover ?? .3), length = Math.min(Hi - 6, Math.max(26, cover * Hi / .78));
    const width = arch.layout === 'rail' ? railW - 3 : Math.min(Wi - 8, Math.max(24, Wi * .62));
    const cx = arch.layout === 'rail' ? (railSide < 0 ? interior.x0 + .6 + railW / 2 : interior.x1 - .6 - railW / 2) : 0;
    put('vapor-chamber', at(cx, interior.y1 - 5 - length / 2, floorBase - .4, width, length, vcT));
  }

  // Rear cameras hang from the rear cover; their depth runs toward the display.
  const camSlots = ['camera-main', 'camera-ultrawide', 'camera-tele', 'camera-tele-2'];
  const camBack = T / 2 + .3 + design.protrusion! - .7;
  const camBoxOf = (c: ComponentDefinition, lens: [number, number]): Box => { const [w, h, d] = c.dimensions; return { x: lens[0], y: lens[1] - (c.traits.folded ? (h - w) / 2 : 0), z: camBack - d / 2, w, h, d }; };
  const camBoxes: Box[] = [];
  camSlots.forEach((id, i) => {
    let c = pick(id); const lens = camera.positions[i];
    if (!c || !lens) return;
    if (!explicit(id)) {
      // Largest sensor that clears the display stack and its neighbours.
      const fits = (o: ComponentDefinition) => { const b = camBoxOf(o, lens); return b.z - b.d / 2 - stackBack >= .3 && camBoxes.every(n => !overlapXY(b, n, .2)) && b.x - b.w / 2 >= interior.x0 - .5 && b.x + b.w / 2 <= interior.x1 + .5; };
      const ranked = [c, ...SLOT_BY_ID[id].options.map(o => COMPONENTS[o]).sort((a, b) => Number(b.traits.diagonal) * b.dimensions[2] - Number(a.traits.diagonal) * a.dimensions[2])];
      const best = ranked.find(fits) ?? ranked[ranked.length - 1];
      if (best !== c) { c = best; chosen.set(id, c); }
      auto[id] = true;
    }
    const box = camBoxOf(c, lens); camBoxes.push(box);
    put(id, box, { detail: { lens, window: camera.radius * 1.6 } });
  });
  // The battery bay starts below any camera module that reaches into it.
  for (const b of camBoxes) if (b.x + b.w / 2 > bay.x0 + .5 && b.x - b.w / 2 < bay.x1 - .5 && b.y - b.h / 2 - 1 < bay.y1) bay.y1 = Math.max(bay.y0 + 10, b.y - b.h / 2 - 1);
  const selfie = design.selfieDiameter ?? 2.8, selfieY = dh / 2 - selfie * 1.2;
  const front = pick('camera-front');
  if (front) put('camera-front', at(0, Math.min(selfieY, interior.y1 - front.dimensions[1] / 2 - .3), zFront + .6, ...front.dimensions));
  put('flash', at(camera.flash[0], camera.flash[1], ceiling - 1.6, 4.2, 4.2, 1.6));

  // Top strip, behind the display.
  const topY = interior.y1 - .9;
  const ear = pick('earpiece'); if (ear) put('earpiece', at(13, topY - ear.dimensions[1] / 2, zFront + .9, ...ear.dimensions));
  const prox = pick('prox-als'); if (prox) put('prox-als', at(Math.min(23.5, interior.x1 - 3), topY - 1.6, zFront + .9, ...prox.dimensions));
  const face = pick('face-ir'); if (face) put('face-ir', at(-17.4, topY - face.dimensions[1] / 2 - .4, zFront + .6, ...face.dimensions));

  // Battery bay.
  const bayCx = (bay.x0 + bay.x1) / 2, insulation = pick('battery-insulation'), cellZ0 = floor + (insulation ? .12 : 0);
  if (insulation) put('battery-insulation', rectBox({ x0: bay.x0, x1: bay.x1, y0: bay.y0, y1: bay.y1 }, floor, floor + .12));
  const pcm = pick('battery-pcm'), fpType = pick('fingerprint')?.traits.type;
  let cell = pick('battery');
  if (cell && !explicit('battery')) {
    // Highest-energy single cell that fits the bay with swelling clearance.
    const depth = ceiling - cellZ0 - .2 - (pick('wireless-coil') ? .35 : 0) - .2, length = bay.y1 - bay.y0 - (pcm ? 4.7 : .5) - (fpType === 'optical' ? 10.5 : 0);
    const fits = (o: ComponentDefinition) => o.dimensions[0] <= bay.x1 - bay.x0 - .6 && o.dimensions[1] <= length && o.dimensions[2] <= depth;
    const ranked = [cell, ...SLOT_BY_ID['battery'].options.map(o => COMPONENTS[o]).filter(o => o.traits.cells === 1).sort((a, b) => Number(b.traits.energyWh) - Number(a.traits.energyWh))];
    const best = ranked.find(fits) ?? ranked[ranked.length - 1];
    if (best !== cell) { cell = best; chosen.set('battery', cell); }
    auto['battery'] = true;
  }
  let cellBox: Box | undefined;
  if (cell) {
    const [w, h, d] = cell.dimensions, top = bay.y1 - (pcm ? 4.7 : .5);
    cellBox = at(bayCx, top - h / 2, cellZ0, w, h, d);
    put('battery', cellBox, { detail: { cells: cell.traits.cells } });
    if (pcm) put('battery-pcm', at(bayCx, bay.y1 - 2.1, cellZ0 + .6, Math.min(pcm.dimensions[0], w - 6), 4.2, 1.6));
  }
  const cellTop = cellBox ? cellBox.z + cellBox.d / 2 : cellZ0 + 4.5;
  const flexX = bayCx + Math.min(18, (bay.x1 - bay.x0) / 2 - 9);
  put('main-flex', rectBox({ x0: flexX - 7, x1: flexX + 7, y0: bottom.y0 + 6, y1: boardBottomY + 4 }, cellTop + .02, cellTop + .22), { detail: { path: [[flexX, boardBottomY + 4], [flexX, bottom.y0 + 6]] } });
  const coaxX = arch.layout === 'rail' && railSide > 0 ? bay.x0 - .2 : bay.x1 + .15;
  put('coax', rectBox({ x0: coaxX - .55, x1: coaxX + .55, y0: bottom.y0 + 5, y1: boardBottomY + 3 }, floor + 1.2, floor + 2.3), { detail: { path: [[coaxX - 4, boardBottomY + 3], [coaxX, boardBottomY - 2], [coaxX, bottom.y1 + 2], [coaxX - 5, bottom.y0 + 5]] } });

  // Bottom band.
  const daughter = pick('daughterboard');
  if (daughter) put('daughterboard', rectBox({ x0: interior.x0 + .6, x1: interior.x1 - .6, y0: interior.y0 + .6, y1: interior.y0 + 9.6 }, zBoard0, zBoard0 + .6));
  const dTop = zBoard0 + .6;
  const port = pick('usb-port'); if (port) put('usb-port', { x: 0, y: -H / 2 + .3 + port.dimensions[1] / 2, z: 0, w: port.dimensions[0], h: port.dimensions[1], d: port.dimensions[2] });
  const spk = pick('loudspeaker'); if (spk) put('loudspeaker', at(5.6 + spk.dimensions[0] / 2, interior.y0 + .8 + spk.dimensions[1] / 2, floor + 1, ...spk.dimensions));
  const hap = pick('haptic'); if (hap) put('haptic', at(-(5.6 + hap.dimensions[0] / 2), interior.y0 + 1 + hap.dimensions[1] / 2, floor + 1, ...hap.dimensions));
  const mic = COMPONENTS['mic-mems'].dimensions;
  put('mic-bottom', at(interior.x0 + 3.2, interior.y0 + 2.6, dTop, ...mic));
  put('mic-top', at(interior.x1 - 3.4, interior.y1 - 2.6, zBoardTop(0), ...mic));
  put('mic-rear', at(camera.flash[0] + (camera.flash[0] > 0 ? -1 : 1) * 0, camera.flash[1] - 6, ceiling - 1.05, ...mic));

  // Fingerprint reader.
  const fp = pick('fingerprint');
  if (fp) {
    const [w, h, d] = fp.dimensions, type = fp.traits.type;
    if (type === 'side') put('fingerprint', { x: interior.x1 - .2, y: H * .12, z: 0, w: d, h: w, d: h }, { explode: [14, 0, 0] });
    else if (type === 'optical') put('fingerprint', at(0, bay.y0 + h / 2 + .5, stackBack - .2, w, h, d));
    else put('fingerprint', at(0, -H * .28, stackBack - .2 - d, w, h, d));
  }

  // Edge-mounted parts.
  const strip = (id: string, x: number, y: number, z0: number, vertical: boolean) => { const c = pick(id); if (!c) return; const [len, tall, thick] = c.dimensions; put(id, vertical ? at(x, y, z0, thick, len, tall) : at(x, y, z0, len, thick, tall)); };
  strip('antenna-cell-top', Math.max(interior.x0 + 18, -Wi / 2 + 18), interior.y1 - .35, floor + .6, false);
  strip('antenna-gnss', interior.x1 - 8, interior.y1 - .35, floor + .6, false);
  strip('antenna-wifi', interior.x1 - .3, interior.y1 - 13, floor + .6, true);
  strip('antenna-cell-bottom', Math.min(interior.x1 - 18, Wi / 2 - 18), interior.y0 + .35, floor + .6, false);
  const mm = pick('antenna-mmwave');
  if (mm) put('antenna-mmwave', at(interior.x1 - .85, H * .1, floor + .6, 1.6, 18, 4.2), { instances: [[interior.x1 - .85, H * .1, floor + 2.7], [interior.x0 + .85, -H * .12, floor + 2.7]] });
  put('buttons', { x: W / 2 + .4, y: H * .12, z: 0, w: 1.3, h: 15, d: T * .55 }, { explode: [14, 0, 0] });
  put('button-flex', at(interior.x1 - .3, (H * .12 + boardBottomY) / 2, -.8, .5, Math.max(8, Math.abs(boardBottomY - H * .12) + 14), 1.6), { explode: [10, 0, 0] });
  const tray = pick('sim-tray'), trayY = boardBottomY + 1.5 + 7.3;
  if (tray) put('sim-tray', { x: W / 2 + .3 - tray.dimensions[0] / 2, y: trayY, z: zBoardTop(0) + 1, w: tray.dimensions[0], h: tray.dimensions[1], d: tray.dimensions[2] }, { explode: [16, 0, 0] });

  // Logic board, then the parts soldered to it.
  const grid = boardGrid(boardRects);
  const keepOut: Box[] = [];
  for (const id of [...camSlots, 'camera-front', 'earpiece', 'face-ir', 'prox-als']) { const p = bySlot[id]; if (p && p.box.z - p.box.d / 2 < zBoardTop(tiers - 1) + 2 && p.box.z + p.box.d / 2 > zBoard0) keepOut.push(p.box); }
  for (const box of keepOut) grid.carve(boxRect(box), .6);
  const boardCells = grid.snapshot();
  put('pcb', { x: (grid.x0 + grid.x1) / 2, y: (grid.y0 + grid.y1) / 2, z: zBoard0 + (pcbT + (tiers - 1) * tierPitch) / 2, w: grid.x1 - grid.x0, h: grid.y1 - grid.y0, d: pcbT + (tiers - 1) * tierPitch },
    { detail: { cells: boardCells, cols: grid.cols, rows: grid.rows, x0: grid.x0, y0: grid.y0, cell: CELL, tiers, tierPitch, thickness: pcbT } });

  const levels = Array.from({ length: tiers }, () => grid.clone());
  const onBoard = (id: string, box: Box, level: number, more: Partial<PlacedPart> = {}) => put(id, box, { parent: 'pcb', level, explode: [0, 0, SLOT_BY_ID[id].layer * EXPLODE_REAR + level * 10], ...more });
  // Fixed positions first.
  const reader = pick('sim-reader');
  if (reader) { const [w, h, d] = reader.dimensions, box = at(interior.x1 - .6 - w / 2 - 2.4, trayY, zBoardTop(0), w, h, d); levels[0].occupy(boxRect(box)); onBoard('sim-reader', box, 0); }
  levels[0].occupy(boxRect(bySlot['mic-top']?.box ?? at(0, 0, 0, 0, 0, 0)));

  const groups: Record<string, PlacedPart[]> = { compute: [], rf: [], misc: [] };
  const free = grid.bounds();
  const anchors: Record<string, [number, number]> = {
    compute: [free.x0 + (free.x1 - free.x0) * (camera.cx <= 0 ? .62 : .38), free.y1 - (free.y1 - free.y0) * .42],
    rf: [free.x0 + (free.x1 - free.x0) * (camera.cx <= 0 ? .9 : .1), free.y1 - (free.y1 - free.y0) * .2],
    misc: [free.x0 + (free.x1 - free.x0) * .5, free.y0 + 2],
  };
  if (arch.layout === 'rail') { const r = boardRects[1]; anchors.compute = [(r.x0 + r.x1) / 2, r.y1 - (r.y1 - r.y0) * .28]; anchors.misc = [(r.x0 + r.x1) / 2, r.y0 + 6]; }
  const reserved: Rect[] = [];
  for (const zone of ['compute', 'rf', 'misc'] as const) {
    const level = tiers > 1 && zone === 'compute' ? tiers - 1 : 0, g = levels[level];
    let hull: Rect | null = null;
    for (const slot of slots) {
      if (slot.mount !== 'board' || slot.zone !== zone || slot.kind === 'shield' || slot.id === 'sim-reader' || slot.id === 'ram' || slot.id === 'tim') continue;
      const c = pick(slot.id); if (!c) continue;
      const [w, h, d] = c.dimensions, z0 = zBoardTop(level);
      const spot = g.place(w + .5, h + .5, anchors[zone], (r: Rect) => { const next = hull ? union(hull, r) : r; return reserved.every(o => !rectsOverlap(next, o, -.2)) && keepOut.every(o => !rectsOverlap(next, boxRect(o), -.2)); })
        ?? g.place(w + .5, h + .5, anchors[zone]);
      if (!spot) { onBoard(slot.id, at(anchors[zone][0], anchors[zone][1], z0, w, h, d), level, { unplaced: true }); continue; }
      const part = onBoard(slot.id, at(spot[0], spot[1], z0, w, h, d), level)!;
      groups[zone].push(part);
      if (zone !== 'misc') hull = hull ? union(hull, boxRect(part.box)) : boxRect(part.box);
    }
    if (hull && zone !== 'misc') {
      const shieldId = zone === 'compute' ? 'shield-compute' : 'shield-rf', level2 = level;
      reserved.push({ x0: hull.x0 - 1.2, x1: hull.x1 + 1.2, y0: hull.y0 - 1.2, y1: hull.y1 + 1.2 });
      const inside = groups[zone].filter(p => rectInside(boxRect(p.box), hull!));
      const ram = zone === 'compute' ? pick('ram') : undefined, soc = bySlot['soc'];
      let tallest = Math.max(...inside.map(p => p.box.d));
      if (ram && soc && !soc.unplaced) { onBoard('ram', at(soc.box.x, soc.box.y, soc.box.z + soc.box.d / 2, ram.dimensions[0], ram.dimensions[1], ram.dimensions[2]), level2, { parent: 'soc' }); tallest = Math.max(tallest, soc.box.d + ram.dimensions[2]); }
      const z0 = zBoardTop(level2), height = tallest + .3, shield = { x0: hull.x0 - .7, x1: hull.x1 + .7, y0: hull.y0 - .7, y1: hull.y1 + .7 };
      if (pick(shieldId)) {
        onBoard(shieldId, rectBox(shield, z0, z0 + height), level2);
        if (zone === 'compute' && soc && pick('tim')) onBoard('tim', at(soc.box.x, soc.box.y, z0 + height, 13, 13, .25), level2);
      }
      if (zone === 'compute' && pick('heat-spreader')) put('heat-spreader', rectBox({ x0: shield.x0 - 2.5, x1: shield.x1 + 2.5, y0: shield.y0 - 2.5, y1: shield.y1 + 2.5 }, z0 + height + .25, z0 + height + .4), { explode: [0, 0, SLOT_BY_ID['heat-spreader'].layer * EXPLODE_REAR + level2 * 10] });
    } else if (zone === 'compute' && pick('ram') && bySlot['soc']) { const soc = bySlot['soc'], ram = pick('ram')!; onBoard('ram', at(soc.box.x, soc.box.y, soc.box.z + soc.box.d / 2, ...ram.dimensions), soc.level ?? 0, { parent: 'soc', unplaced: soc.unplaced }); }
  }

  // Repeated small hardware, drawn with instancing.
  const top = levels[tiers - 1], zTop = zBoardTop(tiers - 1), socBox = bySlot['soc']?.box, pmicBox = bySlot['pmic']?.box;
  const scatter = (id: string, near: Box | undefined, w: number, h: number, d: number, spacing: number) => {
    const c = pick(id); if (!c) return;
    const count = Number(c.traits.count ?? 1), origin: [number, number] = near ? [near.x, near.y] : anchors.misc;
    const spots = top.scatter(count, w + spacing, h + spacing, origin);
    if (!spots.length) return;
    const hull = spots.reduce<Rect>((r, [x, y]) => union(r, { x0: x - w / 2, x1: x + w / 2, y0: y - h / 2, y1: y + h / 2 }), { x0: spots[0][0], x1: spots[0][0], y0: spots[0][1], y1: spots[0][1] });
    put(id, rectBox(hull, zTop, zTop + d), { parent: 'pcb', level: tiers - 1, instances: spots.map(([x, y, turn]) => [x, y, turn] as [number, number, number]), explode: [0, 0, SLOT_BY_ID[id].layer * EXPLODE_REAR + (tiers - 1) * 10], detail: { size: [w, h, d], requested: count } });
  };
  scatter('passive-inductors', pmicBox, 2, 1.6, 1, .5);
  scatter('passive-capacitors', socBox, 1, .5, .5, .35);
  scatter('passive-resistors', bySlot['audio-codec']?.box ?? socBox, 1, .5, .35, .35);
  scatter('temp-sensors', bySlot['charging-ic']?.box ?? socBox, 1, .5, .5, 6);
  scatter('fpc-connectors', { x: 0, y: boardBottomY + 2, z: 0, w: 0, h: 0, d: 0 }, 7, 2.2, .7, 1.2);
  const connectors = bySlot['fpc-connectors']?.instances ?? [];
  if (pick('brackets') && connectors.length) {
    const hull = connectors.reduce<Rect>((r, [x, y]) => union(r, { x0: x - 6, x1: x + 6, y0: y - 3.5, y1: y + 3.5 }), { x0: connectors[0][0], x1: connectors[0][0], y0: connectors[0][1], y1: connectors[0][1] });
    put('brackets', rectBox(hull, zTop + .75, zTop + 1.05), { instances: connectors.filter((_, i) => i % 2 === 0), detail: { size: [12, 7, .3] } });
  }
  if (pick('screws')) {
    const b = boardRects[0], d0 = bySlot['daughterboard']?.box, spots: Array<[number, number, number]> = [];
    for (const [x, y] of [[b.x0 + 2, b.y1 - 2], [b.x1 - 2, b.y1 - 2], [b.x0 + 2, b.y0 + 2], [b.x1 - 2, b.y0 + 2], [(b.x0 + b.x1) / 2, b.y0 + 2], [(b.x0 + b.x1) / 2 + 9, b.y1 - 2]] as Array<[number, number]>) spots.push([x, y, zTop + .2]);
    if (d0) for (const sx of [-1, -.35, .35, 1]) spots.push([d0.x + sx * (d0.w / 2 - 2), d0.y + d0.h / 2 - 1.6, dTop + .2]);
    for (const [x, y] of connectors.filter((_, i) => i % 2 === 0)) spots.push([x - 5, y, zTop + 1.1], [x + 5, y, zTop + 1.1]);
    const filtered = spots.filter(([x, y]) => !keepOut.some(o => { const r = boxRect(o); return x > r.x0 - 1 && x < r.x1 + 1 && y > r.y0 - 1 && y < r.y1 + 1; })).slice(0, 14);
    put('screws', inner(zTop, zTop + 1.6, 1), { instances: filtered, detail: { size: [1.8, 1.8, 1.6] } });
  }

  // Under the rear cover.
  const nfcAnt = pick('antenna-nfc'), islandBottom = camera.cy - camera.islandHeight / 2;
  let nfcRect: Rect | null = null;
  if (nfcAnt) { const [w, h, d] = nfcAnt.dimensions, cy = Math.min(islandBottom - 2 - h / 2, interior.y1 - 6 - h / 2), cx = Math.max(interior.x0 + w / 2 + 2, Math.min(interior.x1 - w / 2 - 2, bayCx + 4)); const box = at(cx, cy, ceiling - d, w, h, d); nfcRect = boxRect(box); put('antenna-nfc', box); }
  const coil = pick('wireless-coil');
  if (coil && cellBox) { const [w, h, d] = coil.dimensions, cy = Math.min(cellBox.y + 6, (nfcRect ? nfcRect.y0 - 1 : Infinity) - h / 2); put('wireless-coil', at(cellBox.x, cy, ceiling - d, w, h, d)); }
  if (pick('graphite')) put('graphite', inner(ceiling, ceiling + .07, 1.5));
  put('rear-adhesive', full(rearInner - .15, rearInner));
  put('rear-cover', full(rearInner, T / 2 + .3), { sizeConfidence: 'user' });
  put('camera-housing', { x: camera.cx, y: camera.cy, z: T / 2 + .3 + design.protrusion! / 2 + .3, w: camera.islandWidth, h: camera.islandHeight, d: design.protrusion! + .6 }, { sizeConfidence: 'user' });

  // Mass. Fitted parts are computed from volume and published density.
  let weightG = 0, installedWeightG = 0;
  for (const part of parts) {
    const grams = partWeight(part, layout, grid.area());
    (part.detail ??= {}).weightG = grams;
    weightG += grams; if (part.installed) installedWeightG += grams;
  }
  const order = new Map(slots.map((s, i) => [s.id, i]));
  parts.sort((a, b) => order.get(a.slot.id)! - order.get(b.slot.id)!);
  return { build, layout, parts, bySlot, empty, auto, totals: { weightG: +weightG.toFixed(1), installedWeightG: +installedWeightG.toFixed(1), weightConfidence: 'estimated', partCount: parts.length, installedCount: parts.filter(p => p.installed).length } };
}

function partWeight(part: PlacedPart, layout: Layout, boardArea: number): number {
  const c = part.component, density = Number(c.traits.density ?? 0), { w, h, d } = part.box, T = layout.design.thickness;
  if (!c.dimensionBasis.fitted || !density) return c.weightG * (part.instances && c.kind === 'antenna-mmwave' ? 1 : 1);
  const mm3 = c.kind === 'frame' ? 2 * (w + h) * WALL * T * .55
    : c.kind === 'midplate' ? w * h * d * .8
    : c.kind === 'pcb' ? boardArea * Number(c.traits.thickness ?? .7) * Number(c.traits.tiers ?? 1)
    : c.kind === 'camera-housing' ? w * h * d * .12
    : c.kind === 'daughterboard' ? w * h * d * .9
    : w * h * d;
  return +(mm3 * density / 1000).toFixed(2);
}

function edgeNormal(box: Box, interior: Rect): [number, number] {
  const gaps: Array<[number, number, number]> = [[interior.x1 - box.x, 1, 0], [box.x - interior.x0, -1, 0], [interior.y1 - box.y, 0, 1], [box.y - interior.y0, 0, -1]];
  gaps.sort((a, b) => a[0] - b[0]);
  return [gaps[0][1], gaps[0][2]];
}
const union = (a: Rect, b: Rect): Rect => ({ x0: Math.min(a.x0, b.x0), x1: Math.max(a.x1, b.x1), y0: Math.min(a.y0, b.y0), y1: Math.max(a.y1, b.y1) });
const rectsOverlap = (a: Rect, b: Rect, gap = 0) => Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) > gap && Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0) > gap;
const rectInside = (a: Rect, b: Rect) => a.x0 >= b.x0 - .01 && a.x1 <= b.x1 + .01 && a.y0 >= b.y0 - .01 && a.y1 <= b.y1 + .01;

/** Occupancy grid over the logic board outline, used to pack board-mounted parts. */
function boardGrid(rects: Rect[]) {
  const x0 = Math.min(...rects.map(r => r.x0)), x1 = Math.max(...rects.map(r => r.x1)), y0 = Math.min(...rects.map(r => r.y0)), y1 = Math.max(...rects.map(r => r.y1));
  const cols = Math.max(1, Math.round((x1 - x0) / CELL)), rows = Math.max(1, Math.round((y1 - y0) / CELL));
  const make = (cells: Uint8Array) => {
    const index = (x: number, y: number) => [Math.floor((x - x0) / CELL + 1e-6), Math.floor((y - y0) / CELL + 1e-6)];
    const mark = (r: Rect, value: number, pad = 0) => {
      const [c0, r0] = index(r.x0 - pad, r.y0 - pad), [c1, r1] = index(r.x1 + pad - 1e-4, r.y1 + pad - 1e-4);
      for (let row = Math.max(0, r0); row <= Math.min(rows - 1, r1); row++) for (let col = Math.max(0, c0); col <= Math.min(cols - 1, c1); col++) if (cells[row * cols + col]) cells[row * cols + col] = value;
    };
    const isFree = (r: Rect) => {
      const [c0, r0] = index(r.x0, r.y0), [c1, r1] = index(r.x1 - 1e-4, r.y1 - 1e-4);
      if (c0 < 0 || r0 < 0 || c1 >= cols || r1 >= rows) return false;
      for (let row = r0; row <= r1; row++) for (let col = c0; col <= c1; col++) if (cells[row * cols + col] !== 1) return false;
      return true;
    };
    const candidates = (w: number, h: number, origin: [number, number]) => {
      const list: Array<[number, number, number]> = [];
      for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
        if (cells[row * cols + col] !== 1) continue;
        const cx = x0 + col * CELL + w / 2, cy = y0 + row * CELL + h / 2;
        list.push([cx, cy, Math.hypot(cx - origin[0], cy - origin[1])]);
      }
      return list.sort((a, b) => a[2] - b[2] || a[1] - b[1] || a[0] - b[0]);
    };
    return {
      x0, x1, y0, y1, cols, rows,
      /** 0 outside the board, 1 free board, 2 occupied. */
      snapshot: () => Uint8Array.from(cells, v => v ? 1 : 0),
      carve: (r: Rect, pad = 0) => mark(r, 0, pad),
      occupy: (r: Rect) => mark(r, 2),
      clone: () => make(Uint8Array.from(cells)),
      area: () => cells.reduce((n, v) => n + (v ? 1 : 0), 0) * CELL * CELL,
      bounds: (): Rect => {
        let bx0 = Infinity, bx1 = -Infinity, by0 = Infinity, by1 = -Infinity;
        for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) if (cells[row * cols + col] === 1) { bx0 = Math.min(bx0, col); bx1 = Math.max(bx1, col + 1); by0 = Math.min(by0, row); by1 = Math.max(by1, row + 1); }
        return Number.isFinite(bx0) ? { x0: x0 + bx0 * CELL, x1: x0 + bx1 * CELL, y0: y0 + by0 * CELL, y1: y0 + by1 * CELL } : { x0, x1, y0, y1 };
      },
      /** Nearest free spot to `origin` for a w × h footprint; returns its centre. */
      place(w: number, h: number, origin: [number, number], accept?: (r: Rect) => boolean): [number, number] | null {
        for (const [cx, cy] of candidates(w, h, origin)) {
          const r = { x0: cx - w / 2, x1: cx + w / 2, y0: cy - h / 2, y1: cy + h / 2 };
          if (!isFree(r) || (accept && !accept(r))) continue;
          mark(r, 2); return [cx, cy];
        }
        return null;
      },
      /** Up to `count` free spots near `origin`, alternating orientation for a natural look. */
      scatter(count: number, w: number, h: number, origin: [number, number]): Array<[number, number, number]> {
        const out: Array<[number, number, number]> = [];
        for (const [cx, cy] of candidates(w, h, origin)) {
          if (out.length >= count) break;
          const turn = (out.length * 7 + Math.round(cx * 3)) % 3 === 0 ? 1 : 0, ww = turn ? h : w, hh = turn ? w : h;
          const r = { x0: cx - w / 2, x1: cx - w / 2 + ww, y0: cy - h / 2, y1: cy - h / 2 + hh };
          if (!isFree(r)) continue;
          mark(r, 2); out.push([(r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2, turn]);
        }
        return out;
      },
    };
  };
  const cells = new Uint8Array(cols * rows);
  for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
    const cx = x0 + (col + .5) * CELL, cy = y0 + (row + .5) * CELL;
    if (rects.some(r => cx > r.x0 && cx < r.x1 && cy > r.y0 && cy < r.y1)) cells[row * cols + col] = 1;
  }
  return make(cells);
}

// ── Assembly relationships ─────────────────────────────────────────────────
/** Installed parts that physically cover `slotId` and must come out first to reach it. */
export function accessBlockers(assembly: Assembly, slotId: string): PlacedPart[] {
  const target = assembly.bySlot[slotId];
  if (!target || target.slot.layer === 0) return [];
  const rearSide = target.slot.layer > 0;
  return assembly.parts.filter(other => {
    if (other === target || !other.installed || other.slot.layer === 0 || other.parent === slotId) return false;
    if ((other.slot.layer > 0) !== rearSide) return false;
    if (Math.abs(other.slot.layer) <= Math.abs(target.slot.layer)) return false;
    if (other.slot.mount === 'instanced' && other.slot.id !== 'screws') return false;
    if (other.slot.id === 'screws') return target.slot.id === 'pcb' || target.slot.id === 'daughterboard';
    if (other.slot.id === 'rear-adhesive' || other.slot.id === 'display-adhesive') return false;
    return overlapXY(other.box, target.box, .5);
  });
}
/** Parts that sit on `slotId` and leave with it. */
export const dependants = (assembly: Assembly, slotId: string): PlacedPart[] => assembly.parts.filter(p => p.parent === slotId || (p.parent && assembly.bySlot[p.parent]?.parent === slotId));

/** Installation order: by assembly step, then by stack order within the step. */
export function installOrder(assembly: Assembly): PlacedPart[] {
  return [...assembly.parts].sort((a, b) => a.slot.step - b.slot.step || Math.abs(a.slot.layer) - Math.abs(b.slot.layer));
}
export function describePosition(part: PlacedPart, layout: Layout): string {
  const { width: W, height: H } = layout.design, { x, y, z } = part.box;
  const vertical = y > H * .2 ? 'upper' : y < -H * .2 ? 'lower' : 'middle', side = x > W * .15 ? 'right' : x < -W * .15 ? 'left' : 'centre';
  const depth = z > layout.z.floor ? `${(layout.z.rearOuter - (z + part.box.d / 2)).toFixed(1)} mm below the rear surface` : `${(z - part.box.d / 2 - layout.z.front).toFixed(1)} mm behind the front surface`;
  return `${vertical[0].toUpperCase() + vertical.slice(1)} ${side}, viewed from the rear · ${depth}`;
}
