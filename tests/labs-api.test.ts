import {beforeEach,describe,it,expect,vi} from 'vitest';
const mocks=vi.hoisted(()=>({settings:vi.fn(),serverClient:vi.fn()}));
vi.mock('../src/lib/supabase',()=>mocks);
import {labClient,smallJson} from '../src/lib/labs/http';
import {GET,POST} from '../src/pages/api/labs/vault';
import {POST as uploadAvatar} from '../src/pages/account/api/avatar';
const user={id:'10000000-0000-4000-8000-000000000001'};
const storage={upload:vi.fn(),remove:vi.fn(),getPublicUrl:vi.fn()};
const client={auth:{getUser:vi.fn()},rpc:vi.fn(),storage:{from:vi.fn(()=>storage)}};
const context=(request:Request)=>({request,locals:{supabase:client},cookies:{}} as any);
beforeEach(()=>{vi.clearAllMocks();mocks.settings.mockReturnValue({url:'https://ehldokmrgahrlcoyidjy.supabase.co',key:'public-test-key',origin:'https://phonefuturist.com'});client.auth.getUser.mockResolvedValue({data:{user}});});
describe('Labs API boundaries',()=>{
 it('refuses to connect writes to another project',()=>{mocks.settings.mockReturnValue({url:'https://different.supabase.co'});expect(labClient(context(new Request('https://example.com')))).toBeNull();});
 it('bounds incoming JSON bodies',async()=>{await expect(smallJson(new Request('https://example.com',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({text:'x'.repeat(9000)})}))).rejects.toThrow('Request too large');});
 it('returns database-sanitized polls without shared caching',async()=>{client.rpc.mockResolvedValue({data:[{id:'poll',percentages:null}],error:null});const response=await GET(context(new Request('https://example.com/api/labs/vault')));expect(response.headers.get('cache-control')).toBe('private, no-store');expect(await response.json()).toMatchObject({signedIn:true,polls:[{percentages:null}]});expect(client.rpc).toHaveBeenCalledWith('lab_vault');});
 it('rejects anonymous votes before writing',async()=>{client.auth.getUser.mockResolvedValue({data:{user:null}});const response=await POST(context(new Request('https://example.com/api/labs/vault',{method:'POST'})));expect(response.status).toBe(401);expect(client.rpc).not.toHaveBeenCalled();});
 it('never accepts client user IDs or awarded scores',async()=>{client.rpc.mockResolvedValue({data:'vote-id',error:null});const response=await POST(context(new Request('https://example.com/api/labs/vault',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({topic:'20000000-0000-4000-8000-000000000001',fork:'Teardrop',user_id:'attacker',score_awarded:1000,resolved:true})})));expect(response.status).toBe(201);expect(client.rpc).toHaveBeenCalledWith('lab_lock_prediction',{p_topic:'20000000-0000-4000-8000-000000000001',p_fork:'Teardrop'});});
 it('handles a repeated lock without losing its error',async()=>{client.rpc.mockResolvedValue({data:null,error:{code:'23505'}});const response=await POST(context(new Request('https://example.com/api/labs/vault',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({topic:'20000000-0000-4000-8000-000000000001',fork:'Teardrop'})})));expect(response.status).toBe(409);expect((await response.json()).error).toContain('already locked');});
});

describe('Avatar upload integration',()=>{
 function imageRequest(type='image/png',bytes=new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,0])){const form=new FormData();form.set('avatar',new File([bytes],'../../untrusted-name.png',{type}));return new Request('https://example.com/account/api/avatar',{method:'POST',body:form});}
 it('rejects spoofed image data before storage',async()=>{const response=await uploadAvatar(context(imageRequest('image/png',new Uint8Array(12))));expect(response.status).toBe(400);expect(storage.upload).not.toHaveBeenCalled();});
 it('uploads under the authenticated user and synchronizes the public avatar',async()=>{storage.upload.mockResolvedValue({error:null});storage.getPublicUrl.mockReturnValue({data:{publicUrl:'https://ehldokmrgahrlcoyidjy.supabase.co/storage/v1/object/public/avatars/'+user.id+'/generated.png'}});client.rpc.mockResolvedValue({error:null});const response=await uploadAvatar(context(imageRequest()));expect(response.status).toBe(200);expect(client.storage.from).toHaveBeenCalledWith('avatars');expect(storage.upload.mock.calls[0][0]).toMatch(new RegExp('^'+user.id+'/[a-f0-9-]+\\.png$'));expect(storage.upload.mock.calls[0][2].upsert).toBe(false);expect(client.rpc).toHaveBeenCalledWith('lab_sync_profile',{p_avatar:expect.stringContaining('/avatars/'+user.id+'/')});});
 it('removes a newly uploaded file when profile synchronization fails',async()=>{storage.upload.mockResolvedValue({error:null});storage.getPublicUrl.mockReturnValue({data:{publicUrl:'https://ehldokmrgahrlcoyidjy.supabase.co/storage/v1/object/public/avatars/'+user.id+'/generated.png'}});client.rpc.mockResolvedValue({error:{message:'Failed'}});storage.remove.mockResolvedValue({error:null});const response=await uploadAvatar(context(imageRequest()));expect(response.status).toBe(503);expect(storage.remove).toHaveBeenCalledWith([storage.upload.mock.calls[0][0]]);});
});
