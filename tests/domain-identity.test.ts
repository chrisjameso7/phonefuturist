import {describe,it,expect,vi} from 'vitest';
import {validOrigin,requestOrigin,HANDLE_PATTERN} from '../src/lib/security';
import {canShowAds} from '../src/lib/advertising';
import {creatorRole,publicCreatorRoles,searchCreators} from '../src/lib/creator-identity';
describe('domain migration boundaries',()=>{
 const legacy='https://phonefuturist-dev.phonefuturist.workers.dev';
 it('accepts both production domains and retains the old Worker and local development',()=>{
  for(const origin of ['https://phonefuturist.com','https://www.phonefuturist.com',legacy])expect(validOrigin(origin,legacy)).toBe(true);
  expect(validOrigin('http://localhost:4321','http://localhost:4321')).toBe(true);
  expect(validOrigin('http://127.0.0.1:4321','http://localhost:4321')).toBe(true);
 });
 it('rejects substring, scheme, port, credentials, path and missing-origin tricks',()=>{
  for(const origin of [null,'null','https://phonefuturist.com.evil.test','https://evil.test/phonefuturist.com','http://phonefuturist.com','https://phonefuturist.com:444','https://phonefuturist.com/','https://www.phonefuturist.com@evil.test'])expect(validOrigin(origin,legacy)).toBe(false);
 });
 it('keeps verification and recovery callbacks on the trusted request host',()=>{
  expect(requestOrigin(new Request('https://www.phonefuturist.com/auth/signup'),legacy)).toBe('https://www.phonefuturist.com');
  expect(requestOrigin(new Request('https://evil.test/auth/signup'),legacy)).toBe(legacy);
 });
});
it('only accepts 3–20 lowercase alphanumeric/underscore handles, with no normalization',()=>{
 for(const h of ['abc','user_123','a'.repeat(20)])expect(HANDLE_PATTERN.test(h)).toBe(true);
 for(const h of ['Abc','ABC','abc ',' abc','ab','a'.repeat(21),'a-b','éabc'])expect(HANDLE_PATTERN.test(h)).toBe(false);
});
it('uses the protected badge projection for public roles',async()=>{
 const rows=[{user_id:'a',verification_badge:'gold'},{user_id:'b',verification_badge:'green'},{user_id:'c',verification_badge:null}];
 const query={in:vi.fn().mockResolvedValue({data:rows,error:null})},select=vi.fn(()=>query),from=vi.fn((table:string)=>table==='user_badges'?{select:()=>({eq:()=>({in:vi.fn().mockResolvedValue({data:[{user_id:'c'}],error:null})})})}:{select});
 expect(Object.fromEntries(await publicCreatorRoles({from} as any,['a','b','c']))).toEqual({a:'admin',b:'writer',c:'pro'});
 expect(from).toHaveBeenCalledWith('creator_profiles');expect(select).toHaveBeenCalledWith('user_id,verification_badge');
 expect(creatorRole(['writer','admin'])).toBe('admin');expect(creatorRole([],true)).toBe('pro');expect(creatorRole([])).toBe('user');
});
it('bounds creator search and escapes underscore wildcards without touching navigation state',async()=>{
 const query:any={};for(const method of ['gte','lt','like','order'])query[method]=vi.fn(()=>query);query.limit=vi.fn().mockResolvedValue({data:[],error:null});
 const from=vi.fn(()=>({select:()=>query}));await searchCreators({from} as any,'@ab_');
 expect(query.like).toHaveBeenCalledWith('handle','ab\\_%');expect(query.limit).toHaveBeenCalledWith(12);
 from.mockClear();expect((await searchCreators({from} as any,'x,%')).error).toBeTruthy();expect(from).not.toHaveBeenCalled();
});
it('shows ads to free readers, including signed-in members, and excludes Pro and private/application pages',()=>{
 expect(canShowAds('/',false,'free')).toBe(true);expect(canShowAds('/articles/story',false,'free')).toBe(true);
 for(const path of ['/account','/login','/join','/studio','/auth/check-email','/forgot-password'])expect(canShowAds(path,false,'free')).toBe(false);
 for(const path of ['/news/example','/analysis/example','/labs/configurator','/interactive-leaks','/about'])expect(canShowAds(path,false,'free')).toBe(true);
 expect(canShowAds('/',false,'pro')).toBe(false);expect(canShowAds('/',false,'unknown')).toBe(false);expect(canShowAds('/',true,'free')).toBe(false);
});
