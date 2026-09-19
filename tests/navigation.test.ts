import {describe,it,expect} from 'vitest';
import {navigationFor} from '../src/lib/navigation';
describe('verified session navigation',()=>{
 it('shows guest controls and no Studio for anonymous requests',()=>{expect(navigationFor(null,null)).toEqual({signedIn:false,showStudio:false});});
 it('does not trust user metadata for Studio authorization',()=>{expect(navigationFor({user_metadata:{role:'admin'}},null)).toEqual({signedIn:true,showStudio:false});});
 it('shows Studio navigation only to an active verified administrator',()=>{
  const access={active:true,verified:true,roles:['admin']};expect(navigationFor({},access).showStudio).toBe(true);
  for(const roles of [['reader'],['writer'],['editor'],['publisher']])expect(navigationFor({},{...access,roles}).showStudio).toBe(false);
  expect(navigationFor({},{...access,active:false}).showStudio).toBe(false);expect(navigationFor({},{...access,verified:false}).showStudio).toBe(false);
 });
});
