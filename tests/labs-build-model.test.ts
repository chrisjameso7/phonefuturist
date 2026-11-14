import { describe, expect, it } from 'vitest';
import { Box3, InstancedMesh, Mesh, Raycaster, Vector3 } from 'three';
import { defaultBuild, installPart, replaceComponent, resolveBuild, uninstallPart } from '../src/lib/labs/build/assembly';
import { ARCHITECTURES } from '../src/lib/labs/build/architectures';
import { createBuildModel } from '../src/lib/labs/build/build-model';
import { createMaterialLibrary } from '../src/lib/labs/build/materials';
import { buildPartObject, gridSolid } from '../src/lib/labs/build/part-mesh';
import { DEFAULT_DESIGN, DESIGN_FAMILIES, type DeviceDesign } from '../src/lib/labs/device-design';
import { createDeviceModel } from '../src/lib/labs/device-mesh';
import { detectQuality } from '../src/lib/labs/device-scene';

const studio: DeviceDesign = { ...DEFAULT_DESIGN, family: 'plateau', cameraWidth: 68, cameraHeight: 44, frameFinish: 'brushedTitanium', backFinish: 'glossyGlass', frontFinish: 'antiReflective' };
const settle = (model: ReturnType<typeof createBuildModel>) => { let frames = 0; while (model.tick(1 / 60) && frames < 3000) frames++; return frames; };

describe('Build a Phone part geometry', () => {
  it('builds real geometry for every part, positioned inside its solved box', () => {
    const lib = createMaterialLibrary('high');
    for (const arch of Object.keys(ARCHITECTURES)) {
      const assembly = resolveBuild(defaultBuild(studio, arch));
      for (const part of assembly.parts) {
        const object = buildPartObject(part, { lib, layout: assembly.layout });
        expect(object.userData.slot).toBe(part.slot.id);
        const exterior = ['frame', 'exterior-rear', 'exterior-camera', 'exterior-buttons'].includes(part.component.asset.builder) || (part.slot.id === 'cover-glass');
        if (exterior) continue;
        let vertices = 0;
        object.traverse(node => { const mesh = node as Mesh; if (mesh.isMesh) { vertices += mesh.geometry.attributes.position.count; expect(mesh.geometry.attributes.normal).toBeTruthy(); } });
        expect(vertices).toBeGreaterThan(11);
        if (part.instances) continue;
        const bounds = new Box3().setFromObject(object), centre = bounds.getCenter(new Vector3());
        expect(Number.isFinite(centre.x + centre.y + centre.z)).toBe(true);
        // Flex tails and connectors may reach past the body, never far from it.
        expect(Math.abs(centre.x - part.box.x)).toBeLessThan(part.box.w / 2 + 8); expect(Math.abs(centre.y - part.box.y)).toBeLessThan(part.box.h / 2 + 8); expect(Math.abs(centre.z - part.box.z)).toBeLessThan(part.box.d / 2 + 6);
      }
    }
    lib.dispose();
  });
  it('draws repeated components with instancing and shares materials', () => {
    const lib = createMaterialLibrary('mobile'), assembly = resolveBuild(defaultBuild(studio));
    const capacitors = buildPartObject(assembly.bySlot['passive-capacitors'], { lib, layout: assembly.layout });
    const instanced = capacitors.children.filter(c => (c as InstancedMesh).isInstancedMesh) as InstancedMesh[];
    expect(instanced.length).toBeGreaterThan(0);
    // Phones draw every other passive; desktops draw them all.
    expect(instanced[0].count).toBe(Math.ceil(assembly.bySlot['passive-capacitors'].instances!.length / 2));
    expect(instanced[0].count).toBeGreaterThan(15);
    const high = createMaterialLibrary('high'), full = buildPartObject(assembly.bySlot['passive-capacitors'], { lib: high, layout: assembly.layout }).children.find(c => (c as InstancedMesh).isInstancedMesh) as InstancedMesh;
    expect(full.count).toBe(assembly.bySlot['passive-capacitors'].instances!.length); high.dispose();
    const model = createBuildModel('mobile'); model.update(assembly);
    const used = new Set<unknown>(); model.group.traverse(node => { const mesh = node as Mesh; if (mesh.isMesh) used.add(mesh.material); });
    expect(used.size).toBeLessThan(60);
    const stats = model.stats();
    expect(stats.parts).toBe(assembly.parts.length); expect(stats.meshes).toBeLessThan(420); expect(stats.triangles).toBeLessThan(140000);
    model.dispose(); lib.dispose();
  });
  it('cuts the logic board exactly around the cameras, with no interior faces', () => {
    const cells = Uint8Array.from([1, 1, 1, 1, 0, 1, 1, 1, 1]), solid = gridSolid(cells, 3, 3, 1, 0, 0, 0, 1);
    // 8 cells: top and bottom merge into 4 rectangles each; 12 outer and 4 inner wall quads.
    expect(solid.attributes.position.count / 6).toBe(4 + 4 + 12 + 4);
    const assembly = resolveBuild(defaultBuild(studio)), detail = assembly.bySlot.pcb.detail as { cells: Uint8Array; cols: number; x0: number; y0: number; cell: number };
    const cam = assembly.bySlot['camera-main'].box, col = Math.floor((cam.x - detail.x0) / detail.cell), row = Math.floor((cam.y - detail.y0) / detail.cell);
    expect(detail.cells[row * detail.cols + col]).toBe(0);
  });
  it('keeps device-specific exteriors: families and finishes still produce different shells', () => {
    const signatures = new Set<string>();
    for (const family of Object.keys(DESIGN_FAMILIES) as Array<keyof typeof DESIGN_FAMILIES>) {
      const model = createDeviceModel({ ...studio, family, camera: family === 'halo' ? 'circle' : 'triple' }, { hollow: true });
      signatures.add(model.group.children.map(c => c.name).sort().join(','));
      const chassis = new Box3().setFromObject(model.group.getObjectByName('chassis')!).getSize(new Vector3());
      expect(chassis.x).toBeCloseTo(studio.width, 1); expect(chassis.z).toBeCloseTo(studio.thickness, 1);
      model.dispose();
    }
    expect(signatures.size).toBeGreaterThanOrEqual(5);
  });
});

describe('Build a Phone model behaviour', () => {
  it('rebuilds only the parts that changed and adopts the studio exterior', () => {
    const model = createBuildModel('balanced'); let build = defaultBuild(studio);
    model.update(resolveBuild(build));
    const before = new Map([...model.entries()].map(([id, e]) => [id, e.group]));
    expect(model.entries().get('rear-cover')!.group.getObjectByName('back')).toBeTruthy();
    expect(model.entries().get('camera-housing')!.group.getObjectByName('camera-lens')).toBeTruthy();
    expect(model.entries().get('panel')!.group.getObjectByName('flat-display')).toBeTruthy();
    build = replaceComponent(build, 'loudspeaker', 'speaker-large'); model.update(resolveBuild(build));
    expect(model.entries().get('loudspeaker')!.group).not.toBe(before.get('loudspeaker'));
    expect(model.entries().get('soc')!.group).toBe(before.get('soc'));
    expect(model.entries().get('battery')!.group).toBe(before.get('battery'));
    model.update(resolveBuild({ ...build, design: { ...build.design, color: '#334455', backFinish: 'ceramic' } }));
    expect(model.entries().get('soc')!.group).toBe(before.get('soc'));
    model.dispose();
  });
  it('separates layers in order when exploded and reassembles exactly', () => {
    const model = createBuildModel('balanced'); model.update(resolveBuild(defaultBuild(studio)));
    model.setView({ mode: 'exploded' }); expect(settle(model)).toBeGreaterThan(10);
    const z = (id: string) => model.entries().get(id)!.group.position.z;
    expect(z('cover-glass')).toBeLessThan(z('panel')); expect(z('panel')).toBeLessThan(0);
    expect(z('frame')).toBe(0);
    expect(z('pcb')).toBeGreaterThan(0); expect(z('soc')).toBeGreaterThan(z('pcb')); expect(z('shield-compute')).toBeGreaterThan(z('soc')); expect(z('rear-cover')).toBeGreaterThan(z('wireless-coil'));
    expect(model.entries().get('sim-tray')!.group.position.x).toBeGreaterThan(5);
    expect(model.bounds().getSize(new Vector3()).z).toBeGreaterThan(90);
    model.setView({ mode: 'exploded', subsystem: 'power' }); settle(model);
    expect(z('battery')).toBeGreaterThan(0); expect(z('pcb')).toBe(0);
    model.setView({ mode: 'assembled', subsystem: 'all' }); settle(model);
    for (const [, entry] of model.entries()) expect(entry.group.position.length()).toBe(0);
    model.dispose();
  });
  it('ghosts the shell in X-ray without making internals transparent', () => {
    const model = createBuildModel('balanced'); model.update(resolveBuild(defaultBuild(studio)));
    const ghosted = (id: string) => model.entries().get(id)!.ghost;
    model.setView({ mode: 'xray', xrayDepth: 1 });
    expect(ghosted('rear-cover')).toBe('ghost'); expect(ghosted('frame')).toBe('frame'); expect(ghosted('battery')).toBe('none'); expect(ghosted('soc')).toBe('none'); expect(ghosted('shield-compute')).toBe('none');
    model.setView({ xrayDepth: 2 }); expect(ghosted('shield-compute')).toBe('ghost'); expect(ghosted('soc')).toBe('none');
    const opaque = [...model.entries().values()].filter(e => e.ghost === 'none').length;
    expect(opaque).toBeGreaterThan(model.entries().size * .6);
    model.setView({ mode: 'inspect', selected: 'soc' }); expect(ghosted('soc')).toBe('none'); expect(ghosted('ram')).toBe('none'); expect(ghosted('battery')).toBe('faint');
    model.setView({ mode: 'assembled', selected: null });
    for (const [, entry] of model.entries()) expect(entry.ghost).toBe('none');
    model.dispose();
  });
  it('picks the part under a ray and skips ghosted shells', () => {
    const model = createBuildModel('balanced'), assembly = resolveBuild(defaultBuild(studio)); model.update(assembly); model.group.updateMatrixWorld(true);
    const cell = assembly.bySlot.battery.box, ray = new Raycaster(new Vector3(cell.x, cell.y - 20, 200), new Vector3(0, 0, -1));
    expect(model.pick(ray)).toBe('rear-cover');
    model.setView({ mode: 'xray', xrayDepth: 2 });
    expect(['battery', 'wireless-coil', 'main-flex']).toContain(model.pick(ray));
    expect(model.pick(new Raycaster(new Vector3(500, 500, 200), new Vector3(0, 0, -1)))).toBeNull();
    model.dispose();
  });
  it('animates removal and installation, lifting the parts that cover the target', () => {
    const model = createBuildModel('balanced'); let build = defaultBuild(studio);
    model.update(resolveBuild(build)); settle(model);
    build = uninstallPart(build, 'battery'); model.update(resolveBuild(build));
    expect(model.isAnimating()).toBe(true);
    let lifted = 0, sawBatteryMoving = false;
    for (let i = 0; i < 3000 && model.tick(1 / 60); i++) { lifted = Math.max(lifted, model.entries().get('rear-cover')!.group.position.z); const p = model.entries().get('battery')!.group.position.z; if (p > 5 && model.entries().get('battery')!.group.visible) sawBatteryMoving = true; }
    expect(lifted).toBeGreaterThan(40); expect(sawBatteryMoving).toBe(true);
    expect(model.entries().get('battery')!.group.visible).toBe(false);
    expect(model.entries().get('rear-cover')!.group.position.length()).toBe(0);
    build = installPart(build, 'battery'); model.update(resolveBuild(build));
    expect(model.entries().get('battery')!.group.visible).toBe(true);
    expect(model.entries().get('battery')!.group.position.z).toBeGreaterThan(40);
    settle(model);
    expect(model.entries().get('battery')!.group.position.length()).toBe(0);
    model.setReducedMotion(true); build = uninstallPart(build, 'haptic'); model.update(resolveBuild(build)); model.tick(1 / 60);
    expect(model.entries().get('haptic')!.group.visible).toBe(false);
    model.dispose();
  });
  it('switches quality tier and device without leaking parts', () => {
    const model = createBuildModel('high'); model.update(resolveBuild(defaultBuild(studio)));
    expect(model.quality).toBe('high'); model.setQuality('mobile'); expect(model.quality).toBe('mobile');
    const count = model.entries().size;
    model.update(resolveBuild(defaultBuild({ ...studio, family: 'duo', cameraCount: 2, width: 70, height: 150 }, 'rail')));
    expect(model.entries().has('camera-tele')).toBe(false); expect(model.entries().size).toBeLessThan(count);
    expect(model.group.children.filter(c => c.userData.slot).length).toBe(model.entries().size);
    model.dispose(); expect(model.group.children).toHaveLength(0);
  });
  it('gives desktops the highest tier and phones the lightest', () => {
    expect(detectQuality({ coarsePointer: false, shortSide: 1080, deviceMemory: 16, cores: 12 })).toBe('high');
    expect(detectQuality({ coarsePointer: false, shortSide: 900, deviceMemory: 4, cores: 8 })).toBe('balanced');
    expect(detectQuality({ coarsePointer: true, shortSide: 412, deviceMemory: 8, cores: 8 })).toBe('mobile');
    expect(detectQuality({ coarsePointer: true, shortSide: 1024 })).toBe('high');
  });
});

describe('Build a Phone selection visibility', () => {
  it('fades whatever covers the selected part, and restores it when cleared', () => {
    const model = createBuildModel('balanced'); model.update(resolveBuild(defaultBuild(studio)));
    model.setView({ mode: 'xray', selected: 'soc' });
    const ghost = (id: string) => model.entries().get(id)!.ghost;
    expect(ghost('shield-compute')).toBe('ghost'); expect(ghost('heat-spreader')).toBe('ghost'); expect(ghost('soc')).toBe('none'); expect(ghost('battery')).toBe('none');
    model.setView({ selected: null }); expect(ghost('heat-spreader')).toBe('none');
    model.dispose();
  });
});

describe('Build a Phone rendering budget', () => {
  const drawCalls = (quality: 'high' | 'mobile') => {
    const model = createBuildModel(quality); model.update(resolveBuild(defaultBuild(studio)));
    let meshes = 0, casters = 0;
    model.group.traverse(node => { const mesh = node as Mesh; if (!mesh.isMesh) return; meshes++; if (mesh.castShadow) casters++; });
    model.setView({ mode: 'xray' }); model.setView({ mode: 'assembled' });
    let after = 0; model.group.traverse(node => { if ((node as Mesh).isMesh && (node as Mesh).castShadow) after++; });
    model.dispose();
    return { total: meshes + casters, casters, after };
  };
  it('keeps draw calls within budget, lighter on phones, and survives view changes', () => {
    const high = drawCalls('high'), mobile = drawCalls('mobile');
    expect(high.total).toBeLessThan(420); expect(mobile.total).toBeLessThan(high.total);
    expect(mobile.casters).toBeLessThan(30); expect(high.casters).toBeLessThan(80);
    expect(high.after).toBe(high.casters);
  });
});
