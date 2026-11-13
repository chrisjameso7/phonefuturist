import {beforeEach,it,expect,vi} from 'vitest';
vi.mock('../src/lib/supabase',()=>({settings:vi.fn(),serverClient:vi.fn()}));
const mocks=vi.hoisted(()=>({client:vi.fn()}));vi.mock('../src/lib/labs/http',async()=>{const original=await vi.importActual<typeof import('../src/lib/labs/http')>('../src/lib/labs/http');return {...original,labClient:mocks.client};});
import {POST,GET} from '../src/pages/api/community';
import {communityDesign,communityJson} from '../src/lib/community/build';
const user='10000000-0000-4000-8000-000000000001',build='20000000-0000-4000-8000-000000000001';
const insert=vi.fn(),rpc=vi.fn(),client={auth:{getUser:vi.fn()},from:vi.fn(()=>({insert})),rpc};
function context(body:unknown){const request=new Request('https://phonefuturist.com/api/community',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});return {request,url:new URL(request.url),locals:{access:{roles:[]}}} as any;}
beforeEach(()=>{vi.clearAllMocks();mocks.client.mockReturnValue(client);client.auth.getUser.mockResolvedValue({data:{user:{id:user}}});rpc.mockResolvedValue({data:'post',error:null});insert.mockResolvedValue({error:null});});
it('rejects anonymous social writes before accessing tables',async()=>{client.auth.getUser.mockResolvedValue({data:{user:null}});expect((await POST(context({action:'follow',person:build}))).status).toBe(401);expect(client.from).not.toHaveBeenCalled();});
it('uses the authenticated identity for likes and follows, ignoring forged user IDs',async()=>{
 expect((await POST(context({action:'like',post:build,user_id:'attacker'}))).status).toBe(200);expect(insert).toHaveBeenCalledWith({post_id:build,user_id:user});
 await POST(context({action:'follow',person:build,follower_id:'attacker'}));expect(insert).toHaveBeenCalledWith({follower_id:user,following_id:build});
});
it('rejects self-follow, invalid IDs, oversized captions and empty replies',async()=>{
 for(const body of [{action:'follow',person:user},{action:'post',build,caption:'x'.repeat(1001)},{action:'reply',post:build,text:' '},{action:'like',post:'bad'}])expect((await POST(context(body))).status).toBe(400);
 expect(client.from).not.toHaveBeenCalled();expect(rpc).not.toHaveBeenCalled();
});
it('publishes through the atomic function and rejects malformed 3D finishes',async()=>{
 const design={name:'Build',width:76,height:163,thickness:8,bezel:1,material:'titanium',camera:'triple',color:'#68717d'};
 expect((await POST(context({action:'publish',design,caption:'Concept'}))).status).toBe(200);expect(rpc).toHaveBeenCalledWith('community_create_post',expect.objectContaining({p_name:'Build',p_caption:'Concept',p_results:null}));
 expect((await POST(context({action:'publish',design:{...design,frameFinish:'bad'},caption:''}))).status).toBe(400);
 expect((await POST(context({action:'post',build,caption:'Existing'}))).status).toBe(200);expect(rpc).toHaveBeenCalledWith('community_publish',{p_build:build,p_caption:'Existing'});
});
it('handles duplicate likes idempotently and preserves permission errors',async()=>{
 insert.mockResolvedValue({error:{code:'23505'}});expect((await POST(context({action:'like',post:build}))).status).toBe(200);
 insert.mockResolvedValue({error:{code:'42501'}});expect((await POST(context({action:'like',post:build}))).status).toBe(403);
});
it('validates feed cursors before invoking the database',async()=>{const ctx=context(null);ctx.url=new URL('https://phonefuturist.com/api/community?before=bad');expect((await GET(ctx)).status).toBe(400);expect(rpc).not.toHaveBeenCalled();});
it('bounds JSON in bytes and rejects non-finite or unsupported design fields',async()=>{
 await expect(communityJson(new Request('https://example.com',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({text:'x'.repeat(350001)})}))).rejects.toThrow('too large');
 expect(()=>communityDesign({width:Infinity})).toThrow();expect(()=>communityDesign({frameFinish:'invalid'})).toThrow();
});

it('publishes an Advanced simulation with its submitted configuration',async()=>{
 const configuration={mode:'advanced',socName:'Snapdragon 8 Elite',socVendor:'Qualcomm',coolingClass:'large-vapor-chamber',wiredWatts:'120',wirelessWatts:'50',parameters:{targetSocPowerW:'8'}};
 const response=await POST(context({action:'publish',caption:'Advanced build',run:{input:{name:'My advanced phone',formFactor:'phone',battery:{cells:[{capacityMah:6000}]}},device:{formFactor:'phone'},configuration}}));
 expect(response.status).toBe(200);expect(rpc).toHaveBeenCalledWith('community_create_post',expect.objectContaining({p_state:expect.objectContaining({configuration}),p_name:'My advanced phone'}));
});
