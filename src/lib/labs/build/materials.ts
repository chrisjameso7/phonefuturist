/**
 * Build a Phone — shared PBR material library.
 *
 * One instance of each material is reused by every part, so a full build
 * draws with a few dozen materials. Textures are generated procedurally as
 * DataTextures: no image downloads, and they work in headless tests.
 */
import * as THREE from 'three';

export type Quality = 'high' | 'balanced' | 'mobile';

function rng(seed: number) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

function texture(size: number, paint: (set: (x: number, y: number, r: number, g: number, b: number) => void, rect: (x: number, y: number, w: number, h: number, r: number, g: number, b: number) => void, random: () => number) => void, seed: number, colour = true) {
  const data = new Uint8Array(size * size * 4), random = rng(seed);
  const set = (x: number, y: number, r: number, g: number, b: number) => { x = ((x % size) + size) % size | 0; y = ((y % size) + size) % size | 0; const i = (y * size + x) * 4; data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = 255; };
  const rect = (x: number, y: number, w: number, h: number, r: number, g: number, b: number) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) set(x + i, y + j, r, g, b); };
  paint(set, rect, random);
  const map = new THREE.DataTexture(data, size, size);
  map.wrapS = map.wrapT = THREE.RepeatWrapping; map.magFilter = THREE.LinearFilter; map.minFilter = THREE.LinearMipmapLinearFilter; map.generateMipmaps = true;
  if (colour) map.colorSpace = THREE.SRGBColorSpace;
  map.needsUpdate = true; return map;
}

/** Solder mask with routed traces, vias and exposed pads. */
function boardTexture(base: [number, number, number], seed: number) {
  return texture(256, (set, rect, random) => {
    rect(0, 0, 256, 256, ...base);
    const trace: [number, number, number] = [base[0] + 16, base[1] + 26, base[2] + 18];
    for (let n = 0; n < 150; n++) {
      let x = random() * 256 | 0, y = random() * 256 | 0, horizontal = random() > .5;
      for (let leg = 0; leg < 4; leg++) {
        const length = 8 + random() * 46 | 0;
        for (let i = 0; i < length; i++) { set(x, y, ...trace); if (horizontal) x++; else y++; }
        if (random() > .6) for (let i = 0; i < 5; i++) { set(x, y, ...trace); x++; y++; }
        horizontal = !horizontal;
      }
      rect(x - 1, y - 1, 3, 3, 196, 164, 92); set(x, y, 30, 26, 18);
    }
    for (let n = 0; n < 34; n++) { const x = random() * 250 | 0, y = random() * 250 | 0, w = 2 + random() * 3 | 0; rect(x, y, w, w, 204, 172, 96); }
  }, seed);
}
/** Laser marking on a moulded package: text rows, a logo block and a pin-1 dot. */
function markingTexture(seed: number) {
  return texture(128, (set, rect, random) => {
    rect(0, 0, 128, 128, 30, 31, 34);
    for (let i = 0; i < 2400; i++) { const v = 26 + random() * 10; set(random() * 128 | 0, random() * 128 | 0, v, v, v + 1); }
    for (let row = 0; row < 4; row++) { let x = 22; const y = 38 + row * 15; while (x < 100) { const w = 3 + random() * 7 | 0; if (random() > .16) rect(x, y, w, 6, 104, 106, 110); x += w + 2; } }
    rect(22, 18, 26, 9, 112, 114, 118);
    for (let a = 0; a < 40; a++) for (let r = 0; r < 4; r++) set(108 + Math.cos(a) * r, 108 + Math.sin(a) * r, 150, 152, 156);
  }, seed);
}
/** Cell wrap label: fine print rows, a rating block, compliance marks and a data-matrix code. */
function labelTexture() {
  const S = 512;
  return texture(S, (set, rect, random) => {
    rect(0, 0, S, S, 26, 27, 31);
    for (let i = 0; i < 9000; i++) { const v = 24 + random() * 8; set(random() * S | 0, random() * S | 0, v, v, v + 2); }
    rect(40, 440, 432, 2, 82, 84, 90); rect(40, 70, 432, 2, 82, 84, 90);
    rect(56, 396, 120, 18, 138, 140, 146); rect(190, 400, 60, 8, 98, 100, 106);
    for (let row = 0; row < 16; row++) { let x = 56; const y = 372 - row * 11; while (x < 330) { const w = 4 + random() * 16 | 0; if (random() > .18) rect(x, y, w, 3, 96, 98, 104); x += w + 4; } }
    for (let i = 0; i < 6; i++) { rect(56 + i * 34, 100, 22, 22, 104, 106, 112); rect(58 + i * 34, 102, 18, 18, 26, 27, 31); rect(63 + i * 34, 107, 8, 8, 104, 106, 112); }
    rect(384, 300, 72, 72, 150, 152, 158); for (let i = 0; i < 220; i++) rect(388 + (random() * 16 | 0) * 4, 304 + (random() * 16 | 0) * 4, 4, 4, 26, 27, 31);
    for (let i = 0; i < 26; i++) rect(360 + i * 4, 150, 1 + (random() * 3 | 0), 44, 120, 122, 128);
  }, 71);
}
/** Normal map of a regular dimple or perforation pattern. */
function dimpleNormal(pitch: number, radius: number) {
  const size = 64;
  return texture(size, set => {
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const dx = (x % pitch) - pitch / 2, dy = (y % pitch) - pitch / 2, r = Math.hypot(dx, dy);
      const slope = r < radius && r > radius * .35 ? .55 : 0;
      set(x, y, 128 + (r ? dx / r : 0) * slope * 127, 128 + (r ? dy / r : 0) * slope * 127, 255);
    }
  }, 1, false);
}
function brushedNormal() {
  return texture(64, (set, _rect, random) => { for (let x = 0; x < 64; x++) { const v = 128 + (random() - .5) * 26; for (let y = 0; y < 64; y++) set(x, y, v, 128, 255); } }, 9, false);
}
function flexTexture() {
  return texture(64, (_set, rect) => { rect(0, 0, 64, 64, 172, 104, 34); for (let i = 0; i < 9; i++) rect(5 + i * 6, 0, 3, 64, 196, 128, 52); }, 3);
}
function meshTexture() {
  return texture(32, (set, rect) => { rect(0, 0, 32, 32, 92, 96, 102); for (let y = 0; y < 32; y += 4) for (let x = 0; x < 32; x += 4) { set(x + 1, y + 1, 14, 15, 17); set(x + 2, y + 1, 14, 15, 17); set(x + 1, y + 2, 14, 15, 17); set(x + 2, y + 2, 14, 15, 17); } }, 5);
}

export type MaterialLibrary = ReturnType<typeof createMaterialLibrary>;

export function createMaterialLibrary(quality: Quality = 'high') {
  const textures = {
    boardGreen: boardTexture([18, 62, 44], 11), boardBlack: boardTexture([20, 24, 30], 17), marking: markingTexture(23), label: labelTexture(),
    dimple: dimpleNormal(8, 2.6), perforation: dimpleNormal(6, 1.5), brushed: brushedNormal(), flex: flexTexture(), mesh: meshTexture(),
  };
  textures.boardGreen.repeat.set(1, 1); textures.dimple.repeat.set(6, 12); textures.perforation.repeat.set(5, 5); textures.brushed.repeat.set(3, 6); textures.mesh.repeat.set(6, 3);
  const std = (p: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial(p);
  const phys = (p: THREE.MeshPhysicalMaterialParameters) => new THREE.MeshPhysicalMaterial(p);
  const glassy = quality === 'high';
  const m = {
    board: std({ map: textures.boardGreen, roughness: .5, metalness: .15 }),
    boardDark: std({ map: textures.boardBlack, roughness: .45, metalness: .2 }),
    substrate: std({ color: '#2f5a43', roughness: .7 }),
    interposer: std({ color: '#b39a6c', roughness: .65 }),
    mold: std({ color: '#1c1d20', roughness: .62 }),
    marking: std({ map: textures.marking, roughness: .58 }),
    die: std({ color: '#7e8794', roughness: .12, metalness: .95 }),
    gold: std({ color: '#d6ae52', roughness: .28, metalness: 1 }),
    copper: std({ color: '#c0703a', roughness: .34, metalness: 1 }),
    copperFoil: std({ color: '#a8734c', roughness: .5, metalness: .9, normalMap: textures.brushed, normalScale: new THREE.Vector2(.12, .12) }),
    copperSheet: std({ color: '#c47c48', roughness: .42, metalness: 1, normalMap: textures.dimple, normalScale: new THREE.Vector2(.5, .5) }),
    tin: std({ color: '#c2c5c9', roughness: .36, metalness: 1, normalMap: textures.perforation, normalScale: new THREE.Vector2(.35, .35) }),
    steel: std({ color: '#a4a9af', roughness: .26, metalness: 1 }),
    steelBrushed: std({ color: '#9ea3a9', roughness: .34, metalness: 1, normalMap: textures.brushed, normalScale: new THREE.Vector2(.25, .25) }),
    aluminium: std({ color: '#aeb3b9', roughness: .46, metalness: 1 }),
    nickel: std({ color: '#d0d2d4', roughness: .3, metalness: 1 }),
    plastic: std({ color: '#121316', roughness: .55 }),
    plasticGrey: std({ color: '#3b3d42', roughness: .7 }),
    ceramicWhite: std({ color: '#e6e2d8', roughness: .5 }),
    ceramicTan: std({ color: '#b99a66', roughness: .55 }),
    ferrite: std({ color: '#2a2a2d', roughness: .88 }),
    pouch: std({ color: '#2a2c31', roughness: .42, metalness: .55 }),
    label: std({ map: textures.label, roughness: .5, metalness: .1 }),
    foil: std({ color: '#b9bdc3', roughness: .3, metalness: 1 }),
    kapton: phys({ color: '#c98a2c', roughness: .35, transparent: true, opacity: .9, clearcoat: .6 }),
    flex: std({ map: textures.flex, roughness: .45, metalness: .25 }),
    graphite: std({ color: '#26272b', roughness: .46, metalness: .45 }),
    adhesive: std({ color: '#0b0b0c', roughness: .95 }),
    foam: std({ color: '#33363b', roughness: 1 }),
    silicone: std({ color: '#2c4a63', roughness: .9 }),
    tim: std({ color: '#93a6b6', roughness: .95 }),
    mesh: std({ map: textures.mesh, roughness: .5, metalness: .8 }),
    coaxJacket: std({ color: '#d9dbde', roughness: .6 }),
    phosphor: std({ color: '#f0cf62', roughness: .5, emissive: '#5a4810', emissiveIntensity: .4 }),
    barrel: std({ color: '#0c0c0e', roughness: .32, metalness: .7 }),
    lens: phys(glassy
      ? { color: '#ffffff', roughness: 0, metalness: 0, transmission: 1, thickness: 1.4, ior: 1.6, iridescence: 1, iridescenceIOR: 1.9, iridescenceThicknessRange: [180, 420], envMapIntensity: 1.4, attenuationColor: '#7fa0c8', attenuationDistance: 6 }
      : { color: '#0b1524', roughness: .04, metalness: .2, clearcoat: 1, clearcoatRoughness: 0, iridescence: .8, iridescenceIOR: 1.9, envMapIntensity: 1.5 }),
    irFilter: phys({ color: '#3b6fb0', roughness: .05, metalness: .3, clearcoat: 1, transparent: true, opacity: .75 }),
    sensor: std({ color: '#2d3a2a', roughness: .1, metalness: .85 }),
    clearMold: phys({ color: '#1a1c22', roughness: .1, transparent: true, opacity: .8, clearcoat: 1 }),
    touchFilm: phys({ color: '#bfe3ee', roughness: .1, transparent: true, opacity: .22, clearcoat: 1 }),
    polarizer: phys({ color: '#30353d', roughness: .12, transparent: true, opacity: .6, clearcoat: 1 }),
    backplane: std({ color: '#4c5866', roughness: .25, metalness: .7 }),
    oledBack: std({ color: '#191b20', roughness: .3, metalness: .4 }),
    coverGlass: phys(glassy ? { color: '#ffffff', roughness: .02, transmission: 1, thickness: .6, ior: 1.5, transparent: true, opacity: 1, envMapIntensity: 1.2 } : { color: '#dfe9f1', roughness: .04, transparent: true, opacity: .12, clearcoat: 1 }),
    ghost: phys({ color: '#8fd3f0', roughness: .2, metalness: 0, transparent: true, opacity: .11, depthWrite: false, side: THREE.DoubleSide }),
    ghostFaint: phys({ color: '#8fa7b6', roughness: .4, metalness: 0, transparent: true, opacity: .035, depthWrite: false }),
    ghostFrame: phys({ color: '#b9dcec', roughness: .25, metalness: .3, transparent: true, opacity: .26, depthWrite: false, side: THREE.DoubleSide }),
  };
  return {
    quality, m, textures,
    dispose() { for (const material of Object.values(m)) material.dispose(); for (const map of Object.values(textures)) map.dispose(); },
  };
}
