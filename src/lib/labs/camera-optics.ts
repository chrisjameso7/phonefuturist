import * as THREE from 'three';

/**
 * Rear camera hardware for the exterior model.
 *
 * Each lens is built the way phone camera windows are constructed: a machined
 * trim ring with a polished chamfer, a recessed sapphire cover glass, a dark
 * anodised well with stepped light baffles, a multi-coated front element and
 * an aperture stop. The island is cut through at every lens, so the optics are
 * seen inside an opening rather than painted on a surface.
 *
 * Generic construction, not a copy of any product's camera design.
 */
export type OpticsQuality = 'high' | 'balanced' | 'mobile';
type Add = (geometry: THREE.BufferGeometry, material: THREE.Material, name: string, x?: number, y?: number, z?: number) => THREE.Mesh;

function rounded(target: THREE.Path, w: number, h: number, r: number, x = 0, y = 0) {
  const a = w / 2, b = h / 2; r = Math.max(.05, Math.min(r, a, b));
  target.moveTo(x - a + r, y - b); target.lineTo(x + a - r, y - b); target.quadraticCurveTo(x + a, y - b, x + a, y - b + r);
  target.lineTo(x + a, y + b - r); target.quadraticCurveTo(x + a, y + b, x + a - r, y + b); target.lineTo(x - a + r, y + b);
  target.quadraticCurveTo(x - a, y + b, x - a, y + b - r); target.lineTo(x - a, y - b + r); target.quadraticCurveTo(x - a, y - b, x - a + r, y - b);
  return target;
}

/** Camera island with a machined chamfer and a through-opening for each lens. Total depth is exactly `depth`. */
export function islandGeometry(w: number, h: number, depth: number, radius: number, openings: Array<[number, number, number]>, chamfer = .3) {
  const b = Math.min(chamfer, depth * .3, w / 4, h / 4);
  const shape = rounded(new THREE.Shape(), w - 2 * b, h - 2 * b, Math.max(.2, radius - b)) as THREE.Shape;
  for (const [x, y, r] of openings) { const hole = new THREE.Path(); hole.absarc(x, y, r + b, 0, Math.PI * 2, true); shape.holes.push(hole); }
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: Math.max(.01, depth - 2 * b), bevelEnabled: b > 0, bevelSize: b, bevelThickness: b, bevelSegments: 1, curveSegments: 18 });
  geometry.translate(0, 0, -depth / 2 + b);
  return geometry;
}

/** Turned profile around z, from (radius, z) pairs. */
function turned(profile: Array<[number, number]>, segments = 48) {
  const g = new THREE.LatheGeometry(profile.map(([r, z]) => new THREE.Vector2(r, z)), segments);
  g.rotateX(Math.PI / 2);
  return g;
}

/** Concentric Fresnel grooves as a normal map, for flash diffusers. */
function fresnelNormal() {
  const size = 128, data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const dx = x - size / 2 + .5, dy = y - size / 2 + .5, r = Math.hypot(dx, dy), phase = (r % 7) / 7, slope = (phase - .5) * .9;
    const i = (y * size + x) * 4; data[i] = 128 + (r ? dx / r : 0) * slope * 127; data[i + 1] = 128 + (r ? dy / r : 0) * slope * 127; data[i + 2] = 255; data[i + 3] = 255;
  }
  const t = new THREE.DataTexture(data, size, size); t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.needsUpdate = true;
  return t;
}
/** Fine random micro-relief for bead-blasted and frosted surfaces. */
export function frostNormal(seed = 7) {
  const size = 128, data = new Uint8Array(size * size * 4);
  let s = seed; const rand = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  for (let i = 0; i < size * size; i++) { data[i * 4] = 128 + (rand() - .5) * 70; data[i * 4 + 1] = 128 + (rand() - .5) * 70; data[i * 4 + 2] = 255; data[i * 4 + 3] = 255; }
  const t = new THREE.DataTexture(data, size, size); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.needsUpdate = true;
  return t;
}

export function createOpticsMaterials(quality: OpticsQuality) {
  const fresnel = fresnelNormal();
  const sapphire = new THREE.MeshPhysicalMaterial({ color: '#ffffff', metalness: 0, roughness: 0, ior: 1.77, clearcoat: 1, clearcoatRoughness: 0, envMapIntensity: 2.2, specularIntensity: 1 });
  const m = {
    sapphire,
    // Black anodised interior: dark, slightly satin, so baffle steps catch a rim of light.
    well: new THREE.MeshStandardMaterial({ color: '#0b0c0f', roughness: .55, metalness: .45, side: THREE.BackSide }),
    baffle: new THREE.MeshStandardMaterial({ color: '#111216', roughness: .42, metalness: .6 }),
    floor: new THREE.MeshStandardMaterial({ color: '#020203', roughness: .9, metalness: 0 }),
    coating: new THREE.MeshPhysicalMaterial({ color: '#030408', roughness: .03, metalness: .1, clearcoat: 1, clearcoatRoughness: 0, iridescence: .8, iridescenceIOR: 1.7, iridescenceThicknessRange: [380, 560], envMapIntensity: 1.6 }),
    element: new THREE.MeshPhysicalMaterial({ color: '#05070c', roughness: .04, metalness: .1, clearcoat: 1, iridescence: .5, iridescenceIOR: 1.6, iridescenceThicknessRange: [420, 620], envMapIntensity: 1.1 }),
    iris: new THREE.MeshStandardMaterial({ color: '#16171b', roughness: .35, metalness: .8 }),
    // Seen through the stack a sensor reads as near-black with a faint cold sheen, not as a coloured plate.
    sensor: new THREE.MeshStandardMaterial({ color: '#07090c', roughness: .3, metalness: .5, envMapIntensity: .4 }),
    diffuser: new THREE.MeshPhysicalMaterial({ color: '#f3f0e6', roughness: .35, metalness: 0, transmission: 0, normalMap: fresnel, normalScale: new THREE.Vector2(.8, .8), clearcoat: 1, clearcoatRoughness: .05 }),
    ledCool: new THREE.MeshStandardMaterial({ color: '#f6f4d8', roughness: .4, emissive: '#2a2a20', emissiveIntensity: .4 }),
    ledWarm: new THREE.MeshStandardMaterial({ color: '#f2b45a', roughness: .4, emissive: '#3a2208', emissiveIntensity: .4 }),
    hole: new THREE.MeshStandardMaterial({ color: '#030304', roughness: 1 }),
  };
  function setQuality(q: OpticsQuality) {
    // Transmission renders a refraction pass; desktops get true glass, phones a reflective clear coat.
    if (q === 'mobile') sapphire.setValues({ transmission: 0, transparent: true, opacity: .2, thickness: 0 });
    else sapphire.setValues({ transmission: 1, transparent: false, opacity: 1, thickness: .3 });
    sapphire.needsUpdate = true;
  }
  setQuality(quality);
  return { m, setQuality, dispose() { for (const material of Object.values(m)) material.dispose(); fresnel.dispose(); } };
}
export type OpticsMaterials = ReturnType<typeof createOpticsMaterials>['m'];

/**
 * One lens window. `base` is the surface the trim ring sits on, `ringHeight` how far it stands proud,
 * and `floor` the deepest z the optics may use (the top of the solid body beneath).
 */
export function addLens(add: Add, m: OpticsMaterials, trim: THREE.Material, x: number, y: number, base: number, ringHeight: number, R: number, floor: number) {
  const top = base + ringHeight, inner = R * .8, chamfer = Math.min(.22, ringHeight * .4, R * .08);
  // Machined trim ring: outer wall, polished chamfer, then a narrow land around the glass.
  const ringGeometry = turned([[inner, -ringHeight / 2], [R, -ringHeight / 2], [R, ringHeight / 2 - chamfer], [R - chamfer, ringHeight / 2], [inner + .18, ringHeight / 2], [inner, ringHeight / 2 - .12]]);
  add(ringGeometry, trim, 'lens-ring', x, y, base + ringHeight / 2);
  const depth = Math.max(.4, top - floor - .02);
  // Anodised well, open at the top, seen through the sapphire.
  const well = new THREE.CylinderGeometry(inner, inner * .94, depth, 48, 1, true); well.rotateX(Math.PI / 2);
  add(well, m.well, 'lens-well', x, y, top - .12 - depth / 2);
  // Stepped light baffles narrowing toward the sensor.
  for (let i = 0; i < 3; i++) {
    const z = top - .12 - depth * (.3 + i * .22), outer = inner * (.95 - i * .06), hole = inner * (.78 - i * .12);
    add(new THREE.RingGeometry(hole, outer, 48), m.baffle, 'lens-baffle', x, y, z);
  }
  // Aperture stop: a seven-blade iris around a dark opening.
  const zStop = top - .12 - depth * .62, stop = inner * .42, blades = new THREE.Shape();
  blades.absarc(0, 0, inner * .7, 0, Math.PI * 2, false);
  const opening = new THREE.Path(); for (let i = 0; i <= 7; i++) { const a = i / 7 * Math.PI * 2 + .2; if (i === 0) opening.moveTo(Math.cos(a) * stop, Math.sin(a) * stop); else opening.lineTo(Math.cos(a) * stop, Math.sin(a) * stop); }
  blades.holes.push(opening);
  const iris = add(new THREE.ShapeGeometry(blades, 32), m.iris, 'lens-aperture', x, y, zStop); iris.scale.z = 1;
  add(new THREE.CircleGeometry(inner * .9, 40), m.floor, 'lens-floor', x, y, floor + .01);
  add(new THREE.PlaneGeometry(stop * 1.1, stop * .82), m.sensor, 'lens-sensor', x, y, floor + .02);
  // Rear element below the stop, multi-coated front element just under the cover glass.
  const rear = new THREE.SphereGeometry(inner * .5, 32, 10, 0, Math.PI * 2, 0, .55); rear.scale(1, .35, 1); rear.rotateX(Math.PI / 2);
  add(rear, m.element, 'lens-element', x, y, zStop - depth * .12);
  const front = new THREE.SphereGeometry(inner * .82, 40, 12, 0, Math.PI * 2, 0, .62); front.scale(1, .28, 1); front.translate(0, -inner * .82 * .28 * Math.cos(.62), 0); front.rotateX(Math.PI / 2);
  add(front, m.coating, 'lens-element', x, y, top - .34);
  // Recessed sapphire cover, flush just below the trim ring.
  const cover = new THREE.CylinderGeometry(inner + .1, inner + .1, .14, 56); cover.rotateX(Math.PI / 2);
  add(cover, m.sapphire, 'camera-lens', x, y, top - .1);
}

/** LED flash: recessed metal bezel, Fresnel diffuser over a cool and a warm emitter. */
export function addFlash(add: Add, m: OpticsMaterials, trim: THREE.Material, x: number, y: number, base: number, size = 2.1) {
  add(turned([[size * .78, -.18], [size, -.18], [size, .12], [size - .12, .2], [size * .82, .2]], 32), trim, 'flash', x, y, base + .18);
  add(new THREE.CircleGeometry(size * .8, 32), m.hole, 'flash-cavity', x, y, base + .04);
  add(new THREE.PlaneGeometry(size * .45, size * .45), m.ledCool, 'flash-led', x - size * .25, y, base + .06);
  add(new THREE.PlaneGeometry(size * .45, size * .45), m.ledWarm, 'flash-led', x + size * .25, y, base + .06);
  const lens = new THREE.CylinderGeometry(size * .8, size * .8, .1, 40); lens.rotateX(Math.PI / 2);
  add(lens, m.diffuser, 'flash-lens', x, y, base + .2);
}

/** Microphone or sensor pinhole: a dark bore with a fine chamfered edge. */
export function addPinhole(add: Add, m: OpticsMaterials, trim: THREE.Material, x: number, y: number, base: number, r = .45) {
  add(turned([[r, -.1], [r + .12, .02], [r + .22, .02]], 20), trim, 'camera-mic', x, y, base);
  add(new THREE.CircleGeometry(r, 20), m.hole, 'camera-mic', x, y, base - .08);
}
