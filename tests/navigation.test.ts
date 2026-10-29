import {describe,it,expect} from 'vitest';
import {navigationFor,activeNavigation} from '../src/lib/navigation';

describe('shared navigation route state',()=>{
 it.each([
  ['/', 'home'],
  ['/articles?section=news&offset=30','news'],
  ['/articles?section=reports','reports'],
  ['/news/a-long-article','news'],
  ['/analysis/a-long-article','analysis'],
  ['/interactive-leaks/simulate','lab'],
  ['/interactive-leaks/explore','community'],
  ['/interactive-leaks/explore/','community'],
  ['/interactive-leaks/simulation/example','community'],
  ['/interactive-leaks/profile/example','community'],
  ['/creator/example','community'],
  ['/interactive-leaks/foldables','lab'],
  ['/interactive-leaks/','lab'],
  ['/studio/articles/example','studio'],
  ['/studio/','studio'],
  ['/account',undefined],
  ['/articles','newsroom'],
  ['/articles?section=unknown',undefined],
  ['/interactive-leaks-other',undefined],
  ['/studio-access',undefined],
 ])('selects only the appropriate section for %s',(path,expected)=>{
  expect(activeNavigation(new URL(path,'https://phonefuturist.example'))).toBe(expected);
 });
});
describe('verified session navigation',()=>{
 it('shows guest controls and no Studio for anonymous requests',()=>{expect(navigationFor(null,null)).toEqual({signedIn:false,showStudio:false});});
 it('does not trust user metadata for Studio authorization',()=>{expect(navigationFor({user_metadata:{role:'admin'}},null)).toEqual({signedIn:true,showStudio:false});});
 it('shows Studio navigation only to an active verified administrator',()=>{
  const access={active:true,verified:true,roles:['admin']};expect(navigationFor({},access).showStudio).toBe(true);
  for(const roles of [['reader'],['writer'],['editor'],['publisher']])expect(navigationFor({},{...access,roles}).showStudio).toBe(false);
  expect(navigationFor({},{...access,active:false}).showStudio).toBe(false);expect(navigationFor({},{...access,verified:false}).showStudio).toBe(false);
 });
});
