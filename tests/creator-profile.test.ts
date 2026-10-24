import { describe,it,expect,vi } from 'vitest';
import { badgeForAccess,badgeLabel } from '../src/lib/profile-badge';
import { avatarExtension,ownedAvatarPath } from '../src/lib/creator-profile';
import { POST } from '../src/pages/account/api/creator-profile';
const id='00000000-0000-0000-0000-000000000001';
const url=`https://fixture.supabase.co/storage/v1/object/public/profile-images/${id}/`;
function fixture(options:{saveError?:string;uploadError?:boolean;photo?:boolean}={}) {
 const upload=vi.fn().mockResolvedValue({error:options.uploadError?{}:null});
 const remove=vi.fn().mockResolvedValue({error:null});
 const upsert=vi.fn().mockResolvedValue({error:options.saveError?{code:options.saveError}:null});
 const bucket={upload,remove,getPublicUrl:()=>({data:{publicUrl:url+'new.png'}})};
 const client={from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{avatar_url:url+'old.png'},error:null})})}),upsert}),storage:{from:()=>bucket}};
 const form=new FormData();form.set('display_name','Creator');form.set('handle','creator');form.set('bio','Test bio');
 if(options.photo)form.set('avatar',new File([new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,0])],'photo.png',{type:'image/png'}));
 const context={locals:{supabase:client,user:{id},access:{active:true,verified:true,roles:[]}},request:new Request('https://example.test/account/api/creator-profile',{method:'POST',body:form})};
 return {context,upload,remove,upsert};
}
describe('trusted role badges',()=>{
 it('prioritizes gold for admins and green for every staff role',()=>{
  for(const role of ['writer','editor','publisher','moderator'])expect(badgeForAccess({active:true,verified:true,roles:[role]})).toBe('green');
  expect(badgeForAccess({active:true,verified:true,roles:['writer','admin']})).toBe('gold');
 });
 it('leaves readers, inactive and unconfirmed accounts unbadged, with blue disabled',()=>{
  expect(badgeForAccess({active:true,verified:true,roles:[]})).toBeNull();
  expect(badgeForAccess({active:false,verified:true,roles:['admin']})).toBeNull();
  expect(badgeForAccess({active:true,verified:false,roles:['admin']})).toBeNull();
  expect(badgeLabel('blue')).toBeNull();expect(badgeLabel('arbitrary')).toBeNull();
 });
});
describe('device photo uploads and creator setup',()=>{
 it('preserves the current photo and redirects to the completed profile',async()=>{
  const f=fixture();const response=await POST(f.context as any);
  expect(response.status).toBe(303);expect(response.headers.get('location')).toBe('/creator/creator');
  expect(f.upsert.mock.calls[0][0].avatar_url).toBe(url+'old.png');expect(f.upload).not.toHaveBeenCalled();
 });
 it('uploads a supported image without accepting a client verification badge',async()=>{
  const f=fixture({photo:true});const response=await POST(f.context as any);
  expect(response.headers.get('location')).toBe('/creator/creator');expect(f.upload).toHaveBeenCalledOnce();
  expect(f.upsert.mock.calls[0][0]).not.toHaveProperty('verification_badge');
 });
 it('cleans up the new image on a handle conflict and returns an editable error state',async()=>{
  const f=fixture({photo:true,saveError:'23505'});const response=await POST(f.context as any);
  expect(response.headers.get('location')).toContain('profile_error=taken');expect(f.remove).toHaveBeenCalledOnce();
 });
 it('keeps the previous profile untouched when storage fails',async()=>{
  const f=fixture({photo:true,uploadError:true});const response=await POST(f.context as any);
  expect(response.headers.get('location')).toContain('profile_error=upload');expect(f.upsert).not.toHaveBeenCalled();
 });
 it('rejects oversized/unsafe formats and never deletes another user or external image',()=>{
  expect(avatarExtension({type:'image/svg+xml',size:20})).toBeNull();
  expect(avatarExtension({type:'image/png',size:10485761})).toBeNull();
  expect(ownedAvatarPath('https://other.test/photo.png',url+'new.png',id)).toBeNull();
  expect(ownedAvatarPath(url+'abc.png',url+'new.png',id)).toBe(id+'/abc.png');
  expect(ownedAvatarPath(url+'abc.png',url+'new.png','someone-else')).toBeNull();
 });
});
