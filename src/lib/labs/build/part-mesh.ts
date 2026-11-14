/**
 * Build a Phone — procedural geometry for internal parts.
 *
 * Each builder models the recognisable construction of a part class (a lens
 * barrel on a voice-coil housing, a pouch cell with its terrace fold, a
 * 24-contact USB-C receptacle) at the size the placement solver gave it.
 * Geometry is merged per material, so a part costs a handful of draw calls.
 *
 * These are Level 1 specification-based models unless a component says
 * otherwise. They show how a part class is built, not a specific product.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { slab } from '../device-mesh';
import type { Layout } from './assembly';
import type { MaterialLibrary } from './materials';
import type { PlacedPart } from './schema';

const HALF_PI = Math.PI / 2;
type Mat = THREE.Material;

/** Collects transformed geometry per material and merges it on build. */
export class PartBuilder {
  private buckets = new Map<Mat, THREE.BufferGeometry[]>();
  private children: THREE.Object3D[] = [];
  private matrix = new THREE.Matrix4();
  /** Rotate everything half a turn about x: used for parts that face the display. */
  flip = false;
  constructor(readonly ox = 0, readonly oy = 0, readonly oz = 0) {}
  add(geometry: THREE.BufferGeometry, material: Mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
    const g = geometry.index ? geometry.toNonIndexed() : geometry;
    if (g !== geometry) geometry.dispose();
    for (const name of Object.keys(g.attributes)) if (name !== 'position' && name !== 'normal' && name !== 'uv') g.deleteAttribute(name);
    g.clearGroups();
    this.matrix.compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(1, 1, 1));
    if (this.flip) this.matrix.premultiply(new THREE.Matrix4().makeRotationX(Math.PI));
    this.matrix.premultiply(new THREE.Matrix4().makeTranslation(this.ox, this.oy, this.oz));
    g.applyMatrix4(this.matrix);
    const list = this.buckets.get(material); if (list) list.push(g); else this.buckets.set(material, [g]);
    return this;
  }
  /** Adds geometry that is already in chassis coordinates. */
  raw(geometry: THREE.BufferGeometry, material: Mat) { const list = this.buckets.get(material); if (list) list.push(geometry); else this.buckets.set(material, [geometry]); return this; }
  box(w: number, h: number, d: number, material: Mat, x = 0, y = 0, z = 0, rz = 0) { return this.add(new THREE.BoxGeometry(w, h, d), material, x, y, z, 0, 0, rz); }
  /** Rounded slab lying in the xy plane. */
  slab(w: number, h: number, d: number, radius: number, material: Mat, x = 0, y = 0, z = 0, bevel = .08, rz = 0) {
    const b = Math.min(bevel, d * .24);
    if (Math.min(w, h) < 2 * b + .4) return this.box(w, h, d, material, x, y, z, rz);
    return this.add(slab(w, h, d, Math.max(.05, Math.min(radius, w / 2 - b - .01, h / 2 - b - .01)), b), material, x, y, z, 0, 0, rz);
  }
  /** Cylinder with its axis along z. */
  cyl(radius: number, length: number, material: Mat, x = 0, y = 0, z = 0, segments = 28, topRadius = radius) { return this.add(new THREE.CylinderGeometry(topRadius, radius, length, segments), material, x, y, z, HALF_PI); }
  disc(inner: number, outer: number, material: Mat, x = 0, y = 0, z = 0, segments = 40) { return this.add(inner > 0 ? new THREE.RingGeometry(inner, outer, segments) : new THREE.CircleGeometry(outer, segments), material, x, y, z); }
  plane(w: number, h: number, material: Mat, x = 0, y = 0, z = 0, rz = 0) { return this.add(new THREE.PlaneGeometry(w, h), material, x, y, z, 0, 0, rz); }
  /** Rounded-rectangle ring extruded along z. */
  ring(w: number, h: number, radius: number, wall: number, d: number, material: Mat, x = 0, y = 0, z = 0, rx = 0, ry = 0) {
    const shape = roundedRect(w, h, radius); shape.holes.push(roundedRect(w - 2 * wall, h - 2 * wall, Math.max(.05, radius - wall)));
    const g = new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: false, curveSegments: 8 }); g.translate(0, 0, -d / 2);
    return this.add(g, material, x, y, z, rx, ry);
  }
  /** A child group that moves by `explodeOffset` (millimetres at full explosion) relative to the part. */
  sub(name: string, explodeOffset: [number, number, number]) { const child = new PartBuilder(this.ox, this.oy, this.oz); const group = new THREE.Group(); group.name = name; group.userData.explodeOffset = explodeOffset; group.userData.builder = child; this.children.push(group); return child; }
  /** Draws one small model many times with instancing. `spots` are [x, y, z, rotationZ] in chassis coordinates. */
  instanced(model: (b: PartBuilder) => void, spots: Array<[number, number, number, number]>) {
    const one = new PartBuilder(); model(one);
    const dummy = new THREE.Object3D();
    for (const [material, geometry] of one.merged()) {
      const mesh = new THREE.InstancedMesh(geometry, material, spots.length);
      spots.forEach(([x, y, z, rz], i) => { dummy.position.set(x, y, z); dummy.rotation.set(0, 0, rz); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix); });
      mesh.instanceMatrix.needsUpdate = true; mesh.computeBoundingSphere(); mesh.castShadow = mesh.receiveShadow = true; this.children.push(mesh);
    }
    return this;
  }
  private merged(): Array<[Mat, THREE.BufferGeometry]> {
    const out: Array<[Mat, THREE.BufferGeometry]> = [];
    for (const [material, list] of this.buckets) {
      const geometry = list.length === 1 ? list[0] : mergeGeometries(list, false);
      if (!geometry) continue;
      if (list.length > 1) for (const g of list) g.dispose();
      out.push([material, geometry]);
    }
    this.buckets.clear(); return out;
  }
  build(name: string): THREE.Group {
    const group = new THREE.Group(); group.name = name;
    for (const [material, geometry] of this.merged()) { const mesh = new THREE.Mesh(geometry, material); mesh.castShadow = mesh.receiveShadow = !material.transparent; group.add(mesh); }
    for (const child of this.children) {
      const nested = child.userData.builder as PartBuilder | undefined;
      if (nested) { delete child.userData.builder; for (const item of nested.build(child.name).children.slice()) child.add(item); }
      group.add(child);
    }
    return group;
  }
}

function roundedRect(w: number, h: number, r: number) {
  const x = w / 2, y = h / 2; r = Math.max(.01, Math.min(r, x, y));
  const s = new THREE.Shape();
  s.moveTo(-x + r, -y); s.lineTo(x - r, -y); s.quadraticCurveTo(x, -y, x, -y + r); s.lineTo(x, y - r); s.quadraticCurveTo(x, y, x - r, y);
  s.lineTo(-x + r, y); s.quadraticCurveTo(-x, y, -x, y - r); s.lineTo(-x, -y + r); s.quadraticCurveTo(-x, -y, -x + r, -y);
  return s;
}
function rectPath(x0: number, y0: number, x1: number, y1: number) { const p = new THREE.Path(); p.moveTo(x0, y0); p.lineTo(x0, y1); p.lineTo(x1, y1); p.lineTo(x1, y0); p.lineTo(x0, y0); return p; }

/** Solid built from occupancy cells: exact rectilinear outline with cut-outs, no interior faces. */
export function gridSolid(cells: Uint8Array, cols: number, rows: number, cell: number, x0: number, y0: number, z0: number, z1: number, uvScale = 1 / 26) {
  const position: number[] = [], normal: number[] = [], uv: number[] = [];
  const at = (c: number, r: number) => c >= 0 && r >= 0 && c < cols && r < rows && cells[r * cols + c] > 0;
  const quad = (a: number[], b: number[], c: number[], d: number[], n: number[]) => { for (const p of [a, b, c, a, c, d]) { position.push(p[0], p[1], p[2]); normal.push(n[0], n[1], n[2]); uv.push(p[0] * uvScale, p[1] * uvScale); } };
  // Top and bottom faces: merge horizontal runs, then identical runs on following rows.
  const done = new Uint8Array(cols * rows);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    if (!at(c, r) || done[r * cols + c]) continue;
    let c1 = c; while (at(c1 + 1, r) && !done[r * cols + c1 + 1]) c1++;
    let r1 = r;
    grow: while (r1 + 1 < rows) { for (let k = c; k <= c1; k++) if (!at(k, r1 + 1) || done[(r1 + 1) * cols + k]) break grow; r1++; }
    for (let rr = r; rr <= r1; rr++) for (let k = c; k <= c1; k++) done[rr * cols + k] = 1;
    const xa = x0 + c * cell, xb = x0 + (c1 + 1) * cell, ya = y0 + r * cell, yb = y0 + (r1 + 1) * cell;
    quad([xa, ya, z1], [xb, ya, z1], [xb, yb, z1], [xa, yb, z1], [0, 0, 1]);
    quad([xa, yb, z0], [xb, yb, z0], [xb, ya, z0], [xa, ya, z0], [0, 0, -1]);
  }
  // Side walls along boundary edges.
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    if (!at(c, r)) continue;
    const xa = x0 + c * cell, xb = xa + cell, ya = y0 + r * cell, yb = ya + cell;
    if (!at(c, r - 1)) quad([xa, ya, z0], [xb, ya, z0], [xb, ya, z1], [xa, ya, z1], [0, -1, 0]);
    if (!at(c, r + 1)) quad([xb, yb, z0], [xa, yb, z0], [xa, yb, z1], [xb, yb, z1], [0, 1, 0]);
    if (!at(c - 1, r)) quad([xa, yb, z0], [xa, ya, z0], [xa, ya, z1], [xa, yb, z1], [-1, 0, 0]);
    if (!at(c + 1, r)) quad([xb, ya, z0], [xb, yb, z0], [xb, yb, z1], [xb, ya, z1], [1, 0, 0]);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(position, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(normal, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return g;
}

export type MeshContext = { lib: MaterialLibrary; layout: Layout };
type Builder = (b: PartBuilder, part: PlacedPart, ctx: MeshContext) => void;
const opt = (part: PlacedPart, key: string) => part.component.asset.options?.[key];

/** Board-to-board connector at the end of a flex. */
function connector(b: PartBuilder, m: MaterialLibrary['m'], x: number, y: number, z: number, w: number, rz = 0) {
  b.box(w, 1.7, .55, m.plastic, x, y, z + .27, rz);
  const dx = Math.sin(rz) * .55, dy = Math.cos(rz) * .55;
  b.box(w * .86, .22, .6, m.gold, x - dx, y + dy, z + .3, rz); b.box(w * .86, .22, .6, m.gold, x + dx, y - dy, z + .3, rz);
}

const BUILDERS: Record<string, Builder> = {
  block(b, { box }, { lib }) { b.slab(box.w, box.h, box.d, .3, lib.m.mold); },

  chip(b, part, { lib: { m } }) {
    const { w, h, d } = part.box, style = opt(part, 'style');
    if (style === 'soc') {
      // Flip-chip package: bare die on an organic substrate, ringed by decoupling capacitors.
      b.box(w, h, .34, m.substrate, 0, 0, -d / 2 + .17);
      b.box(w * .62, h * .62, d - .34, m.die, 0, 0, .17);
      b.box(w * .66, h * .66, .06, m.mold, 0, 0, -d / 2 + .37);
      for (let i = 0; i < 12; i++) { const side = i % 4, t = (Math.floor(i / 4) - 1) * w * .22, e = w * .41; b.box(side < 2 ? .5 : 1, side < 2 ? 1 : .5, .4, m.ceramicTan, side === 0 ? -e : side === 1 ? e : t, side === 2 ? -e : side === 3 ? e : t, -d / 2 + .54); }
      for (const [x, y] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.disc(0, .45, m.gold, x * w * .44, y * h * .44, -d / 2 + .345, 12);
      return;
    }
    if (style === 'rf') {
      // Shielded front-end module: laminate with a conformal metal lid.
      b.box(w, h, .14, m.substrate, 0, 0, -d / 2 + .07);
      b.slab(w - .16, h - .16, d - .14, .2, m.steel, 0, 0, .07, .05);
      b.disc(0, .22, m.mold, -w / 2 + .6, h / 2 - .6, d / 2 + .003, 10);
      return;
    }
    b.box(w, h, .12, m.substrate, 0, 0, -d / 2 + .06);
    b.slab(w - .12, h - .12, d - .12, .22, m.mold, 0, 0, .06, .06);
    if (Math.min(w, h) >= 2.4) b.plane(w - .5, h - .5, m.marking, 0, 0, d / 2 + .004);
    else b.disc(0, .16, m.nickel, -w / 2 + .45, h / 2 - .45, d / 2 + .004, 8);
    if (style === 'sensor') b.disc(0, .28, m.adhesive, w * .18, -h * .12, d / 2 + .006, 10);
    if (style === 'power') for (const s of [-1, 1]) b.box(w * .5, .12, .1, m.gold, 0, s * (h / 2 - .02), -d / 2 + .1);
  },

  pcb(b, part, { lib: { m } }) {
    const detail = part.detail as { cells: Uint8Array; cols: number; rows: number; x0: number; y0: number; cell: number; tiers: number; tierPitch: number; thickness: number } | undefined;
    const material = part.component.id === 'pcb-8l' ? m.board : m.boardDark, z0 = part.box.z - part.box.d / 2;
    if (!detail?.cells) {
      // Daughterboard: a plain strip with gold antenna-contact pads and test points.
      const { x, y, z, w, h, d } = part.box;
      b.slab(w, h, d, .8, material, x, y, z, .04);
      for (const s of [-1, 1]) { b.box(2.2, 1.6, .06, m.gold, x + s * (w / 2 - 4), y - h / 2 + 1.4, z + d / 2); b.box(1.2, 1.2, .5, m.gold, x + s * (w / 2 - 9), y + h / 2 - 1.2, z + d / 2 + .25); }
      for (let i = 0; i < 5; i++) b.disc(0, .35, m.gold, x - w * .3 + i * 2.2, y + h * .2, z + d / 2 + .004, 10);
      return;
    }
    const { cells, cols, rows, x0, y0, cell, tiers, tierPitch, thickness } = detail;
    b.raw(gridSolid(cells, cols, rows, cell, x0, y0, z0, z0 + thickness), material);
    if (tiers > 1) {
      // Interposer frame: the wall of solder-ball-carrying laminate that joins the two boards.
      const rim = new Uint8Array(cells.length), isBoard = (c: number, r: number) => c >= 0 && r >= 0 && c < cols && r < rows && cells[r * cols + c] > 0;
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { if (!isBoard(c, r)) continue; let edge = false; for (let k = 1; k <= 3 && !edge; k++) edge = !isBoard(c - k, r) || !isBoard(c + k, r) || !isBoard(c, r - k) || !isBoard(c, r + k); if (edge) rim[r * cols + c] = 1; }
      b.raw(gridSolid(rim, cols, rows, cell, x0, y0, z0 + thickness, z0 + tierPitch), m.interposer);
      b.sub('upper-board', [0, 0, 10]).raw(gridSolid(cells, cols, rows, cell, x0, y0, z0 + tierPitch, z0 + tierPitch + thickness), material);
    }
  },

  shield(b, { box: { w, h, d } }, { lib: { m } }) {
    const t = .15;
    b.slab(w, h, t, .5, m.tin, 0, 0, d / 2 - t / 2, .04);
    b.box(w - .6, t, d - t, m.steel, 0, h / 2 - t / 2, -t / 2); b.box(w - .6, t, d - t, m.steel, 0, -h / 2 + t / 2, -t / 2);
    b.box(t, h - .6, d - t, m.steel, w / 2 - t / 2, 0, -t / 2); b.box(t, h - .6, d - t, m.steel, -w / 2 + t / 2, 0, -t / 2);
    // Pick-and-place dimple and corner relief seen on stamped cans.
    b.disc(.5, .8, m.steel, w * .3, h * .3, d / 2 + .003, 16);
  },

  'camera-module'(b, part, { lib: { m } }) {
    const { w, h, d } = part.box, size = Math.min(w, h), front = !!opt(part, 'front'), ois = !!opt(part, 'ois');
    b.flip = front;
    const base = .5, can = Math.max(1.2, d * .46), stem = d - base - can, rb = Math.min(Number(opt(part, 'lens') ?? size * .6) / 2, size * .38), top = d / 2;
    b.box(w, h, base, m.substrate, 0, 0, -d / 2 + base / 2);
    for (const sx of [-1, 1]) b.box(.5, h * .6, .2, m.gold, sx * (w / 2 - .25), 0, -d / 2 + base + .1);
    // Voice-coil housing: stamped steel can over the actuator, black cover plate on top.
    b.slab(w - .3, h - .3, can, 1.1, m.steelBrushed, 0, 0, -d / 2 + base + can / 2, .16);
    b.slab(w - 1.3, h - 1.3, .12, .9, m.plastic, 0, 0, -d / 2 + base + can + .05, .03);
    if (ois) for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.box(size * .16, size * .16, .22, m.nickel, sx * (w / 2 - size * .16), sy * (h / 2 - size * .16), -d / 2 + base + can + .14);
    // Lens barrel with focus-thread rings and a stepped nose.
    const z0 = -d / 2 + base + can;
    b.cyl(rb, stem, m.barrel, 0, 0, z0 + stem / 2, 40);
    b.cyl(rb + .22, .22, m.barrel, 0, 0, z0 + stem * .28, 40); b.cyl(rb + .22, .22, m.barrel, 0, 0, z0 + stem * .55, 40);
    b.disc(rb * .78, rb, m.plastic, 0, 0, top + .004);
    // Optics, front to back: coated front element, aperture stop, infrared-cut filter, sensor.
    const dome = new THREE.SphereGeometry(rb * .78, 32, 12, 0, Math.PI * 2, 0, .62); dome.scale(1, .34, 1); dome.translate(0, -rb * .78 * .34 * Math.cos(.62), 0);
    b.add(dome, m.lens, 0, 0, top - .02, HALF_PI);
    b.disc(rb * .34, rb * .78, m.barrel, 0, 0, top - Math.min(.5, stem * .3));
    b.disc(0, rb * .5, m.irFilter, 0, 0, top - Math.min(1.1, stem * .6), 24);
    b.box(rb * .9, rb * .68, .05, m.sensor, 0, 0, top - Math.min(1.7, stem * .9));
    // Rigid-flex tail and connector toward the logic board.
    if (!front) { b.box(size * .46, 4.4, .14, m.flex, 0, -h / 2 - 2.2, -d / 2 + base - .07); connector(b, m, 0, -h / 2 - 3.6, -d / 2 + base, size * .4); }
    else { b.box(3.2, 3.6, .14, m.flex, 0, h / 2 + 1.8, -d / 2 + base - .07); }
  },

  'camera-periscope'(b, part, { lib: { m } }) {
    const { w, h, d } = part.box, lensY = h / 2 - w / 2, win = Number(opt(part, 'lens') ?? 7);
    b.slab(w, h, d * .9, .9, m.steelBrushed, 0, 0, -d * .05, .14);
    // Entrance window over the prism, which turns the light path along the module.
    b.ring(win + 1.4, win + 1.4, 1.2, .7, .3, m.barrel, 0, lensY, d / 2 - .15);
    b.slab(win, win, .3, .8, m.lens, 0, lensY, d / 2 - .12, .05);
    b.plane(win * .96, win * 1.3, m.die, 0, lensY, d / 2 - .3 - win * .32, 0);
    // Stabilisation coils on the flanks and the sensor board at the far end.
    for (const sx of [-1, 1]) { b.box(.3, h * .34, d * .5, m.copper, sx * (w / 2 + .05), lensY - h * .2, -d * .05); b.box(.34, h * .2, d * .42, m.gold, sx * (w / 2 + .05), -h * .22, -d * .05); }
    b.box(w * .92, .6, d * .96, m.substrate, 0, -h / 2 - .1, -d * .02);
    b.slab(w * .6, h * .3, .08, .5, m.plastic, 0, -h * .16, d * .4 + .03, .02);
    b.box(w * .5, .14, 5, m.flex, w * .1, -h / 2 - .5, -d / 2 - 2.2); connector(b, m, w * .1, -h / 2 - 1.6, -d / 2 - 4.6, w * .46);
  },

  battery(b, part, { lib: { m } }) {
    const { w, h, d } = part.box, cells = Number(opt(part, 'cells') ?? 1), bodyH = h - 3.2, each = cells > 1 ? (w - .8) / 2 : w;
    for (let i = 0; i < cells; i++) {
      const x = cells > 1 ? (i ? 1 : -1) * (each / 2 + .4) : 0;
      // Pouch body with rolled side seams, and the flattened terrace where the tabs leave the cell.
      b.slab(each, bodyH, d, 2.2, m.pouch, x, -1.6, 0, d * .24);
      b.plane(each * .84, bodyH * .86, m.label, x, -1.6, d / 2 + .012);
      for (const s of [-1, 1]) b.box(.3, bodyH - 6, d * .55, m.foil, x + s * (each / 2 - .1), -1.6, 0);
      b.box(each - 3, 3.2, d * .36, m.foil, x, h / 2 - 1.6, -d * .22);
      b.box(each - 6, .5, d * .38, m.kapton, x, h / 2 - 3.1, -d * .2);
      for (const s of [-1, 1]) b.box(4.2, 2.6, .16, m.nickel, x + s * each * .2, h / 2 + .9, -d * .3);
    }
  },

  pcm(b, { box: { w, h, d } }, { lib: { m } }) {
    b.box(w, h, .5, m.boardDark, 0, 0, -d / 2 + .25);
    b.slab(3.2, 2.2, .7, .2, m.mold, -w * .3, 0, -d / 2 + .85, .05); b.slab(3.2, 2.2, .7, .2, m.mold, -w * .14, 0, -d / 2 + .85, .05);
    b.slab(2, 2, .6, .2, m.mold, w * .06, 0, -d / 2 + .8, .05); b.box(1.6, .8, .5, m.ceramicTan, w * .18, .8, -d / 2 + .75);
    b.box(w * .42, h + .4, .1, m.kapton, -w * .22, 0, -d / 2 + 1.25);
    b.box(7.5, 6.4, .14, m.flex, w * .34, h / 2 + 3, -d / 2 + .3); connector(b, m, w * .34, h / 2 + 5, -d / 2 + .38, 6.4);
  },

  film(b, part, { lib: { m }, layout }) {
    const { w, h, d } = part.box, tint = String(opt(part, 'tint'));
    const display = part.slot.subsystem === 'display', radius = display ? Math.max(1, layout.design.cornerRadius! - layout.design.bezel) : 2.4;
    const material = tint === 'touch' ? m.touchFilm : tint === 'polarizer' ? m.polarizer : tint === 'backplane' ? m.backplane : tint === 'copper' ? m.copperFoil : tint === 'graphite' ? m.graphite : m.kapton;
    b.slab(w, h, Math.max(d, .04), radius, material, 0, 0, 0, .01);
    if (tint === 'insulation') for (const s of [-1, 1]) b.box(5, 16, .06, m.silicone, s * w * .22, -h / 2 + 9, d / 2 + .03);
    if (tint === 'copper' && display) b.slab(w * .9, h * .9, .04, radius, m.foam, 0, 0, d / 2, .01);
  },

  panel(b, part, { lib: { m }, layout }) {
    const { w, h, d } = part.box, radius = Math.max(1, layout.design.cornerRadius! - layout.design.bezel), lcd = opt(part, 'tech') === 'lcd';
    if (lcd) { b.slab(w, h, d * .55, radius, m.ceramicWhite, 0, 0, d * .22, .02); b.slab(w, h, d * .45, radius, m.oledBack, 0, 0, -d * .27, .02); b.box(w * .8, 1.6, d * .5, m.phosphor, 0, -h / 2 + 1, d * .2); }
    else b.slab(w, h, d, radius, m.oledBack, 0, 0, 0, .02);
    // Chip-on-panel tail folded behind the lower edge.
    b.box(w * .5, 5, .1, m.kapton, 0, -h / 2 + 2.6, d / 2 + .05);
  },

  'cover-glass'(b, { box: { w, h } }, { lib, layout }) {
    if (lib.quality === 'high') b.slab(w - .7, h - .7, .14, layout.design.cornerRadius! - .35, lib.m.coverGlass, 0, 0, -.45, .03);
  },

  'driver-ic'(b, { box: { w, h, d } }, { lib: { m } }) { b.box(w, h, d, m.die); b.box(w * .96, .12, .05, m.gold, 0, h / 2 - .1, d / 2); b.box(w * .96, .12, .05, m.gold, 0, -h / 2 + .1, d / 2); },

  'vapor-chamber'(b, { box: { w, h, d } }, { lib: { m } }) {
    b.slab(w, h, d, 3.2, m.copperSheet, 0, 0, 0, .1);
    b.ring(w - 1.2, h - 1.2, 2.6, .5, .06, m.copper, 0, 0, d / 2 + .03);
    // Crimped and welded fill tube left from charging the chamber with working fluid.
    b.box(1.4, 4, d * .7, m.copper, w * .3, -h / 2 - 1.6, 0); b.box(1.8, .8, d * .9, m.copper, w * .3, -h / 2 - 3.4, 0);
  },

  tim(b, { box: { w, h, d } }, { lib: { m } }) { b.slab(w, h, d, 1.2, m.tim, 0, 0, 0, .05); },

  coil(b, part, { lib: { m } }) {
    const { w, d } = part.box, r = w / 2, magnets = !!opt(part, 'magnets'), outer = magnets ? r - 6.5 : r - 1.2;
    b.cyl(r, .12, m.ferrite, 0, 0, -d / 2 + .06, 56);
    const turns = 11, pitch = (outer - r * .34) / turns;
    for (let i = 0; i < turns; i++) b.disc(r * .34 + i * pitch, r * .34 + i * pitch + pitch * .78, m.copper, 0, 0, d / 2 - .02 - (i % 2) * .004, 56);
    b.box(.9, r * .7, .1, m.copper, r * .2, -r * .72, d / 2 - .06, .3); b.box(.9, r * .7, .1, m.copper, r * .32, -r * .7, d / 2 - .06, .3);
    if (magnets) for (let i = 0; i < 18; i++) { if (i === 9) continue; const a = i / 18 * Math.PI * 2 + Math.PI / 2; b.box(4.4, 3.4, .32, m.nickel, Math.cos(a) * (r - 3), Math.sin(a) * (r - 3), 0, a + HALF_PI); }
  },

  'nfc-loop'(b, { box: { w, h, d } }, { lib: { m } }) {
    b.slab(w, h, .08, 2, m.ferrite, 0, 0, -d / 2 + .04, .02);
    for (let i = 0; i < 4; i++) b.ring(w - 1.4 - i * 1.9, h - 1.4 - i * 1.9, 2.4, .6, .04, m.copper, 0, 0, d / 2 - .02);
    for (const s of [-1, 1]) b.box(1.4, 1.4, .08, m.gold, w / 2 - 2 + s * 1.1, -h / 2 + 2, d / 2);
  },

  speaker(b, part, { lib: { m } }) {
    const { w, h, d } = part.box;
    if (opt(part, 'small')) {
      b.slab(w, h, d, 1, m.steelBrushed, 0, 0, 0, .18); b.slab(w * .7, h * .5, .06, .8, m.mesh, 0, 0, -d / 2 - .02, .01);
      for (const s of [-1, 1]) b.box(1.3, 1.6, .2, m.gold, s * 2, -h / 2 + .9, d / 2 + .1);
      return;
    }
    // Moulded enclosure: its sealed back volume is the acoustic chamber.
    b.slab(w, h, d, 1.6, m.plastic, 0, 0, 0, .25);
    b.slab(w * .46, h * .74, .2, 1, m.steel, -w * .22, 0, d / 2 + .08, .04); b.slab(w * .36, h * .56, .06, .8, m.mesh, -w * .22, 0, d / 2 + .2, .01);
    for (let i = 0; i < 3; i++) b.box(.4, h * .7, .25, m.plasticGrey, w * (.12 + i * .11), 0, d / 2 + .1);
    b.box(w * .34, 1.4, d * .62, m.plasticGrey, -w * .22, -h / 2 - .6, -d * .1);
    b.box(w * .3, .1, d * .5, m.mesh, -w * .22, -h / 2 - 1.32, -d * .1);
    b.ring(w * .38, d * .74, .6, .35, .5, m.silicone, -w * .22, -h / 2 - 1.1, -d * .1, HALF_PI);
    for (const s of [-1, 1]) b.box(1.3, 2.2, .3, m.gold, w * .38 + s * 1, h / 2 - 1.6, d / 2 + .12);
  },

  haptic(b, { box: { w, h, d } }, { lib: { m } }) {
    b.slab(w, h, d, .9, m.steelBrushed, 0, 0, 0, .22);
    for (const s of [-1, 1]) b.box(.9, h * .96, d * .96, m.plastic, s * (w / 2 - .4), 0, 0);
    b.plane(w * .5, h * .5, m.marking, 0, 0, d / 2 + .006);
    b.box(4.2, 3, .14, m.flex, w * .2, h / 2 + 1.3, -d / 2 + .07); for (const s of [-1, 1]) b.box(1, 1.2, .08, m.gold, w * .2 + s * .9, h / 2 + 1.6, -d / 2 + .16);
  },

  'usb-c'(b, { box: { w, h, d } }, { lib: { m } }) {
    // Insertion axis is y; the mouth faces −y. Proportions follow the USB Type-C receptacle outline.
    b.ring(w, d, d / 2 - .02, .3, h, m.steel, 0, 0, 0, HALF_PI);
    b.box(6.69, h * .62, .7, m.plastic, 0, -h * .08, 0);
    for (let i = 0; i < 12; i++) for (const s of [-1, 1]) b.box(.26, h * .44, .05, m.gold, -2.75 + i * .5, -h * .12, s * .375);
    b.box(w + .2, h * .3, d + .1, m.plastic, 0, h / 2 - h * .15, 0);
    for (const sx of [-1, 1]) for (const sy of [-.18, .3]) b.box(.5, 1.1, d + .9, m.steel, sx * (w / 2 + .05), sy * h, -.3);
    b.ring(w + .9, d + .9, d / 2 + .4, .4, .7, m.silicone, 0, -h / 2 + .6, 0, HALF_PI);
  },

  'sim-tray'(b, { box: { w, h, d } }, { lib: { m } }) {
    const plate = roundedRect(w - 1.2, h, .8); plate.holes.push(rectPath(-(w - 1.2) / 2 + .5, -6.2, -(w - 1.2) / 2 + .5 + 8.9, 6.2));
    const g = new THREE.ExtrudeGeometry(plate, { depth: d * .7, bevelEnabled: false }); g.translate(0, 0, -d * .35);
    b.add(g, m.aluminium, -.6, 0, 0);
    // Faceplate with eject pinhole, sealed by a moulded gasket.
    b.slab(1.2, h + .8, 2.7, .5, m.aluminium, w / 2 - .6, 0, 0, .1); b.cyl(.38, .1, m.adhesive, w / 2 + .01, -h * .34, 0, 12);
    b.ring(1, h + .5, .4, .25, 2.9, m.silicone, w / 2 - 1.5, 0, 0);
    // 4FF nano-SIM seated in the tray.
    b.box(8.8, 12.3, .4, m.ceramicWhite, -(w - 1.2) / 2 + 4.95 - .6, 0, 0);
    b.slab(6.4, 7.6, .04, 1, m.gold, -(w - 1.2) / 2 + 4.95 - .6, .6, -.22, .01);
  },

  'sim-reader'(b, { box: { w, h, d } }, { lib: { m } }) {
    b.box(w, h, d * .35, m.plastic, 0, 0, -d / 2 + d * .175);
    b.ring(w, h, .6, 1.3, .2, m.steel, 0, 0, d / 2 - .1);
    for (const s of [-1, 1]) b.box(.25, h, d * .65, m.steel, s * (w / 2 - .12), 0, d * .17);
    for (let i = 0; i < 6; i++) b.box(1.6, .7, .3, m.gold, (i % 2 ? 1 : -1) * 2.2, (Math.floor(i / 2) - 1) * 2.54, -d / 2 + d * .35 + .15);
  },

  crystal(b, { box: { w, h, d } }, { lib: { m } }) {
    b.box(w, h, d * .5, m.ceramicTan, 0, 0, -d * .25); b.slab(w - .2, h - .2, d * .5, .15, m.nickel, 0, 0, d * .25, .04);
    b.box(1.6, 1, d * .45, m.ceramicTan, w / 2 + 1.4, 0, -d * .27); b.slab(1.4, .8, d * .45, .1, m.nickel, w / 2 + 1.4, 0, d * .18, .03);
  },

  flex(b, part, { lib: { m } }) {
    const { w, h, d } = part.box, shape = opt(part, 'shape');
    if (shape === 'main') {
      b.box(w, h - 9, .12, m.flex, 0, 0, 0);
      for (const s of [-1, 1]) { b.box(w, 5, .3, m.plasticGrey, 0, s * (h / 2 - 2.5), .05); connector(b, m, 0, s * (h / 2 - 2.5), .2, w * .8); }
      b.box(w * .3, h * .12, .14, m.kapton, w * .2, h * .12, .08);
    } else if (shape === 'display') {
      b.box(w, h, .12, m.flex, 0, 0, 0); b.box(w * .7, 4.5, .28, m.plasticGrey, 0, h / 2 - 2.4, .14); connector(b, m, 0, h / 2 - 2.4, .28, w * .6);
      b.slab(3.2, 3.2, .5, .2, m.mold, -w * .2, -h * .12, .3, .05); b.slab(2, 2, .45, .2, m.mold, w * .2, -h * .2, .28, .05);
      for (let i = 0; i < 4; i++) b.box(1, .5, .4, m.ceramicTan, -w * .3 + i * 1.6, -h * .3, .26);
    } else {
      b.box(w * .3, h, d, m.flex, 0, 0, 0);
      for (const y of [-h * .32, h * .12, h * .34]) { b.box(.5, 3.4, d, m.plasticGrey, .2, y, 0); b.cyl(.9, .3, m.steel, .5, y, 0, 14); }
    }
  },

  coax(b, part, { lib: { m } }) {
    const path = (part.detail?.path as number[][] | undefined) ?? [[part.box.x, part.box.y + part.box.h / 2], [part.box.x, part.box.y - part.box.h / 2]];
    const z = part.box.z, curve = new THREE.CatmullRomCurve3(path.map(([x, y]) => new THREE.Vector3(x, y, z)), false, 'catmullrom', .12);
    b.raw(new THREE.TubeGeometry(curve, 60, .46, 8).toNonIndexed(), m.coaxJacket);
    for (const [x, y] of [path[0], path[path.length - 1]]) { const p = new PartBuilder(); p.cyl(.95, .7, m.gold, x, y, z - .2, 16); p.cyl(.5, .9, m.steel, x, y, z - .2, 12); for (const child of p.build('end').children) b.raw((child as THREE.Mesh).geometry, (child as THREE.Mesh).material as Mat); }
  },

  antenna(b, { box: { w, h, d } }, { lib: { m } }) {
    const along = w >= h, length = along ? w : h;
    b.box(w, h, d, m.plastic);
    // Laser-structured radiator trace on the carrier, with spring contacts to the board.
    for (let i = 0; i < 3; i++) { const t = (i - 1) * length * .3; along ? b.box(length * .24, .06, d * (.5 + i * .12), m.copper, t, -h / 2 - .02, 0) : b.box(.06, length * .24, d * (.5 + i * .12), m.copper, -w / 2 - .02, t, 0); }
    for (const s of [-1, 1]) along ? b.box(1.2, 1.4, .5, m.gold, s * length * .36, -h / 2 - .6, -d / 2 + .3) : b.box(1.4, 1.2, .5, m.gold, -w / 2 - .6, s * length * .36, -d / 2 + .3);
  },

  aip(b, part, { lib: { m } }) {
    const { w, h, d } = part.box;
    for (const [x, y, z] of part.instances ?? [[part.box.x, part.box.y, part.box.z]]) {
      const p = new PartBuilder(x, y, z), out = x > 0 ? 1 : -1;
      p.box(w * .55, h, d, m.ceramicWhite, out * w * .2, 0, 0);
      for (let i = 0; i < 4; i++) p.box(.05, h * .15, d * .5, m.gold, out * (w * .48), (i - 1.5) * h * .22, 0);
      p.box(w * .4, h * .5, d * .7, m.mold, -out * w * .28, 0, 0); p.box(.14, 5, d * .6, m.flex, -out * w * .3, -h / 2 - 2.4, 0);
      for (const child of p.build('aip').children) b.raw((child as THREE.Mesh).geometry, (child as THREE.Mesh).material as Mat);
    }
  },

  mic(b, { box: { w, h, d } }, { lib: { m } }) { b.box(w, h, .25, m.substrate, 0, 0, -d / 2 + .12); b.slab(w - .3, h - .3, d - .25, .25, m.steel, 0, 0, .12, .06); b.disc(0, .28, m.adhesive, w * .2, 0, d / 2 + .004, 12); },

  'optical-sensor'(b, { box: { w, h, d } }, { lib: { m } }) {
    b.box(w, h, .3, m.substrate, 0, 0, -d / 2 + .15); b.slab(w - .2, h - .2, d - .3, .25, m.clearMold, 0, 0, .15, .06);
    b.disc(0, .55, m.sensor, -w * .24, 0, d / 2 + .004, 16); b.disc(0, .42, m.irFilter, w * .2, 0, d / 2 + .004, 16); b.box(.24, h * .8, d - .3, m.plastic, 0, 0, .15);
  },

  fingerprint(b, part, { lib: { m } }) {
    const { w, h, d } = part.box, type = opt(part, 'type');
    if (type === 'optical') { b.flip = true; b.box(w, h, .4, m.substrate, 0, 0, -d / 2 + .2); b.cyl(w * .36, d - .4, m.barrel, 0, 0, .2, 28); b.disc(0, w * .28, m.lens, 0, 0, d / 2 + .004, 24); b.box(3, 5, .12, m.flex, 0, h / 2 + 2.4, -d / 2 + .1); }
    else if (type === 'ultrasonic') { b.slab(w, h, d, 1, m.backplane, 0, 0, 0, .04); b.ring(w, h, 1, .5, .04, m.gold, 0, 0, d / 2); b.box(5, 6, .1, m.flex, w * .2, -h / 2 - 3, 0); }
    else { b.slab(w, h, d, Math.min(w, h) * .45, m.plastic, 0, 0, 0, .1); b.box(w * .5, h * .9, .05, m.steel, w / 2, 0, 0); }
  },

  'face-ir'(b, { box: { w, h, d } }, { lib: { m } }) {
    b.flip = true;
    b.slab(w, h, d * .34, .8, m.steelBrushed, 0, 0, -d * .33, .08);
    for (const [x, r] of [[-w * .32, 2.2], [0, 1.5], [w * .3, 2]] as Array<[number, number]>) { b.cyl(r, d * .66, m.barrel, x, 0, d * .17, 24); b.disc(r * .45, r, m.plastic, x, 0, d / 2 + .004, 20); b.disc(0, r * .45, m.irFilter, x, 0, d / 2 + .002, 16); }
    b.box(w * .5, 4, .12, m.flex, 0, h / 2 + 2, -d / 2 + .1);
  },

  flash(b, { box: { w, h, d } }, { lib: { m } }) {
    b.box(w, h, d * .4, m.ceramicWhite, 0, 0, -d * .3);
    for (const s of [-1, 1]) b.box(w * .3, w * .3, d * .2, m.phosphor, s * w * .2, 0, 0);
    b.cyl(w * .46, d * .25, m.clearMold, 0, 0, d * .3, 24, w * .4);
  },

  midplate(b, part, { lib: { m }, layout }) {
    const { w, h, d } = part.box, shape = roundedRect(w, h, Math.max(1, layout.design.cornerRadius! - 1.8));
    const hole = (x0: number, y0: number, x1: number, y1: number) => { if (x1 - x0 > .4 && y1 - y0 > .4 && x0 > -w / 2 + .6 && x1 < w / 2 - .6 && y0 > -h / 2 + .6 && y1 < h / 2 - .6) shape.holes.push(rectPath(x0, y0, x1, y1)); };
    const cut = part.detail?.cutouts as number[][] | undefined;
    for (const [x0, y0, x1, y1] of cut ?? []) hole(x0, y0, x1, y1);
    const g = new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: false, curveSegments: 8 }); g.translate(0, 0, -d / 2);
    b.add(g, m.aluminium);
    // Machined battery-bay walls and threaded bosses, standing proud of the plate.
    const bay = layout.bay, t = .7, wallH = 1.1, z = d / 2 + wallH / 2;
    b.box(bay.x1 - bay.x0 + t, t, wallH, m.aluminium, (bay.x0 + bay.x1) / 2, bay.y1 + t / 2 + .1, z); b.box(bay.x1 - bay.x0 + t, t, wallH, m.aluminium, (bay.x0 + bay.x1) / 2, bay.y0 - t / 2 - .1, z);
    for (const [x, y] of (part.detail?.bosses as number[][] | undefined) ?? []) { b.cyl(1.25, .35, m.aluminium, x, y, d / 2 + .175, 16); b.cyl(.45, .36, m.adhesive, x, y, d / 2 + .18, 10); }
  },

  'seal-ring'(b, _part, { lib: { m }, layout }) {
    const { width: W, height: H } = layout.design, x = W / 2 - 2.35;
    // Gaskets sit in the side-wall openings, so each ring faces along x.
    const t = layout.design.thickness * .55 + .8;
    b.ring(t, 16.6, 1.2, .45, .5, m.silicone, x, H * .12, 0, 0, HALF_PI); b.ring(t, 26.6, 1.2, .45, .5, m.silicone, -x, H * .2, 0, 0, HALF_PI);
    b.ring(3.6, 16.4, 1.2, .45, .5, m.silicone, x, layout.board.bottomY + 8.8, layout.z.boardTop + 1.6, 0, HALF_PI);
    // Acoustic vent membranes behind the microphone ports.
    for (const s of [-1, 1]) b.add(new THREE.CylinderGeometry(1.1, 1.1, .12, 16), m.ceramicWhite, s * 9, -H / 2 + 2.26, 0);
  },

  'adhesive-ring'(b, part, { lib: { m }, layout }) {
    const { width: W, height: H, cornerRadius } = layout.design;
    b.ring(W - 1.4, H - 1.4, Math.max(1, cornerRadius! - .7), 1.5, Math.max(.06, part.box.d), m.adhesive, 0, 0, part.box.z);
  },
};

/** Small repeated parts drawn with instancing. */
const INSTANCED: Record<string, (b: PartBuilder, size: [number, number, number], m: MaterialLibrary['m']) => void> = {
  mlcc(b, [w, h, d], m) { b.box(w * .56, h, d, m.ceramicTan); for (const s of [-1, 1]) b.box(w * .24, h * 1.04, d * 1.04, m.nickel, s * w * .38); },
  resistor(b, [w, h, d], m) { b.box(w * .6, h, d * .7, m.ceramicWhite, 0, 0, -d * .15); b.box(w * .56, h * .9, d * .3, m.mold, 0, 0, d * .35); for (const s of [-1, 1]) b.box(w * .22, h * 1.04, d, m.nickel, s * w * .39); },
  inductor(b, [w, h, d], m) { b.slab(w, h, d, .3, m.plasticGrey, 0, 0, 0, .1); b.slab(w * .6, h * .6, .04, .2, m.ferrite, 0, 0, d / 2, .01); for (const s of [-1, 1]) b.box(w * .16, h * .7, d * .5, m.nickel, s * w * .46, 0, -d * .25); },
  b2b(b, [w, h, d], m) { b.box(w, h, d * .8, m.plastic, 0, 0, -d * .1); for (const s of [-1, 1]) b.box(w * .88, .26, d, m.gold, 0, s * h * .32); b.box(w * .7, h * .22, d * .9, m.plasticGrey); },
  bracket(b, [w, h, d], m) { const s = roundedRect(w, h, 1); for (const x of [-1, 1]) { const c = new THREE.Path(); c.absarc(x * 5, 0, .8, 0, Math.PI * 2, true); s.holes.push(c); } const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false, curveSegments: 6 }); g.translate(0, 0, -d / 2); b.add(g, m.steelBrushed); },
  screw(b, [w, , d], m) { b.cyl(w / 2, d * .32, m.steel, 0, 0, d * .34, 16, w * .42); b.cyl(w * .27, d * .7, m.steel, 0, 0, -d * .15, 10); b.box(w * .62, w * .13, .1, m.adhesive, 0, 0, d * .5); b.box(w * .13, w * .62, .1, m.adhesive, 0, 0, d * .5); },
};

/** Builders whose geometry comes from the exterior device model rather than this file. */
export const EXTERIOR_BUILDERS = new Set(['frame', 'exterior-rear', 'exterior-camera', 'exterior-buttons']);

export function buildPartObject(part: PlacedPart, ctx: MeshContext): THREE.Group {
  const name = part.component.asset.builder, { x, y, z } = part.box;
  const absolute = name === 'pcb' || name === 'coax' || name === 'aip' || name === 'seal-ring' || name === 'adhesive-ring';
  const b = new PartBuilder(absolute ? 0 : x, absolute ? 0 : y, absolute ? 0 : z);
  if (INSTANCED[name] && part.instances) {
    const size = (part.detail?.size as [number, number, number] | undefined) ?? part.component.dimensions;
    const spots = part.instances.map(([ix, iy, third]): [number, number, number, number] => name === 'screw' ? [ix, iy, third, 0] : [ix, iy, part.box.z, third ? HALF_PI : 0]);
    b.instanced(one => INSTANCED[name](one, size, ctx.lib.m), spots);
  } else if (!EXTERIOR_BUILDERS.has(name)) (BUILDERS[name] ?? BUILDERS.block)(b, part, ctx);
  const group = b.build(part.slot.id);
  group.userData.slot = part.slot.id;
  return group;
}

/** Releases geometries built for a part. Materials are shared and owned by the library. */
export function disposePartObject(group: THREE.Object3D) {
  group.traverse(node => { const mesh = node as THREE.Mesh; if (mesh.geometry && !mesh.userData.exterior) mesh.geometry.dispose(); if ((node as THREE.InstancedMesh).isInstancedMesh) (node as THREE.InstancedMesh).dispose(); });
}
