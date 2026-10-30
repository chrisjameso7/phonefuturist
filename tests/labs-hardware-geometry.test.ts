import { describe, expect, it } from 'vitest';
import { Box3, Mesh, Vector3,Quaternion } from 'three';
import { CONCEPT_PRESETS,calculateDeviceConcept } from '../src/lib/labs/device-concepts';
import { conceptDesign,conceptGeometry,displayGeometry,withConceptBezel,fitConceptChassis } from '../src/lib/labs/concept-geometry';
import { createHardwareModel } from '../src/lib/labs/hardware-mesh';
import { createDeviceModel } from '../src/lib/labs/device-mesh';
import { DEFAULT_DESIGN,DESIGN_FAMILIES } from '../src/lib/labs/device-design';

describe('independent display geometry',()=>{
  it('accepts custom sizes beyond presets, preserves aspect and never resizes the body',()=>{
    const c={...CONCEPT_PRESETS.tablets[0],diagonal:10.35,aspectWidth:3,aspectHeight:4};
    const before={...c},g=conceptGeometry(c);
    expect(g.valid).toBe(true);expect(g.primary.width/g.primary.height).toBeCloseTo(.75,8);
    expect(Math.hypot(g.primary.width,g.primary.height)/25.4).toBeCloseTo(10.35,8);
    expect(c).toEqual(before);expect(calculateDeviceConcept(c).activeDisplay.widthMm).toBeCloseTo(g.primary.width,6);
    expect(displayGeometry(31,1,1,600,600).valid).toBe(true);
  });
  it('rejects oversize screens instead of stretching a chassis or clipping geometry',()=>{
    const c={...CONCEPT_PRESETS.tablets[0],diagonal:25};
    expect(conceptGeometry(c).valid).toBe(false);expect(conceptDesign(c,180).displayWidth).toBe(0);
    expect(()=>calculateDeviceConcept(c)).toThrow('Display dimensions');
    for(const diagonal of [0,NaN,Infinity])expect(displayGeometry(diagonal,3,4,178,250).valid).toBe(false);
  });
  it('fits inner and cover screens to their separate panels',()=>{
    for(const c of CONCEPT_PRESETS.foldables){
      const g=conceptGeometry(c);expect(g.valid).toBe(true);
      expect(g.cover!.width).toBeLessThan(c.formFactor==='book_foldable'?c.width/2:c.width);
      expect(g.cover!.height).toBeLessThan(c.formFactor==='flip_foldable'?c.height/2:c.height);
    }
  });
});
it('refits bezel changes without changing body, thickness or display aspect, and only resizes chassis explicitly',()=>{
  const original={...CONCEPT_PRESETS.tablets[0],aspectWidth:3,aspectHeight:4};
  const next=withConceptBezel(original,false,8),g=conceptGeometry(next);
  expect(next.width).toBe(original.width);expect(next.height).toBe(original.height);expect(next.thickness).toBe(original.thickness);
  expect(g.valid).toBe(true);expect(g.primary.width/g.primary.height).toBeCloseTo(.75,8);
  expect(Math.min(g.primary.sideBezel,g.primary.topBezel)).toBeCloseTo(8,6);
  const large={...original,diagonal:18},fitted=fitConceptChassis(large);
  expect(fitted.width).toBeGreaterThan(original.width);expect(conceptGeometry(fitted).valid).toBe(true);expect(fitted.diagonal).toBe(18);
  expect(fitted.thickness).toBe(original.thickness);expect(large.width).toBe(original.width);
});
describe('distinct physical hardware',()=>{
  it('models tablet thickness and a laptop lid, hinge, keyboard and trackpad',()=>{
    const tablet=createHardwareModel(conceptDesign(CONCEPT_PRESETS.tablets[0],180));
    const chassis=tablet.group.getObjectByName('tablet-chassis')!;
    expect(new Box3().setFromObject(chassis).getSize(new Vector3()).z).toBeCloseTo(6,2);
    expect(tablet.group.getObjectByName('phonefuturist-logo')).toBeTruthy();tablet.dispose();
    const laptop=createHardwareModel(conceptDesign(CONCEPT_PRESETS.laptops[0],110));
    for(const name of ['laptop-base','laptop-lid','laptop-hinge','trackpad','phonefuturist-logo'])expect(laptop.group.getObjectByName(name)).toBeTruthy();
    const open=new Box3().setFromObject(laptop.group.getObjectByName('laptop-lid')!).getSize(new Vector3());
    laptop.update(conceptDesign(CONCEPT_PRESETS.laptops[0],0));
    const display=laptop.group.getObjectByName('laptop-display')!;
    expect(new Vector3(0,0,1).applyQuaternion(display.getWorldQuaternion(new Quaternion())).y).toBeLessThan(-.99);
    expect(new Box3().setFromObject(display).min.y).toBeGreaterThan(new Box3().setFromObject(laptop.group.getObjectByName('keyboard-key')!).max.y);
    const shut=new Box3().setFromObject(laptop.group.getObjectByName('laptop-lid')!).getSize(new Vector3());
    expect(open.y).toBeGreaterThan(shut.y*10);laptop.dispose();
  });
  it('folds two physical halves without overlapping their chassis volumes when closed',()=>{
    for(const c of CONCEPT_PRESETS.foldables){
      const model=createHardwareModel(conceptDesign(c,0));
      const a=new Box3().setFromObject(model.group.getObjectByName('fold-chassis-0')!);
      const b=new Box3().setFromObject(model.group.getObjectByName('fold-chassis-1')!);
      expect(b.max.z).toBeLessThan(a.min.z-.35);
      expect(new Box3().setFromObject(model.group.getObjectByName('inner-display-1')!).max.z).toBeLessThan(new Box3().setFromObject(model.group.getObjectByName('inner-display-0')!).min.z-.05);
      expect(model.group.getObjectByName('cover-display')).toBeTruthy();
      model.update(conceptDesign(c,180));
      const spine=new Box3().setFromObject(model.group.getObjectByName('hinge-spine-0')!);
      expect(spine.min.z).toBeGreaterThan(c.thickness/2);
      expect(model.group.getObjectByName('hinge-barrel')).toBeUndefined();
      const open=new Box3().setFromObject(model.group);
      expect(c.formFactor==='book_foldable'?open.getSize(new Vector3()).x:open.getSize(new Vector3()).y).toBeGreaterThan((c.formFactor==='book_foldable'?c.width:c.height)*.95);
      model.dispose();
    }
  });
});
describe('phone family geometry and surfaces',()=>{
  it('supports every family and lens count without lens collisions or chassis-edge overlap',()=>{
    const identities=new Set<string>();
    for(const family of Object.keys(DESIGN_FAMILIES) as Array<keyof typeof DESIGN_FAMILIES>)for(const count of [1,2,3,4]){
      const model=createDeviceModel({...DEFAULT_DESIGN,family,cameraCount:count,camera:family==='halo'?'circle':'triple'});
      const lenses=model.group.children.filter(n=>n.name==='lens-ring') as Mesh[];
      expect(lenses).toHaveLength(family==='duo'||family==='halo'?0:count);expect(model.group.getObjectByName('phonefuturist-logo')).toBeTruthy();
      identities.add(model.group.children.map(n=>n.name).join(','));
      for(let i=0;i<lenses.length;i++){
        const r=new Box3().setFromObject(lenses[i]).getSize(new Vector3()).x/2;
        expect(Math.abs(lenses[i].position.x)+r).toBeLessThan(DEFAULT_DESIGN.width/2);
        expect(Math.abs(lenses[i].position.y)+r).toBeLessThan(DEFAULT_DESIGN.height/2);
        for(let j=i+1;j<lenses.length;j++){
          const other=new Box3().setFromObject(lenses[j]).getSize(new Vector3()).x/2;
          expect(lenses[i].position.distanceTo(lenses[j].position)).toBeGreaterThan(r+other+.4);
        }
      }
      model.dispose();
    }
    expect(identities.size).toBeGreaterThanOrEqual(6);
  });
  it('changes only the requested surface and independently toggles ports, grilles and antennas',()=>{
    const model=createDeviceModel({...DEFAULT_DESIGN,backFinish:'frostedGlass',frameFinish:'steel',frontFinish:'nanoTexture'});
    const chassis=model.group.getObjectByName('chassis') as Mesh;
    expect((chassis.material as any).metalness).toBe(1);expect(model.finish.metalness).toBe(0);expect(model.finish.roughness).toBe(.76);
    const screen=model.group.getObjectByName('flat-display') as Mesh;expect((screen.material as any).roughness).toBe(.68);
    model.update({...DEFAULT_DESIGN,usbC:false,speakers:'none',antenna:false,selfieStyle:'none'});
    for(const name of ['usb-c-port','speaker-grille','antenna-cutout','selfie-camera'])expect(model.group.getObjectByName(name)).toBeUndefined();
    model.update({...DEFAULT_DESIGN,usbC:true,speakers:'stereo',antenna:true,selfieDiameter:4,protrusion:4});
    for(const name of ['usb-c-port','speaker-grille','upper-speaker','antenna-cutout','selfie-camera'])expect(model.group.getObjectByName(name)).toBeTruthy();
    const lens=new Box3().setFromObject(model.group.getObjectByName('lens-aperture')!);
    expect(lens.max.z-DEFAULT_DESIGN.thickness/2).toBeCloseTo(4.96,2);model.dispose();
  });
});

it('keeps the flexible crease connected and wraps a curved rear spine through the fold motion',()=>{
 for(const c of CONCEPT_PRESETS.foldables)for(const angle of [0,30,60,90,120,150,180]){
  const model=createHardwareModel(conceptDesign(c,angle)),book=c.formFactor==='book_foldable';
  const crease=model.group.getObjectByName('flexible-display-crease') as Mesh,spine=model.group.getObjectByName('articulated-rear-spine') as Mesh;
  expect(crease).toBeTruthy();expect(spine).toBeTruthy();expect(crease.userData.bendLength).toBeCloseTo(3.02,3);
  const vertices=crease.geometry.getAttribute('position');
  const first=new Vector3().fromBufferAttribute(vertices,0),last=new Vector3().fromBufferAttribute(vertices,80);
  const fold=Math.PI-angle*Math.PI/180,origin=new Vector3(0,0,-c.thickness/2-.25);
  const end=(book?new Vector3(1.5,0,.1):new Vector3(0,1.5,.1)).applyAxisAngle(book?new Vector3(0,1,0):new Vector3(1,0,0),book?fold:-fold).add(origin);
  expect(book?first.x:first.y).toBeCloseTo(-1.5,5);expect(first.z).toBeCloseTo(-c.thickness/2-.15,5);
  expect(book?last.x:last.y).toBeCloseTo(book?end.x:end.y,5);expect(last.z).toBeCloseTo(end.z,5);
  if(angle===0){const bounds=new Box3().setFromObject(spine);expect(book?bounds.max.x:bounds.max.y).toBeGreaterThan(1);}
  expect(model.group.getObjectsByProperty('name','fold-camera-lens')).toHaveLength(2);model.dispose();
 }
});
it('sets camera island depth in millimetres independently from chassis and lens cap thickness',()=>{
 for(const family of ['plateau','duo','halo'] as const){const model=createDeviceModel({...DEFAULT_DESIGN,family});
  for(const depth of [.5,2,6]){model.update({...DEFAULT_DESIGN,family,protrusion:depth});
   const island=model.group.getObjectByName(family==='halo'?'circular-housing':family==='duo'?'camera-bar':'camera-island')!;
   const bounds=new Box3().setFromObject(island),rear=new Box3().setFromObject(model.group.getObjectByName('back')!);
   expect(bounds.getSize(new Vector3()).z).toBeCloseTo(depth,4);expect(bounds.min.z).toBeCloseTo(rear.max.z,4);expect(bounds.max.z-rear.max.z).toBeCloseTo(depth,4);
   expect(new Box3().setFromObject(model.group.getObjectByName('chassis')!).getSize(new Vector3()).z).toBeCloseTo(DEFAULT_DESIGN.thickness,4);
  }model.dispose();
 }
});
