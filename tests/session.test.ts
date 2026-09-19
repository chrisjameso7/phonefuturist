import { afterEach, expect, it, vi } from 'vitest';
import type { AstroCookies } from 'astro';
import { sessionClient } from '../src/lib/session-client';
const config={url:'https://fixture.supabase.co',key:'sb_publishable_fixture',origin:'https://example.test'};
const user={id:'00000000-0000-0000-0000-000000000001',aud:'authenticated',role:'authenticated',email:'fixture@example.test',app_metadata:{},user_metadata:{},created_at:new Date().toISOString()};
function token(exp:number) {
  return [Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),Buffer.from(JSON.stringify({sub:user.id,exp,aal:'aal2',session_id:user.id})).toString('base64url'),'fixture'].join('.');
}
afterEach(()=>vi.unstubAllGlobals());
it('persists cookies across requests, rotates expired tokens without a new code, and clears on sign-out',async()=>{
  const jar=new Map<string,string>(); const writes:{options:Record<string,unknown>}[]=[];
  const cookies={set:(name:string,value:string,options:Record<string,unknown>)=>{
    writes.push({options}); if(options.maxAge===0)jar.delete(name); else jar.set(name,value);
  }} as unknown as AstroCookies;
  const request=()=>new Request(config.origin+'/account',{headers:{cookie:[...jar].map(([n,v])=>`${n}=${encodeURIComponent(v)}`).join('; ')}});
  let refreshes=0;
  vi.stubGlobal('fetch',vi.fn(async(input:RequestInfo|URL)=>{
    const url=String(input);
    if(url.includes('/token')) {
      const refresh=url.includes('refresh_token'); if(refresh) refreshes++;
      const expires=refresh?3600:1;
      return new Response(JSON.stringify({access_token:token(Math.floor(Date.now()/1000)+expires),refresh_token:refresh?'rotated-fixture':'initial-fixture',expires_in:expires,token_type:'bearer',user}),{status:200,headers:{'content-type':'application/json'}});
    }
    if(url.includes('/user')) return new Response(JSON.stringify(user),{status:200,headers:{'content-type':'application/json'}});
    if(url.includes('/logout')) return new Response(null,{status:204});
    throw new Error('Unexpected auth request');
  }));
  const first=sessionClient(cookies,request(),config);
  expect((await first.auth.signInWithPassword({email:user.email,password:'fixture-only-password'})).error).toBeNull();
  expect(jar.size).toBeGreaterThan(0);
  expect(writes.some(w=>Number(w.options.maxAge)>0)).toBe(true);
  for(const {options} of writes) expect(options).toMatchObject({httpOnly:true,secure:true,sameSite:'lax',path:'/'});
  // SDK treats a token within its expiry margin as expired and refreshes server-side.
  const second=sessionClient(cookies,request(),config);
  expect((await second.auth.getUser()).data.user?.id).toBe(user.id);
  expect(refreshes).toBe(1);
  const assurance=await second.auth.mfa.getAuthenticatorAssuranceLevel();
  expect(assurance.data?.currentLevel).toBe('aal2');
  expect((await second.auth.signOut()).error).toBeNull();
  expect(jar.size).toBe(0);
});
