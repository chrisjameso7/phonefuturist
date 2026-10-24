import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { beforeAll,afterAll,it,expect } from 'vitest';
const db=new PGlite();
const owner='00000000-0000-0000-0000-000000000001',other='00000000-0000-0000-0000-000000000002';
async function actor(id:string|null){await db.exec('reset role');await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify(id?{sub:id,session_id:id}: {})]);await db.exec('set role '+(id?'authenticated':'anon'));}
beforeAll(async()=>{
 await db.exec(`create role anon;create role authenticated;create schema auth;grant usage on schema auth to anon,authenticated;
 create table auth.users(id uuid primary key,email_confirmed_at timestamptz,banned_until timestamptz);
 create table auth.sessions(id uuid primary key,user_id uuid);
 create table auth.mfa_factors(user_id uuid,status text);
 create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
 create function auth.uid() returns uuid language sql stable as $$ select (auth.jwt()->>'sub')::uuid $$;
 create schema storage;grant usage on schema storage to anon,authenticated;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(bucket_id text,name text);
 alter table storage.objects enable row level security;
 grant select,insert,update,delete on storage.objects to anon,authenticated;
 create function storage.foldername(text) returns text[] language sql immutable as $$ select string_to_array($1,'/') $$;
 create policy legacy_upload on storage.objects for insert to authenticated with check(true);
 create policy legacy_select on storage.objects for select using(true);
 create policy legacy_update on storage.objects for update to authenticated using(true) with check(true);
 create policy legacy_delete on storage.objects for delete to authenticated using(true);`);
 await db.exec(readFileSync(new URL('../supabase/migrations/20260917132534_foundation_identity.sql',import.meta.url),'utf8'));
 await db.exec(`create function private.touch_simulation_updated_at() returns trigger language plpgsql as $$begin new.updated_at=now();return new;end;$$;`);
 await db.exec(readFileSync(new URL('../supabase/migrations/20261006224500_creator_profiles.sql',import.meta.url),'utf8'));
 await db.exec(readFileSync(new URL('../supabase/migrations/20261024224715_creator_identity_badges_and_uploads.sql',import.meta.url),'utf8'));
 for(const id of [owner,other]){await db.query('insert into auth.users values($1,now(),null)',[id]);await db.query('insert into auth.sessions values($1,$1)',[id]);}
},30000);
afterAll(async()=>db.close());
it('derives public badges from grants and follows promotions and revocations',async()=>{
 await actor(owner);await db.query("insert into public.creator_profiles(user_id,handle,display_name) values($1,'creator','Creator')",[owner]);
 await expect(db.exec("update public.creator_profiles set verification_badge='gold'")).rejects.toThrow();
 await db.exec('reset role');
 await db.query("insert into private.role_grants(user_id,role) values($1,'writer')",[owner]);
 expect((await db.exec('select verification_badge from public.creator_profiles'))[0].rows[0].verification_badge).toBe('green');
 await db.query("insert into private.role_grants(user_id,role) values($1,'admin')",[owner]);
 await actor(null);expect((await db.exec('select verification_badge from public.creator_profiles'))[0].rows[0].verification_badge).toBe('gold');
 await expect(db.exec('select * from private.role_grants')).rejects.toThrow();
 await db.exec('reset role');await db.query('delete from private.role_grants where user_id=$1',[owner]);
 expect((await db.exec('select verification_badge from public.creator_profiles'))[0].rows[0].verification_badge).toBeNull();
});
it('removes badges when an account is restricted and prevents forged badge inserts',async()=>{
 await db.exec('reset role');await db.query("insert into private.role_grants(user_id,role) values($1,'admin')",[owner]);
 await db.query("update private.accounts set status='suspended' where user_id=$1",[owner]);
 expect((await db.exec('select verification_badge from public.creator_profiles'))[0].rows[0].verification_badge).toBeNull();
 await db.query("update private.accounts set status='active' where user_id=$1",[owner]);
 await actor(other);await expect(db.query("insert into public.creator_profiles(user_id,handle,display_name,verification_badge) values($1,'imposter','Imposter','gold')",[other])).rejects.toThrow();
});
it('keeps photos writable only in the active owner folder despite broader existing policies',async()=>{
 await actor(owner);await db.query("insert into storage.objects values('profile-images',$1)",[owner+'/photo.png']);
 await expect(db.query("insert into storage.objects values('profile-images',$1)",[other+'/photo.png'])).rejects.toThrow();
 await actor(other);expect((await db.exec("select * from storage.objects where bucket_id='profile-images'"))[0].rows).toHaveLength(0);
 expect((await db.exec("delete from storage.objects where bucket_id='profile-images' returning *"))[0].rows).toHaveLength(0);
 await actor(owner);expect((await db.exec("update storage.objects set name='changed' where bucket_id='profile-images' returning *"))[0].rows).toHaveLength(0);
 await actor(null);expect((await db.exec("select * from storage.objects where bucket_id='profile-images'"))[0].rows).toHaveLength(0);
});
