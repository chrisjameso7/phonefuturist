import { describe,it,expect,vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import CreatorProfileEditor from '../src/components/labs/CreatorProfileEditor';
import { POST } from '../src/pages/account/api/creator-profile';
function context(fields:Record<string,string>,error:unknown=null,accept='application/json'){
  const upsert=vi.fn().mockResolvedValue({error}),form=new FormData();for(const [k,v]of Object.entries(fields))form.set(k,v);
  return {ctx:{request:new Request('https://example.com/account/api/creator-profile',{method:'POST',headers:{Accept:accept},body:form}),locals:{user:{id:'owner'},supabase:{from:vi.fn(()=>({upsert}))}}} as any,upsert};
}
const fields={display_name:'Creator',handle:'creator',bio:'A short bio'};
describe('creator editing',()=>{
  it('opens in viewing mode with an Edit Profile action and no permanently expanded inputs',()=>{
    const html=renderToStaticMarkup(createElement(CreatorProfileEditor,{profile:{...fields,avatar_url:'https://example.com/existing.png'}}));
    expect(html).toContain('Edit Profile');expect(html).not.toContain('<form');expect(html).not.toContain('name="avatar_url"');
  });
  it('omits avatar columns from profile updates so uploads and existing images survive',async()=>{
    const {ctx,upsert}=context({...fields,avatar_url:'https://untrusted.example/new.png'});const response=await POST(ctx);
    expect(response.status).toBe(200);expect(upsert).toHaveBeenCalledWith({user_id:'owner',...fields},{onConflict:'user_id'});
    expect(await response.json()).toEqual({saved:true,handle:'creator'});
  });
  it('preserves validation and conflict errors for retrying an unsaved form',async()=>{
    const bad=context({...fields,handle:'x'});expect((await POST(bad.ctx)).status).toBe(400);expect(bad.upsert).not.toHaveBeenCalled();
    const conflict=context(fields,{code:'23505'});const response=await POST(conflict.ctx);expect(response.status).toBe(409);expect((await response.json()).error).toContain('already taken');
  });
  it('keeps HTML redirect compatibility and rejects anonymous writes',async()=>{
    const {ctx}=context(fields,null,'text/html');expect((await POST(ctx)).status).toBe(303);
    ctx.locals.user=null;expect((await POST(ctx)).status).toBe(401);
  });
});
