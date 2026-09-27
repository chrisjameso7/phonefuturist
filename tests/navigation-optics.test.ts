import { describe,it,expect } from 'vitest';
import { lensPixel } from '../src/lib/navigation-optics';
describe('bounded optical lens',()=>{
 it('leaves the interior undistorted',()=>expect(lensPixel(250,28,500,56)).toEqual([128,128,0]));
 it('refracts opposite edges in opposite directions',()=>{
  expect(lensPixel(250,5,500,56)[1]).toBeLessThan(128);
  expect(lensPixel(250,51,500,56)[1]).toBeGreaterThan(128);
 });
 it('keeps the displacement finite and within four pixels',()=>{
  for(let y=0;y<56;y++)for(let x=0;x<500;x++) {
   const [r,g]=lensPixel(x+.5,y+.5,500,56);
   expect(Math.abs(r-128)).toBeLessThanOrEqual(85);
   expect(Math.abs(g-128)).toBeLessThanOrEqual(85);
  }
 });
});

import { compactNavigationState } from '../src/lib/navigation-client';
describe('desktop threshold hysteresis',()=>{
 it('retains the previous state inside the return band',()=>{
  expect(compactNavigationState(-20,20,false)).toBe(false);
  expect(compactNavigationState(-20,20,true)).toBe(true);
 });
 it('contracts beyond the band and expands above it',()=>{
  expect(compactNavigationState(-40,0,false)).toBe(true);
  expect(compactNavigationState(0,40,true)).toBe(false);
 });
});
