import {describe,it,expect,vi,afterEach} from 'vitest';
const mocks=vi.hoisted(()=>({client:vi.fn(),settings:vi.fn(()=>({url:'https://fixture.supabase.co',key:'sb_publishable_fixture',origin:'https://phonefuturist-dev.phonefuturist.workers.dev',allowedOrigins:[]}))}));
vi.mock('astro:middleware',()=>({defineMiddleware:(handler:unknown)=>handler}));
vi.mock('../src/lib/supabase',()=>({settings:mocks.settings,serverClient:mocks.client}));
import {canShowAds} from '../src/lib/advertising';
import {onRequest} from '../src/middleware';
async function run(method:string,origin:string|null,preflight?:string,cookie?:string){
 const headers=new Headers();if(origin!==null)headers.set('Origin',origin);if(preflight)headers.set('Access-Control-Request-Headers',preflight);
 if(cookie)headers.set('Cookie',cookie);
 const request=new Request('https://www.phonefuturist.com/auth/signup',{method,headers});
 const next=vi.fn(async()=>new Response('Route reached',{status:200,headers:{'Content-Security-Policy':"script-src 'self'; style-src 'self'"}}));const locals:any={};
 const response=await (onRequest as any)({request,url:new URL(request.url),cookies:{},locals,redirect:()=>new Response(null,{status:303})},next);return {response,next,locals};
}
describe('deployed request guard and CORS',()=>{
 it('passes signup POSTs from www and apex with exact credentialed CORS',async()=>{
  for(const origin of ['https://phonefuturist.com','https://www.phonefuturist.com']){const {response,next}=await run('POST',origin);expect(next).toHaveBeenCalled();expect(response.status).toBe(200);expect(response.headers.get('Access-Control-Allow-Origin')).toBe(origin);expect(response.headers.get('Access-Control-Allow-Credentials')).toBe('true');expect(response.headers.get('Vary')).toContain('Origin');expect(response.headers.get('Content-Security-Policy')).toContain("script-src 'self'");}
 });
 it('rejects hostile and missing origins without echoing CORS',async()=>{
  for(const origin of [null,'null','https://phonefuturist.com.evil.test']){const {response,next}=await run('POST',origin);expect(response.status).toBe(403);expect(next).not.toHaveBeenCalled();expect(response.headers.has('Access-Control-Allow-Origin')).toBe(false);}
 });
 it('handles valid preflight before authentication and rejects arbitrary request headers',async()=>{
  const {response,next}=await run('OPTIONS','https://www.phonefuturist.com','content-type');expect(response.status).toBe(204);expect(next).not.toHaveBeenCalled();expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST');
  expect((await run('OPTIONS','https://www.phonefuturist.com','x-untrusted')).response.status).toBe(403);
 });
});

afterEach(()=>mocks.client.mockReset());
it('shows ads for signed-in free members, suppresses verified Pro and fails closed on lookup errors',async()=>{
 for(const [rows,error,audience] of [[[],null,'free'],[[{user_id:'member'}],null,'pro'],[null,{code:'unavailable'},'unknown']] as const){
  mocks.client.mockReturnValue({auth:{getUser:async()=>({data:{user:{id:'member'}},error:null})},rpc:async()=>({data:{active:true,verified:true,roles:[]},error:null}),from:()=>({select:()=>({eq:()=>({in:async()=>({data:rows,error})})})})});
  const {locals}=await run('GET',null,undefined,'sb-project-auth-token=session');
  expect(locals.adAudience).toBe(audience);expect(canShowAds('/',false,locals.adAudience)).toBe(audience==='free');
 }
});
