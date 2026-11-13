import { describe, expect, it } from 'vitest';
import { Box3, Mesh, Vector3 } from 'three';
import { DEFAULT_DESIGN, DEVICE_PRESETS, normalizeDesign } from '../src/lib/labs/device-design';
import { createDeviceModel } from '../src/lib/labs/device-mesh';

describe('device design input boundaries', () => {
  it('bounds dimensions and rejects invalid finishes without changing independent controls', () => {
    const result = normalizeDesign({ ...DEFAULT_DESIGN, width: 300, height: NaN, thickness: -4, bezel: 0, color: 'bad' });
    expect(result).toMatchObject({ width: 90, height: 163, thickness: 6, bezel: .8, color: DEFAULT_DESIGN.color });
    expect(result.camera).toBe(DEFAULT_DESIGN.camera);
    expect(normalizeDesign({ ...DEFAULT_DESIGN, ...DEVICE_PRESETS.compact }).material).toBe(DEFAULT_DESIGN.material);
  });
});

describe('parametric device geometry', () => {
  it('matches real chassis dimensions, with an equally inset flat display', () => {
    const model = createDeviceModel(DEFAULT_DESIGN);
    const chassis = model.group.getObjectByName('chassis') as Mesh;
    const size = new Box3().setFromObject(chassis).getSize(new Vector3());
    expect(size.x).toBeCloseTo(76, 2); expect(size.y).toBeCloseTo(163, 2); expect(size.z).toBeCloseTo(8.5, 2);
    const display = new Box3().setFromObject(model.group.getObjectByName('flat-display')!).getSize(new Vector3());
    expect((size.x - display.x) / 2).toBeCloseTo(DEFAULT_DESIGN.bezel, 2);
    expect((size.y - display.y) / 2).toBeCloseTo(DEFAULT_DESIGN.bezel, 2);
    model.dispose();
  });
  it('swaps camera modules and disposes replaced geometries while retaining the scene group', () => {
    const model = createDeviceModel(DEFAULT_DESIGN), group = model.group;
    let disposed = false;
    (group.getObjectByName('chassis') as Mesh).geometry.addEventListener('dispose', () => { disposed = true; });
    expect(group.children.filter(c => c.name === 'camera-lens')).toHaveLength(3);
    model.update({ ...DEFAULT_DESIGN, camera: 'periscope' });
    expect(disposed).toBe(true); expect(model.group).toBe(group);
    expect(group.children.filter(c => c.name === 'camera-lens')).toHaveLength(2);
    expect(group.getObjectByName('periscope-block')).toBeTruthy();
    model.update({ ...DEFAULT_DESIGN, camera: 'circle' });
    expect(group.getObjectByName('periscope-block')).toBeUndefined();
    expect(group.getObjectByName('circular-housing')).toBeTruthy();
    expect(group.children.filter(c => c.name === 'camera-lens')).toHaveLength(1);
    model.dispose();
  });
  it('updates PBR finishes without rebuilding geometry or resetting dimensions', () => {
    const model = createDeviceModel(DEFAULT_DESIGN);
    const geometry = (model.group.getObjectByName('chassis') as Mesh).geometry;
    expect(model.finish.normalMap).toBeTruthy();
    model.update({ ...DEFAULT_DESIGN, material: 'ceramic', color: '#334455' });
    expect(model.finish.roughness).toBeGreaterThan(.7); expect(model.finish.metalness).toBe(0);
    expect(model.finish.normalMap).toBeNull(); expect(model.finish.color.getHexString()).toBe('334455');
    expect((model.group.getObjectByName('chassis') as Mesh).geometry).toBe(geometry);
    model.update({ ...DEFAULT_DESIGN, material: 'steel' });
    expect(model.finish.metalness).toBe(1); expect(model.finish.roughness).toBeLessThan(.1);
    model.dispose();
  });
  it('scales physical buttons with chassis thickness and releases resources', () => {
    const model = createDeviceModel({ ...DEFAULT_DESIGN, ...DEVICE_PRESETS.ultra, thickness: 12 });
    const button = model.group.getObjectByName('power-button') as Mesh;
    expect(new Box3().setFromObject(button).getSize(new Vector3()).z).toBeCloseTo(12 * .55, 2);
    let disposed = false; model.finish.addEventListener('dispose', () => { disposed = true; });
    model.dispose(); expect(disposed).toBe(true); expect(model.group.children).toHaveLength(0);
  });
});
