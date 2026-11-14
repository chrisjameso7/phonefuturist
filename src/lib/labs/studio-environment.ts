import * as THREE from 'three';

/**
 * Procedural product-studio lighting for image-based reflections.
 *
 * A dark room with bright softboxes whose emission exceeds 1.0, so the
 * prefiltered environment carries high dynamic range: long, clean highlights
 * on polished metal and glass without downloading an HDR file.
 */
export function createStudioEnvironment() {
  const scene = new THREE.Scene(), disposables: Array<{ dispose(): void }> = [];
  const add = (geometry: THREE.BufferGeometry, material: THREE.Material, place: (m: THREE.Mesh) => void) => { const mesh = new THREE.Mesh(geometry, material); place(mesh); scene.add(mesh); disposables.push(geometry, material); };
  const light = (colour: string, strength: number) => new THREE.MeshBasicMaterial({ color: new THREE.Color(colour).multiplyScalar(strength), side: THREE.DoubleSide });
  add(new THREE.BoxGeometry(40, 30, 40), new THREE.MeshBasicMaterial({ color: '#15181e', side: THREE.BackSide }), () => {});
  add(new THREE.PlaneGeometry(40, 40), new THREE.MeshBasicMaterial({ color: '#2b2f37' }), m => { m.rotation.x = -Math.PI / 2; m.position.y = -14.9; });
  // Overhead key softbox, two tall side strips and a narrow rim strip behind the subject.
  add(new THREE.PlaneGeometry(18, 12), light('#fff7ee', 11), m => { m.rotation.x = Math.PI / 2; m.position.set(-3, 14.5, 3); });
  add(new THREE.PlaneGeometry(4, 22), light('#eaf3ff', 9), m => { m.rotation.y = Math.PI / 2; m.position.set(-19.5, 0, 4); });
  add(new THREE.PlaneGeometry(3, 20), light('#fff1e2', 6), m => { m.rotation.y = -Math.PI / 2; m.position.set(19.5, 1, -3); });
  add(new THREE.PlaneGeometry(14, 2.4), light('#dff1ff', 14), m => { m.position.set(4, 8, -19.5); });
  add(new THREE.PlaneGeometry(9, 7), light('#ffffff', 5), m => { m.rotation.y = Math.PI; m.position.set(-6, 3, 19.5); });
  add(new THREE.PlaneGeometry(2, 14), light('#cfe6ff', 7), m => { m.position.set(-15, -1, -19.5); });
  return { scene, dispose() { for (const item of disposables) item.dispose(); } };
}
