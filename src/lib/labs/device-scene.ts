import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createHardwareModel } from './hardware-mesh';
import { normalizeDesign, type DeviceDesign } from './device-design';

export function createDeviceScene(host: HTMLElement, initial: DeviceDesign, onLost: () => void) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1;
  const canvas = renderer.domElement; canvas.setAttribute('aria-hidden', 'true');
  host.append(canvas);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 1, 6000);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = !window.matchMedia('(prefers-reduced-motion: reduce)').matches; controls.dampingFactor = .12; controls.enablePan = false;
  controls.minPolarAngle = Math.PI * .23; controls.maxPolarAngle = Math.PI * .77;
  controls.minDistance = 180; controls.maxDistance = 650; controls.enableZoom = false;
  controls.enabled = false;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment(); const environment = pmrem.fromScene(room, .04);
  scene.environment = environment.texture; room.dispose(); pmrem.dispose();
  scene.add(new THREE.HemisphereLight('#d7edff', '#101827', 1.2));
  const key = new THREE.DirectionalLight('#ffffff', 3); key.position.set(-110, 170, 220);
  key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -150, right: 150, top: 200, bottom: -200, far: 650 });
  key.shadow.bias = -.001; key.shadow.normalBias = .4; scene.add(key);
  const rim = new THREE.DirectionalLight('#80ddff', 3); rim.position.set(130, 50, -160); scene.add(rim);
  const model = createHardwareModel(initial); scene.add(model.group);
  const floorGeometry = new THREE.PlaneGeometry(1000, 1000);
  const floorMaterial = new THREE.ShadowMaterial({ opacity: .2 });
  const floor = new THREE.Mesh(floorGeometry, floorMaterial); floor.rotation.x = -Math.PI / 2;
  floor.position.y = -normalizeDesign(initial).height / 2 - 2; floor.receiveShadow = true; scene.add(floor);
  let kind=initial.kind;
  let disposed = false, inView = true, frames = 2, view: 'front' | 'back' = initial.kind && initial.kind !== 'phone' ? 'front' : 'back';
  const wake = () => { frames = 90; };
  controls.addEventListener('change', wake);
  function fit(reset = false) {
    const width = Math.max(1, host.clientWidth), height = Math.max(1, host.clientHeight);
    renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix();
    const box = new THREE.Box3().setFromObject(model.group), bounds = box.getSize(new THREE.Vector3());
    const centre=box.getCenter(new THREE.Vector3()), offset=camera.position.clone().sub(controls.target);
    controls.target.copy(centre); floor.position.y=box.min.y-2;
    const extent=Math.max(bounds.x,bounds.y,bounds.z,100);
    key.position.copy(centre).add(new THREE.Vector3(-extent*.8,extent,extent*1.2));
    Object.assign(key.shadow.camera,{left:-extent,right:extent,top:extent,bottom:-extent,far:extent*6});key.shadow.camera.updateProjectionMatrix();
    const vertical = THREE.MathUtils.degToRad(camera.fov), horizontal = 2 * Math.atan(Math.tan(vertical / 2) * camera.aspect);
    const distance = Math.max(bounds.y / (2 * Math.tan(vertical / 2)), bounds.x / (2 * Math.tan(horizontal / 2))) * 1.25 + bounds.z*.5;
    controls.minDistance = Math.min(180, distance * .7); controls.maxDistance = Math.max(650, distance * 1.6);
    if (reset) camera.position.set(.4, .3, (view === 'back' ? 1 : -1)*(kind==='laptop'?-1:1)).normalize().multiplyScalar(distance).add(centre);
    else camera.position.copy(offset.normalize().multiplyScalar(distance).add(centre));
    controls.update(); wake();
  }
  const resize = new ResizeObserver(() => fit()); resize.observe(host);
  const intersection = new IntersectionObserver(entries => { inView = entries[0]?.isIntersecting ?? true; wake(); });
  intersection.observe(host);
  const visibility = () => wake(); document.addEventListener('visibilitychange', visibility);
  const lost = (event: Event) => { event.preventDefault(); onLost(); };
  canvas.addEventListener('webglcontextlost', lost);
  renderer.setAnimationLoop(() => {
    if (disposed || !inView || document.hidden || frames <= 0) return;
    frames--; controls.update(); renderer.render(scene, camera);
  });
  fit(true);
  return {
    update(config: DeviceDesign) { const changed=kind!==config.kind;kind=config.kind;if(changed)view=kind==='phone'?'back':'front';model.update(config);floor.position.y=-normalizeDesign(config).height/2-2;fit(changed); },
    view(side: 'front' | 'back') { view = side; fit(true); },
    interact(enabled: boolean) { controls.enabled = enabled; canvas.style.touchAction = enabled ? 'none' : 'pan-y'; wake(); },
    dispose() {
      if (disposed) return; disposed = true;
      renderer.setAnimationLoop(null); resize.disconnect(); intersection.disconnect();
      document.removeEventListener('visibilitychange', visibility); canvas.removeEventListener('webglcontextlost', lost);
      controls.removeEventListener('change', wake); controls.dispose(); model.dispose();
      floorGeometry.dispose(); floorMaterial.dispose(); environment.dispose(); key.dispose();
      renderer.dispose(); renderer.forceContextLoss(); canvas.remove();
    },
  };
}
export type DeviceScene = ReturnType<typeof createDeviceScene>;
