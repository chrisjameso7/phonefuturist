import { describe, expect, it } from 'vitest';
import { accessBlockers, activeSlots, defaultBuild, dependants, installOrder, installPart, overlapXY, overlapZ, replaceComponent, resolveBuild, uninstallPart } from '../src/lib/labs/build/assembly';
import { ARCHITECTURES } from '../src/lib/labs/build/architectures';
import { DEFAULT_DESIGN, DEVICE_PRESETS, type DeviceDesign } from '../src/lib/labs/device-design';

const studio: DeviceDesign = { ...DEFAULT_DESIGN, family: 'plateau', cameraWidth: 68, cameraHeight: 44, frameFinish: 'brushedTitanium', backFinish: 'glossyGlass', frontFinish: 'antiReflective' };
const solid = ['camera-main', 'camera-ultrawide', 'camera-tele', 'camera-front', 'battery', 'loudspeaker', 'haptic', 'earpiece', 'usb-port'];

describe('Build a Phone placement', () => {
  it('places every active slot inside the chassis for each architecture', () => {
    for (const arch of Object.keys(ARCHITECTURES)) {
      const assembly = resolveBuild(defaultBuild(studio, arch)), { width: W, height: H, thickness: T, protrusion } = assembly.layout.design;
      expect(assembly.parts.length).toBeGreaterThan(70);
      expect(assembly.parts.filter(p => p.unplaced)).toHaveLength(0);
      for (const part of assembly.parts) {
        const { x, y, z, w, h, d } = part.box;
        expect([x, y, z, w, h, d].every(Number.isFinite)).toBe(true);
        expect(Math.abs(x) - w / 2).toBeLessThanOrEqual(W / 2 + 2); expect(Math.abs(y) - h / 2).toBeLessThanOrEqual(H / 2 + .5);
        expect(z + d / 2).toBeLessThanOrEqual(T / 2 + protrusion! + 1.3); expect(z - d / 2).toBeGreaterThanOrEqual(-T / 2 - .01);
      }
    }
  });
  it('keeps solid parts of the default builds from intersecting', () => {
    for (const arch of Object.keys(ARCHITECTURES)) for (const preset of [{}, DEVICE_PRESETS.compact, DEVICE_PRESETS.ultra]) {
      const { bySlot } = resolveBuild(defaultBuild({ ...studio, ...preset }, arch));
      for (let i = 0; i < solid.length; i++) for (let j = i + 1; j < solid.length; j++) {
        const a = bySlot[solid[i]], b = bySlot[solid[j]];
        if (a && b) expect(overlapXY(a.box, b.box, .2) && overlapZ(a.box, b.box, .2)).toBe(false);
      }
    }
  });
  it('stacks the display in front of the midframe and the electronics behind it', () => {
    const { bySlot, layout } = resolveBuild(defaultBuild(studio));
    const order = ['cover-glass', 'touch-layer', 'polarizer', 'panel', 'backplane', 'display-support', 'midplate', 'pcb', 'soc', 'ram'].map(id => bySlot[id].box.z);
    for (let i = 1; i < order.length; i++) expect(order[i]).toBeGreaterThan(order[i - 1]);
    expect(bySlot['shield-compute'].box.z + bySlot['shield-compute'].box.d / 2).toBeLessThan(layout.z.ceiling);
    expect(bySlot['ram'].parent).toBe('soc');
    expect(bySlot['ram'].box.x).toBeCloseTo(bySlot['soc'].box.x, 5);
  });
  it('fits the battery and cameras automatically until the user chooses one', () => {
    const wide = resolveBuild(defaultBuild(studio)), small = resolveBuild(defaultBuild({ ...studio, ...DEVICE_PRESETS.compact }));
    expect(wide.auto.battery).toBe(true);
    expect(Number(small.bySlot.battery.component.traits.energyWh)).toBeLessThan(Number(wide.bySlot.battery.component.traits.energyWh));
    const bay = small.layout.bay, cell = small.bySlot.battery.box;
    expect(cell.w).toBeLessThanOrEqual(bay.x1 - bay.x0); expect(cell.y - cell.h / 2).toBeGreaterThanOrEqual(bay.y0);
    const forced = resolveBuild(replaceComponent(defaultBuild({ ...studio, ...DEVICE_PRESETS.compact }), 'battery', 'cell-7000-sic'));
    expect(forced.auto.battery).toBeUndefined();
    expect(forced.bySlot.battery.component.id).toBe('cell-7000-sic');
    const thin = resolveBuild(defaultBuild({ ...studio, family: 'stealth', protrusion: 1 }));
    expect(thin.bySlot['camera-main'].component.dimensions[2]).toBeLessThan(wide.bySlot['camera-main'].component.dimensions[2]);
  });
  it('makes components conditional on the chassis and architecture', () => {
    expect(activeSlots(defaultBuild({ ...studio, cameraCount: 1 })).some(s => s.id === 'camera-ultrawide')).toBe(false);
    expect(activeSlots(defaultBuild({ ...studio, family: 'column', cameraCount: 4 })).some(s => s.id === 'camera-tele-2')).toBe(true);
    expect(activeSlots(defaultBuild({ ...studio, usbC: false })).some(s => s.id === 'usb-port')).toBe(false);
    expect(resolveBuild(defaultBuild(studio, 'stacked')).layout.board.tiers).toBe(2);
    expect(resolveBuild(defaultBuild(studio, 'rail')).layout.board.rects).toHaveLength(2);
    expect(resolveBuild(defaultBuild({ ...studio, backFinish: 'titanium' })).bySlot['wireless-coil']).toBeUndefined();
  });
  it('binds frame, rear and glass parts to the studio finishes in both directions', () => {
    const build = defaultBuild(studio);
    expect(resolveBuild(build).bySlot.frame.component.id).toBe('frame-brushedTitanium');
    const swapped = replaceComponent(build, 'rear-cover', 'rear-ceramic');
    expect(swapped.design.backFinish).toBe('ceramic');
    expect(resolveBuild(swapped).bySlot['rear-cover'].component.id).toBe('rear-ceramic');
  });
  it('replaces, removes and reinstalls parts without mutating the build', () => {
    const build = defaultBuild(studio), before = JSON.stringify(build);
    const noCoil = replaceComponent(build, 'wireless-coil', null);
    expect(resolveBuild(noCoil).bySlot['wireless-coil']).toBeUndefined();
    expect(resolveBuild(noCoil).empty.some(s => s.id === 'wireless-coil')).toBe(true);
    expect(replaceComponent(build, 'battery', null)).toBe(build);
    expect(replaceComponent(build, 'battery', 'not-a-part')).toBe(build);
    const removed = uninstallPart(build, 'battery');
    expect(resolveBuild(removed).bySlot.battery.installed).toBe(false);
    expect(resolveBuild(removed).totals.installedWeightG).toBeLessThan(resolveBuild(build).totals.installedWeightG);
    expect(resolveBuild(installPart(removed, 'battery')).bySlot.battery.installed).toBe(true);
    expect(JSON.stringify(build)).toBe(before);
  });
  it('derives access order and dependants from geometry', () => {
    const assembly = resolveBuild(defaultBuild(studio));
    const soc = accessBlockers(assembly, 'soc').map(p => p.slot.id);
    expect(soc).toContain('shield-compute'); expect(soc).toContain('rear-cover'); expect(soc).not.toContain('battery');
    expect(accessBlockers(assembly, 'battery').map(p => p.slot.id)).toContain('rear-cover');
    expect(accessBlockers(assembly, 'panel').map(p => p.slot.id)).toContain('cover-glass');
    expect(accessBlockers(assembly, 'rear-cover').map(p => p.slot.id)).toEqual(['camera-housing']);
    expect(dependants(assembly, 'pcb').map(p => p.slot.id)).toContain('ram');
    const steps = installOrder(assembly).map(p => p.slot.step);
    expect([...steps].sort((a, b) => a - b)).toEqual(steps);
  });
  it('estimates a plausible mass and reacts to material and battery changes', () => {
    const base = resolveBuild(defaultBuild(studio)).totals;
    expect(base.weightG).toBeGreaterThan(150); expect(base.weightG).toBeLessThan(290);
    expect(base.weightConfidence).toBe('estimated');
    expect(resolveBuild(defaultBuild({ ...studio, frameFinish: 'steel' })).totals.weightG).toBeGreaterThan(base.weightG);
    expect(resolveBuild(defaultBuild({ ...studio, frameFinish: 'plastic' })).totals.weightG).toBeLessThan(base.weightG);
  });
  it('is deterministic', () => {
    const a = resolveBuild(defaultBuild(studio, 'stacked')), b = resolveBuild(defaultBuild(studio, 'stacked'));
    expect(a.parts.map(p => [p.slot.id, p.box, p.instances])).toEqual(b.parts.map(p => [p.slot.id, p.box, p.instances]));
  });
});
