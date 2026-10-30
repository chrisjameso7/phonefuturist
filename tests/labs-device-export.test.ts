import { describe,it,expect } from 'vitest';
import * as THREE from 'three';
import { designCardRows } from '../src/lib/labs/device-design-export';
import { DEFAULT_DESIGN } from '../src/lib/labs/device-design';
import { screenUV } from '../src/lib/labs/device-wallpaper';
describe('visual device design exports',()=>{
 it('uses selected physical dimensions, materials and wallpaper in the card',()=>{
  const rows=Object.fromEntries(designCardRows({...DEFAULT_DESIGN,width:79,height:169,thickness:9,displayWidth:74,displayHeight:160,wallpaper:'dusk',backFinish:'frostedPlastic',protrusion:4}));
  expect(rows['Chassis · height × width × depth']).toBe('169 × 79 × 9 mm');
  expect(rows['Display · width × height']).toBe('74 × 160 mm');
  expect(rows['Wallpaper']).toBe('Sunset dunes');expect(rows['Rear surface']).toBe('Frosted plastic');expect(rows['Camera bump depth']).toBe('4 mm');
 });
 it('maps wallpaper over the entire screen and respects which side faces the viewer',()=>{
  const front=screenUV(new THREE.PlaneGeometry(70,150),70,150),lid=screenUV(new THREE.PlaneGeometry(300,200),300,200,false);
  const uv=front.getAttribute('uv'),other=lid.getAttribute('uv');
  expect(uv.getX(0)).toBe(1);expect(uv.getX(1)).toBe(0);expect(other.getX(0)).toBe(0);expect(other.getX(1)).toBe(1);
  expect(uv.getY(0)).toBe(1);expect(uv.getY(2)).toBe(0);front.dispose();lid.dispose();
 });
});
