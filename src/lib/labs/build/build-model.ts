/**
 * Build a Phone — Three.js model of a resolved build.
 *
 * Owns one group per installed slot, animates exploded views and
 * install/remove moves, applies X-ray and isolation materials, and answers
 * picking. It reuses the studio's exterior model for the shell, so the
 * outside of a build is exactly what the 3D device studio draws.
 */
import * as THREE from 'three';
import { createDeviceModel } from '../device-mesh';
import { accessBlockers, type Assembly } from './assembly';
import { createMaterialLibrary, type Quality } from './materials';
import { buildPartObject, disposePartObject } from './part-mesh';
import type { PlacedPart, Subsystem } from './schema';

import type { BuildView } from './view-types';
export type { BuildView, BuildViewMode } from './view-types';
export const DEFAULT_BUILD_VIEW: BuildView = { mode: 'assembled', subsystem: 'all', xrayDepth: 1, selected: null };

/** Which studio exterior meshes belong to which slot. */
const EXTERIOR_OWNER: Record<string, string> = {
  chassis: 'frame', 'usb-c-port': 'frame', 'usb-c-tongue': 'frame', 'microphone-port': 'frame', 'speaker-grille': 'frame', 'upper-speaker': 'frame', 'antenna-cutout': 'frame', 'cooling-vent': 'frame',
  'front-bezel': 'cover-glass', 'selfie-camera': 'cover-glass', 'flat-display': 'panel',
  back: 'rear-cover', 'phonefuturist-logo': 'rear-cover', 'cooling-fan': 'rear-cover', 'fan-vane': 'rear-cover', 'performance-rail': 'rear-cover', 'dot-display': 'rear-cover', 'display-dot': 'rear-cover', 'rear-panel-seam': 'rear-cover', flash: 'rear-cover',
  'circular-housing': 'camera-housing', 'camera-island-inlay': 'camera-housing', 'camera-island': 'camera-housing', 'camera-bar': 'camera-housing', 'lens-ring': 'camera-housing', 'camera-lens': 'camera-housing', 'lens-aperture': 'camera-housing', 'lens-inner-ring': 'camera-housing', 'lens-element': 'camera-housing', 'periscope-block': 'camera-housing', 'periscope-glass': 'camera-housing',
  'power-button': 'buttons', 'volume-rocker': 'buttons',
};
const XRAY_SHELL = new Set(['rear-cover', 'camera-housing', 'cover-glass', 'panel', 'touch-layer', 'polarizer', 'backplane', 'display-support', 'display-adhesive', 'rear-adhesive', 'graphite', 'buttons', 'seals']);
const XRAY_COVERS = new Set(['shield-compute', 'shield-rf', 'heat-spreader', 'tim', 'wireless-coil', 'antenna-nfc', 'main-flex', 'battery-insulation', 'brackets']);
const LAYOUT_DEPENDENT = new Set(['film', 'panel', 'cover-glass', 'midplate', 'seal-ring', 'adhesive-ring']);

type Ghost = 'none' | 'ghost' | 'faint' | 'frame';
type Entry = {
  group: THREE.Group; part: PlacedPart; signature: string; installed: boolean;
  /** Current displacement from the seated position, millimetres. */
  offset: THREE.Vector3; factor: number; ghost: Ghost; away: THREE.Vector3;
};

export function createBuildModel(quality: Quality = 'high') {
  const group = new THREE.Group(); group.name = 'phone-build';
  let lib = createMaterialLibrary(quality);
  let exterior: ReturnType<typeof createDeviceModel> | null = null;
  let assembly: Assembly | null = null, view: BuildView = { ...DEFAULT_BUILD_VIEW }, reducedMotion = false;
  const entries = new Map<string, Entry>();
  let move: { slot: string; lifted: Set<string>; stage: 'lifting' | 'moving' } | null = null;

  const outline = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), new THREE.LineBasicMaterial({ color: '#7ae6ff', depthTest: false, transparent: true, opacity: .95 }));
  outline.renderOrder = 30; outline.visible = false; outline.name = 'selection-outline'; outline.raycast = () => {}; group.add(outline);
  const linkGeometry = new THREE.BufferGeometry(); linkGeometry.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(6 * 24), 3));
  const links = new THREE.LineSegments(linkGeometry, new THREE.LineBasicMaterial({ color: '#ffc46b', depthTest: false, transparent: true, opacity: .9 }));
  links.renderOrder = 29; links.visible = false; links.name = 'connection-lines'; links.frustumCulled = false; links.raycast = () => {}; group.add(links);

  function signature(part: PlacedPart, layoutKey: string) {
    const detail = part.detail ? JSON.stringify(part.detail, (key, value) => key === 'weightG' ? undefined : value instanceof Uint8Array ? value.length + ':' + value.reduce((n, v, i) => (n + v * (i % 97 + 1)) % 1000003, 0) : value) : '';
    const b = part.box;
    return [part.component.id, b.x, b.y, b.z, b.w, b.h, b.d].map(v => typeof v === 'number' ? v.toFixed(2) : v).join('|') + '|' + (part.instances ? JSON.stringify(part.instances) : '') + detail + (LAYOUT_DEPENDENT.has(part.component.asset.builder) ? layoutKey : '');
  }
  /** Where a part waits when it is not installed: well clear of the phone along its assembly direction. */
  function awayPosition(part: PlacedPart) {
    const [x, y, z] = part.explode, side = part.slot.layer < 0 ? -1 : 1;
    return new THREE.Vector3(x * 1.4, y * 1.4, z * 1.25 + side * 34);
  }
  function setGhost(entry: Entry, ghost: Ghost) {
    if (entry.ghost === ghost && !entry.group.userData.dirty) return;
    entry.ghost = ghost; entry.group.userData.dirty = false;
    const replacement = ghost === 'ghost' ? lib.m.ghost : ghost === 'faint' ? lib.m.ghostFaint : ghost === 'frame' ? lib.m.ghostFrame : null;
    entry.group.traverse(node => {
      const mesh = node as THREE.Mesh; if (!mesh.isMesh) return;
      mesh.userData.base ??= mesh.material;
      mesh.material = replacement ?? mesh.userData.base;
      mesh.renderOrder = replacement ? 6 : 0;
      mesh.castShadow = !replacement && !(mesh.userData.base as THREE.Material).transparent;
    });
  }
  function desiredGhost(entry: Entry): Ghost {
    const id = entry.part.slot.id, selected = view.selected;
    if (view.mode === 'inspect' && selected) {
      if (id === selected || entry.part.parent === selected) return 'none';
      return id === 'frame' ? 'frame' : 'faint';
    }
    if (view.subsystem !== 'all' && entry.part.slot.subsystem !== view.subsystem) return id === 'frame' ? 'frame' : 'ghost';
    if (view.mode === 'xray') {
      if (id === 'frame') return 'frame';
      if (XRAY_SHELL.has(id) || (view.xrayDepth === 2 && XRAY_COVERS.has(id))) return 'ghost';
    }
    return 'none';
  }
  function targetFactor(entry: Entry) {
    if (move?.lifted.has(entry.part.slot.id)) return .9;
    if (view.mode !== 'exploded') return 0;
    return view.subsystem === 'all' || entry.part.slot.subsystem === view.subsystem ? 1 : 0;
  }
  function returnExterior() {
    if (!exterior) return;
    for (const entry of entries.values()) for (const child of entry.group.children.slice()) if (child.userData.exterior) { const mesh = child as THREE.Mesh; if (mesh.userData.base) mesh.material = mesh.userData.base; exterior.group.add(child); }
  }
  function distributeExterior() {
    if (!exterior) return;
    for (const child of exterior.group.children.slice()) {
      child.userData.exterior = true;
      const owner = EXTERIOR_OWNER[child.name] ?? (child.name ? undefined : 'rear-cover'), entry = owner && entries.get(owner);
      if (entry) { entry.group.add(child); entry.group.userData.dirty = true; }
    }
  }

  function update(next: Assembly) {
    const design = next.layout.design;
    returnExterior();
    if (!exterior) exterior = createDeviceModel(design, { hollow: true }); else exterior.update(design);
    const layoutKey = [design.width, design.height, design.thickness, design.cornerRadius, design.bezel, next.layout.bay.x0, next.layout.bay.x1, next.layout.bay.y0, next.layout.bay.y1, next.layout.board.bottomY, next.layout.z.boardTop].join(':');
    const context = { lib, layout: next.layout }, seen = new Set<string>();
    let primary: string | null = null;
    for (const part of next.parts) {
      const id = part.slot.id, key = signature(part, layoutKey); seen.add(id);
      let entry = entries.get(id);
      if (!entry || entry.signature !== key) {
        const fresh = buildPartObject(part, context);
        if (entry) { group.remove(entry.group); disposePartObject(entry.group); fresh.position.copy(entry.group.position); }
        group.add(fresh);
        const away = awayPosition(part), isNew = !entry;
        entry = { group: fresh, part, signature: key, installed: entry ? entry.installed : part.installed, offset: entry ? entry.offset : (part.installed ? new THREE.Vector3() : away.clone()), factor: entry?.factor ?? 0, ghost: 'none', away };
        entry.group.userData.dirty = true;
        if (isNew && !part.installed) fresh.visible = false;
        entries.set(id, entry);
      }
      entry.part = part; entry.away = awayPosition(part);
      if (entry.installed !== part.installed) { entry.installed = part.installed; primary ??= id; if (part.installed) { entry.group.visible = true; if (reducedMotion) entry.offset.set(0, 0, 0); } }
    }
    for (const [id, entry] of entries) if (!seen.has(id)) { returnExteriorOf(entry); group.remove(entry.group); disposePartObject(entry.group); entries.delete(id); }
    distributeExterior();
    assembly = next;
    if (primary && !reducedMotion && view.mode !== 'exploded') {
      const lifted = new Set(accessBlockers(next, primary).filter(p => p.installed).map(p => p.slot.id));
      move = { slot: primary, lifted, stage: lifted.size ? 'lifting' : 'moving' };
    }
    if (view.selected && !entries.has(view.selected)) view = { ...view, selected: null };
    refresh();
  }
  function returnExteriorOf(entry: Entry) { if (exterior) for (const child of entry.group.children.slice()) if (child.userData.exterior) exterior.group.add(child); }
  function refresh() { for (const entry of entries.values()) setGhost(entry, desiredGhost(entry)); }

  const scratch = new THREE.Vector3(), goal = new THREE.Vector3();
  /** Advances animations. Returns true while anything is still moving. */
  function tick(seconds: number) {
    const blend = reducedMotion ? 1 : 1 - Math.exp(-Math.min(seconds, .05) * 7.5);
    let moving = false, liftedReady = true, moverSettled = true;
    for (const [id, entry] of entries) {
      const [ex, ey, ez] = entry.part.explode, isMover = move?.slot === id, hold = isMover && move!.stage === 'lifting';
      const factorGoal = targetFactor(entry);
      entry.factor += (factorGoal - entry.factor) * blend; if (Math.abs(factorGoal - entry.factor) < .002) entry.factor = factorGoal;
      const seated = hold ? !entry.installed : entry.installed;
      if (seated) goal.set(ex * entry.factor, ey * entry.factor, ez * entry.factor); else goal.copy(entry.away);
      entry.offset.lerp(goal, blend);
      const gap = entry.offset.distanceTo(goal);
      if (gap < .03) entry.offset.copy(goal); else moving = true;
      if (move?.lifted.has(id) && Math.abs(entry.factor - .9) > .12) liftedReady = false;
      if (isMover && gap >= .03) moverSettled = false;
      if (!entry.installed && gap < .03 && !hold) entry.group.visible = false;
      entry.group.position.copy(entry.offset);
      for (const child of entry.group.children) { const extra = child.userData.explodeOffset as [number, number, number] | undefined; if (extra) child.position.set(extra[0] * entry.factor, extra[1] * entry.factor, extra[2] * entry.factor); }
    }
    if (move) {
      if (move.stage === 'lifting' && liftedReady) { move.stage = 'moving'; moving = true; }
      else if (move.stage === 'moving' && moverSettled) { move = null; moving = true; }
      else moving = true;
    }
    const chosen = view.selected ? entries.get(view.selected) : undefined;
    outline.visible = !!chosen && chosen.group.visible;
    links.visible = false;
    if (chosen && outline.visible) {
      const b = chosen.part.box;
      outline.position.set(b.x, b.y, b.z).add(chosen.offset); outline.scale.set(b.w + .7, b.h + .7, b.d + .7);
      const array = linkGeometry.attributes.position.array as Float32Array; let n = 0;
      const centre = (e: Entry) => scratch.set(e.part.box.x, e.part.box.y, e.part.box.z).add(e.offset);
      const push = (from: Entry, to: Entry) => { if (n >= 24) return; centre(from).toArray(array, n * 6); centre(to).toArray(array, n * 6 + 3); n++; };
      for (const link of chosen.part.slot.connections) {
        const to = entries.get(link.to), via = link.via ? entries.get(link.via) : undefined;
        if (!to || !to.group.visible) continue;
        if (via && via.group.visible && via !== chosen && via !== to) { push(chosen, via); push(via, to); } else push(chosen, to);
      }
      linkGeometry.setDrawRange(0, n * 2); linkGeometry.attributes.position.needsUpdate = true; links.visible = n > 0;
    }
    return moving;
  }

  return {
    group,
    get quality() { return lib.quality; },
    update,
    setView(next: Partial<BuildView>) { view = { ...view, ...next }; if (view.selected && !entries.has(view.selected)) view.selected = null; refresh(); },
    getView: () => view,
    setReducedMotion(value: boolean) { reducedMotion = value; },
    tick,
    isAnimating: () => !!move,
    /** Slot id under a ray, ignoring parts that are ghosted or hidden. */
    pick(raycaster: THREE.Raycaster): string | null {
      const targets: THREE.Object3D[] = [];
      for (const entry of entries.values()) if (entry.group.visible && entry.ghost === 'none') targets.push(entry.group);
      for (const hit of raycaster.intersectObjects(targets, true)) { let node: THREE.Object3D | null = hit.object; while (node && !node.userData.slot) node = node.parent; if (node) return node.userData.slot as string; }
      return null;
    },
    /** Bounds the view should frame once current animations finish. */
    bounds(target = new THREE.Box3()) {
      target.makeEmpty();
      for (const entry of entries.values()) {
        if (!entry.installed) continue;
        const b = entry.part.box, f = targetFactor(entry), [ex, ey, ez] = entry.part.explode;
        target.expandByPoint(scratch.set(b.x - b.w / 2 + ex * f, b.y - b.h / 2 + ey * f, b.z - b.d / 2 + ez * f));
        target.expandByPoint(scratch.set(b.x + b.w / 2 + ex * f, b.y + b.h / 2 + ey * f, b.z + b.d / 2 + ez * f));
      }
      return target;
    },
    partBounds(slot: string, target = new THREE.Box3()) {
      const entry = entries.get(slot); if (!entry) return null;
      const b = entry.part.box, f = targetFactor(entry), [ex, ey, ez] = entry.part.explode;
      return target.setFromCenterAndSize(scratch.set(b.x + ex * f, b.y + ey * f, b.z + ez * f), new THREE.Vector3(b.w, b.h, b.d));
    },
    /** Rebuilds every part with materials for a different quality tier. */
    setQuality(next: Quality) {
      if (next === lib.quality) return;
      returnExterior();
      for (const entry of entries.values()) { group.remove(entry.group); disposePartObject(entry.group); }
      entries.clear(); lib.dispose(); lib = createMaterialLibrary(next);
      if (assembly) update(assembly);
    },
    stats() { let meshes = 0, triangles = 0; group.traverse(node => { const mesh = node as THREE.Mesh; if (!mesh.isMesh || !mesh.visible) return; meshes++; const g = mesh.geometry, count = (g.index ? g.index.count : g.attributes.position.count) / 3; triangles += count * ((mesh as unknown as THREE.InstancedMesh).isInstancedMesh ? (mesh as unknown as THREE.InstancedMesh).count : 1); }); return { parts: entries.size, meshes, triangles: Math.round(triangles), materials: Object.keys(lib.m).length }; },
    entries: () => entries as ReadonlyMap<string, Readonly<Entry>>,
    dispose() {
      returnExterior();
      for (const entry of entries.values()) disposePartObject(entry.group);
      entries.clear(); exterior?.dispose(); exterior = null; lib.dispose();
      outline.geometry.dispose(); (outline.material as THREE.Material).dispose(); linkGeometry.dispose(); (links.material as THREE.Material).dispose(); group.clear();
    },
  };
}
export type BuildModel = ReturnType<typeof createBuildModel>;
