import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createStudioEnvironment } from './studio-environment';
import { createHardwareModel } from './hardware-mesh';
import { normalizeDesign, type DeviceDesign } from './device-design';
import type { Assembly } from './build/assembly';
import type { BuildModel } from './build/build-model';
import type { BuildView } from './build/view-types';
import type { Quality } from './build/materials';

export type { Quality };
const QUALITY = {
  high: { pixelRatio: 2, shadow: 2048, shadowType: THREE.PCFSoftShadowMap },
  balanced: { pixelRatio: 1.5, shadow: 1024, shadowType: THREE.PCFShadowMap },
  mobile: { pixelRatio: 1.5, shadow: 1024, shadowType: THREE.PCFShadowMap },
} as const;
const ORDER: Quality[] = ['high', 'balanced', 'mobile'];

/** Picks a starting quality tier from device hints; the frame monitor can lower it later. */
export function detectQuality(env: { coarsePointer: boolean; shortSide: number; deviceMemory?: number; cores?: number }): Quality {
  if (env.coarsePointer && env.shortSide < 820) return 'mobile';
  if ((env.deviceMemory !== undefined && env.deviceMemory <= 4) || (env.cores !== undefined && env.cores <= 4)) return 'balanced';
  return 'high';
}

export function createDeviceScene(host: HTMLElement, initial: DeviceDesign, onLost: () => void) {
  let quality = detectQuality({ coarsePointer: window.matchMedia('(pointer: coarse)').matches, shortSide: Math.min(window.screen?.width ?? 1200, window.screen?.height ?? 1200), deviceMemory: (navigator as Navigator & { deviceMemory?: number }).deviceMemory, cores: navigator.hardwareConcurrency });
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: quality === 'high' ? 'high-performance' : 'low-power' });
  renderer.shadowMap.enabled = true;
  // Khronos PBR Neutral keeps product colours and metals true instead of ACES's warm, desaturated look.
  renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1;
  const canvas = renderer.domElement; canvas.setAttribute('aria-hidden', 'true');
  host.append(canvas);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 1, 6000);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = !reducedMotion; controls.dampingFactor = .12; controls.enablePan = false;
  controls.minPolarAngle = Math.PI * .23; controls.maxPolarAngle = Math.PI * .77;
  controls.minDistance = 180; controls.maxDistance = 650; controls.enableZoom = false;
  controls.enabled = false;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const studio = createStudioEnvironment(), environment = pmrem.fromScene(studio.scene, .03);
  scene.environment = environment.texture; scene.environmentIntensity = .9; studio.dispose(); pmrem.dispose();
  scene.add(new THREE.HemisphereLight('#d7edff', '#101827', .7));
  const key = new THREE.DirectionalLight('#ffffff', 2.6); key.position.set(-110, 170, 220);
  key.castShadow = true;
  Object.assign(key.shadow.camera, { left: -150, right: 150, top: 200, bottom: -200, far: 650 });
  key.shadow.bias = -.0006; key.shadow.normalBias = .5; key.shadow.radius = 3; scene.add(key);
  const rim = new THREE.DirectionalLight('#80ddff', 2.2); rim.position.set(130, 50, -160); scene.add(rim);
  const model = createHardwareModel(initial, { quality }); scene.add(model.group);
  const floorGeometry = new THREE.PlaneGeometry(1000, 1000);
  const floorMaterial = new THREE.ShadowMaterial({ opacity: .22 });
  const floor = new THREE.Mesh(floorGeometry, floorMaterial); floor.rotation.x = -Math.PI / 2;
  floor.position.y = -normalizeDesign(initial).height / 2 - 2; floor.receiveShadow = true; scene.add(floor);
  function applyQuality() {
    const q = QUALITY[quality];
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, q.pixelRatio));
    renderer.shadowMap.type = q.shadowType; key.shadow.mapSize.set(q.shadow, q.shadow);
    key.shadow.map?.dispose(); key.shadow.map = null; renderer.shadowMap.needsUpdate = true;
    host.dataset.quality = quality;
  }
  applyQuality();
  let kind=initial.kind;
  let disposed = false, inView = true, frames = 2, view: 'front' | 'back' | 'side' = initial.kind && initial.kind !== 'phone' ? 'front' : 'back';
  const wake = () => { frames = Math.max(frames, 90); };
  controls.addEventListener('change', wake);

  // Build a Phone: loaded on demand, shown in place of the plain exterior model.
  let build: BuildModel | null = null, buildLoading: Promise<void> | null = null, pendingAssembly: Assembly | null = null, pendingView: Partial<BuildView> | null = null;
  let onSelect: ((slot: string | null) => void) | null = null, interactive = false;
  const box = new THREE.Box3(), size = new THREE.Vector3(), centre = new THREE.Vector3();
  // Smooth camera framing: the loop eases toward these goals.
  const goalTarget = new THREE.Vector3(); let goalDistance = 0, easing = false, goalDirection: THREE.Vector3 | null = null, lastMode = 'assembled';
  controls.addEventListener('start', () => { goalDirection = null; });
  function measure() { if (build && pendingAssembly) build.bounds(box); else box.setFromObject(model.group); if (box.isEmpty()) box.setFromObject(model.group); return box; }
  function distanceFor(bounds: THREE.Vector3, margin = 1.25) {
    const vertical = THREE.MathUtils.degToRad(camera.fov), horizontal = 2 * Math.atan(Math.tan(vertical / 2) * camera.aspect);
    return Math.max(bounds.y / (2 * Math.tan(vertical / 2)), bounds.x / (2 * Math.tan(horizontal / 2))) * margin + bounds.z * .5;
  }
  function fit(reset = false, size2?:{width:number;height:number}, animate = false) {
    const width = size2?.width??Math.max(1, host.clientWidth), height = size2?.height??Math.max(1, host.clientHeight);
    renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix();
    const bounds = measure().getSize(size); box.getCenter(centre);
    const offset=camera.position.clone().sub(controls.target);
    floor.position.y=box.min.y-2;
    const extent=Math.max(bounds.x,bounds.y,bounds.z,100);
    key.position.copy(centre).add(new THREE.Vector3(-extent*.8,extent,extent*1.2)); key.target.position.copy(centre); key.target.updateMatrixWorld();
    Object.assign(key.shadow.camera,{left:-extent,right:extent,top:extent,bottom:-extent,far:extent*6});key.shadow.camera.updateProjectionMatrix();
    const distance = distanceFor(bounds);
    controls.minDistance = Math.min(60, distance * .25); controls.maxDistance = Math.max(650, distance * 1.8);
    if (animate && !reducedMotion && !reset) { goalTarget.copy(centre); goalDistance = distance; easing = true; wake(); return; }
    easing = false; controls.target.copy(centre);
    if (reset) camera.position.set(view==='side'?1:.4, view==='side'?.12:.3, view==='side'?.12:(view === 'back' ? 1 : -1)*(kind==='laptop'?-1:1)).normalize().multiplyScalar(distance).add(centre);
    else camera.position.copy(offset.normalize().multiplyScalar(distance).add(centre));
    controls.update(); wake();
  }
  const resize = new ResizeObserver(() => fit()); resize.observe(host);
  const intersection = new IntersectionObserver(entries => { inView = entries[0]?.isIntersecting ?? true; wake(); });
  intersection.observe(host);
  const visibility = () => wake(); document.addEventListener('visibilitychange', visibility);
  const lost = (event: Event) => { event.preventDefault(); onLost(); };
  canvas.addEventListener('webglcontextlost', lost);

  // Tap or click to select a part. A drag orbits instead.
  const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2(); let down: { x: number; y: number; t: number } | null = null;
  const pointerDown = (event: PointerEvent) => { down = { x: event.clientX, y: event.clientY, t: performance.now() }; };
  const pointerUp = (event: PointerEvent) => {
    const start = down; down = null;
    if (!start || !build || !pendingAssembly || !onSelect) return;
    if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 6 || performance.now() - start.t > 600) return;
    const rect = canvas.getBoundingClientRect();
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    onSelect(build.pick(raycaster));
  };
  canvas.addEventListener('pointerdown', pointerDown); canvas.addEventListener('pointerup', pointerUp);

  // Frame-time monitor: steps the quality tier down when rendering is persistently slow.
  let frameMs = 0, slowFrames = 0, last = performance.now(), downgraded = false;
  function monitor(ms: number) {
    frameMs = frameMs ? frameMs * .9 + ms * .1 : ms;
    slowFrames = ms > 34 ? slowFrames + 1 : Math.max(0, slowFrames - 2);
    if (slowFrames > 36 && quality !== 'mobile') { quality = ORDER[ORDER.indexOf(quality) + 1]; downgraded = true; slowFrames = 0; frameMs = 0; applyQuality(); model.setQuality(quality); build?.setQuality(quality); wake(); }
  }
  renderer.setAnimationLoop(() => {
    const now = performance.now(), seconds = Math.min(.1, (now - last) / 1000); last = now;
    if (disposed || !inView || document.hidden) return;
    const moving = build && pendingAssembly ? build.tick(seconds) : false;
    if (moving) wake();
    if (frames <= 0) return;
    frames--;
    if (easing) {
      const blend = 1 - Math.exp(-seconds * 6), offset = camera.position.clone().sub(controls.target), length = offset.length();
      controls.target.lerp(goalTarget, blend);
      offset.divideScalar(length);
      if (goalDirection) { offset.lerp(goalDirection, blend).normalize(); if (offset.angleTo(goalDirection) < .01) goalDirection = null; }
      camera.position.copy(controls.target).add(offset.multiplyScalar(length + (goalDistance - length) * blend));
      if (!goalDirection && controls.target.distanceTo(goalTarget) < .2 && Math.abs(length - goalDistance) < .5) easing = false; else wake();
    }
    controls.update();
    const start = performance.now(); renderer.render(scene, camera);
    if (seconds < .08) monitor(Math.max(performance.now() - start, seconds * 1000));
  });
  fit(true);

  function showBuild() {
    const active = !!(build && pendingAssembly && (kind ?? 'phone') === 'phone');
    if (build) build.group.visible = active;
    model.group.visible = !active;
  }
  return {
    update(config: DeviceDesign) { const changed=kind!==config.kind;kind=config.kind;if(changed)view=kind==='phone'?'back':'front';model.update(config);floor.position.y=-normalizeDesign(config).height/2-2;showBuild();fit(changed); },
    capture() {
      const position=camera.position.clone(),target=controls.target.clone(),oldView=view,pixelRatio=renderer.getPixelRatio();
      const wasEasing = easing; easing = false;
      renderer.setPixelRatio(2);
      try{return (['front','back'] as const).map(side=>{view=side;fit(true,{width:720,height:760});renderer.render(scene,camera);return canvas.toDataURL('image/png');});}
      finally{renderer.setPixelRatio(pixelRatio);renderer.setSize(Math.max(1,host.clientWidth),Math.max(1,host.clientHeight),false);view=oldView;camera.aspect=Math.max(1,host.clientWidth)/Math.max(1,host.clientHeight);camera.updateProjectionMatrix();camera.position.copy(position);controls.target.copy(target);controls.update();renderer.render(scene,camera);easing=wasEasing;wake();}
    },
    view(side: 'front' | 'back' | 'side') { view = side; fit(true); },
    interact(enabled: boolean) { interactive = enabled; controls.enabled = enabled; controls.enableZoom = enabled; canvas.style.touchAction = enabled ? 'none' : 'pan-y'; wake(); },
    /** Shows a resolved build in place of the exterior model, or returns to the exterior when null. */
    async setBuild(assembly: Assembly | null) {
      pendingAssembly = assembly;
      if (!assembly) { showBuild(); fit(false, undefined, true); return; }
      if (!build) {
        buildLoading ??= import('./build/build-model').then(({ createBuildModel }) => {
          if (disposed) return;
          build = createBuildModel(quality); build.setReducedMotion(reducedMotion); scene.add(build.group);
        });
        await buildLoading;
      }
      if (disposed || !build || pendingAssembly !== assembly) return;
      build.update(assembly);
      if (pendingView) { build.setView(pendingView); pendingView = null; }
      showBuild(); fit(false, undefined, true);
    },
    setBuildView(next: Partial<BuildView>, frame = true) {
      if (!build) { pendingView = { ...pendingView, ...next }; return; }
      build.setView(next);
      // Entering the exploded view turns the camera side-on so the layers fan out instead of hiding behind the rear cover.
      if (next.mode && next.mode !== lastMode) { if (next.mode === 'exploded' && !reducedMotion) goalDirection = new THREE.Vector3(.84, .2, .5).normalize(); lastMode = next.mode; }
      if (frame) fit(false, undefined, true); else wake();
    },
    /** Frames one part, or the whole build when `slot` is null. */
    focus(slot: string | null) {
      if (!build) return;
      const target = slot ? build.partBounds(slot, box) : null;
      if (!target) { fit(false, undefined, true); return; }
      target.getSize(size); target.getCenter(goalTarget);
      goalDistance = Math.max(distanceFor(size, 2.4), 70); controls.minDistance = Math.min(controls.minDistance, goalDistance * .6);
      if (reducedMotion) { const offset = camera.position.clone().sub(controls.target).setLength(goalDistance); controls.target.copy(goalTarget); camera.position.copy(goalTarget).add(offset); controls.update(); easing = false; } else easing = true;
      wake();
    },
    onSelect(handler: ((slot: string | null) => void) | null) { onSelect = handler; },
    isAnimating: () => !!build?.isAnimating(),
    stats() { const info = renderer.info.render; return { quality, downgraded, interactive, frameMs: +frameMs.toFixed(1), calls: info.calls, triangles: info.triangles, pixelRatio: renderer.getPixelRatio(), model: build?.stats() ?? null }; },
    dispose() {
      if (disposed) return; disposed = true;
      renderer.setAnimationLoop(null); resize.disconnect(); intersection.disconnect();
      document.removeEventListener('visibilitychange', visibility); canvas.removeEventListener('webglcontextlost', lost);
      canvas.removeEventListener('pointerdown', pointerDown); canvas.removeEventListener('pointerup', pointerUp);
      controls.removeEventListener('change', wake); controls.dispose(); model.dispose(); build?.dispose();
      floorGeometry.dispose(); floorMaterial.dispose(); environment.dispose(); key.dispose();
      renderer.dispose(); renderer.forceContextLoss(); canvas.remove();
    },
  };
}
export type DeviceScene = ReturnType<typeof createDeviceScene>;
