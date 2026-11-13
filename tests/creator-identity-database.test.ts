import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import {beforeAll,afterAll,it,expect} from 'vitest';
const db=new PGlite();
const member='00000000-0000-0000-0000-000000000011';
const other='00000000-0000-0000-0000-000000000012';
const migration=(name:string)=>readFileSync(new URL('../supabase/migrations/'+name,import.meta.url),'utf8');
beforeAll(async()=>{
 await db.exec(`create role anon;create role authenticated;create schema auth;
 grant usage on schema auth to anon,authenticated;
 create table auth.users(id uuid primary key,email_confirmed_at timestamptz,banned_until timestamptz);
 create table auth.sessions(id uuid primary key,user_id uuid references auth.users);
 create table auth.mfa_factors(id uuid primary key,user_id uuid references auth.users,status text);
 create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
 create function auth.uid() returns uuid language sql stable as $$select nullif(auth.jwt()->>'sub','')::uuid$$;`);
 await db.exec(migration('20260917132534_foundation_identity.sql'));
 await db.exec(migration('20261006221000_interactive_leaks_community.sql'));
 await db.exec(migration('20261006224500_creator_profiles.sql'));
 // The existing identity migration's remainder is unrelated Storage setup.
 await db.exec(migration('20261024224715_creator_identity_badges_and_uploads.sql').split('-- Unique object names')[0]);
 await db.exec('alter table public.profiles add column username text');
 await db.query('insert into auth.users(id,email_confirmed_at) values ($1,now()),($2,now())',[member,other]);
 await db.query('insert into public.creator_profiles(user_id,handle,display_name) values ($1,$2,$3),($4,$5,$6)',[member,'a'.repeat(21),'Legacy',other,'ab_test','Creator']);
 await db.exec(migration('20261031134500_public_creator_identity_badges.sql'));
},30000);
afterAll(async()=>{await db.close();});
it('keeps legacy handles and related identity rows while rejecting new invalid values',async()=>{
 await db.exec('reset role');
 await db.query('update public.creator_profiles set bio=$1,handle=handle where user_id=$2',['New bio',member]);
 for(const handle of ['Uppercase','ab','a'.repeat(21),'has space']){
  await expect(db.query('update public.creator_profiles set handle=$1 where user_id=$2',[handle,other])).rejects.toThrow();
  await expect(db.query('update public.profiles set username=$1 where user_id=$2',[handle,other])).rejects.toThrow();
 }
 await db.query('update public.profiles set username=$1 where user_id=$2',['valid_123',other]);
 expect((await db.query('select count(*)::int as n from public.creator_profiles')).rows).toEqual([{n:2}]);
});
it('keeps anonymous and authenticated creator search public without opening private profiles',async()=>{
 for(const role of ['anon','authenticated']){
  await db.exec('reset role;set role '+role);
  expect((await db.query("select handle from public.creator_profiles where handle >= 'ab_' and handle < 'ab_\uffff' and handle like 'ab\\_%' escape '\\' order by handle limit 12")).rows).toEqual([{handle:'ab_test'}]);
  if(role==='anon')await expect(db.query('select * from public.profiles')).rejects.toThrow();
  else expect((await db.query('select * from public.profiles')).rows).toHaveLength(0);
 }
 await db.exec('reset role');
 expect((await db.query("select indexname from pg_indexes where schemaname='public' and tablename='creator_profiles' and indexname='creator_profiles_handle_key'")).rows).toHaveLength(1);
});
it('derives badges from private grants and prevents a public client forging them',async()=>{
 await db.exec('reset role');
 await db.query("insert into private.role_grants(user_id,role) values ($1,'writer')",[other]);
 expect((await db.query('select verification_badge from public.creator_profiles where user_id=$1',[other])).rows).toEqual([{verification_badge:'green'}]);
 await db.query("insert into private.role_grants(user_id,role) values ($1,'admin')",[other]);
 expect((await db.query('select verification_badge from public.creator_profiles where user_id=$1',[other])).rows).toEqual([{verification_badge:'gold'}]);
 await db.exec('set role authenticated');
 await expect(db.query("update public.creator_profiles set verification_badge='gold'")).rejects.toThrow();
 await db.exec('reset role');await db.query('delete from private.role_grants where user_id=$1',[other]);
 expect((await db.query('select verification_badge from public.creator_profiles where user_id=$1',[other])).rows).toEqual([{verification_badge:null}]);
});
