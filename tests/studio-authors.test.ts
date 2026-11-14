import {PGlite} from '@electric-sql/pglite';
import {beforeAll,afterAll,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
const db=new PGlite();
const id=(n:number)=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
async function actor(n:number|null){await db.exec('reset role');await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify(n?{sub:id(n),session_id:id(n),aal:'aal1'}:{})]);await db.exec(n?'set role authenticated':'set role anon');}
beforeAll(async()=>{
 await db.exec(`create role anon;create role authenticated;create schema auth;
 create table auth.users(id uuid primary key,email_confirmed_at timestamptz,banned_until timestamptz);
 create table auth.sessions(id uuid primary key,user_id uuid);
 create table auth.mfa_factors(id uuid primary key,user_id uuid,status text);
 create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
 create function auth.uid() returns uuid language sql stable as $$select (auth.jwt()->>'sub')::uuid$$;`);
 await db.exec(readFileSync(new URL('../supabase/migrations/20260917132534_foundation_identity.sql',import.meta.url),'utf8'));
 await db.exec('create table public.creator_profiles(user_id uuid primary key,display_name text,handle text);');
 await db.exec(readFileSync(new URL('../supabase/migrations/20261106082301_studio_author_directory.sql',import.meta.url),'utf8'));
 for(let n=1;n<=4;n++){
  await db.query('insert into auth.users values($1,$2,null)',[id(n),n===3?null:new Date()]);
  await db.query('insert into auth.sessions values($1,$1)',[id(n)]);
  await db.query('insert into public.creator_profiles values($1,$2,$3)',[id(n),'Person '+n,'person_'+n]);
 }
 await db.query("insert into private.role_grants(user_id,role) values($1,'writer'),($2,'moderator'),($3,'writer')",[id(1),id(2),id(3)]);
},30000);
afterAll(()=>db.close());
it('exposes only verified active author identities to authorized newsroom accounts',async()=>{
 await actor(1);
 const result=await db.query<{user_id:string;display_name:string;handle:string}>('select * from public.studio_authors()');
 expect(result.rows).toEqual([{user_id:id(1),display_name:'Person 1',handle:'person_1'}]);
 expect(Object.keys(result.rows[0])).toEqual(['user_id','display_name','handle']);
});
it('rejects anonymous, readers, moderators and unverified writers',async()=>{
 for(const n of [null,2,3,4]){await actor(n);await expect(db.query('select * from public.studio_authors()')).rejects.toThrow();}
});
it('does not change author roles or expose suspended author names',async()=>{
 await actor(null);await db.exec('reset role');await db.query("update private.accounts set status='suspended' where user_id=$1",[id(1)]);
 await actor(1);await expect(db.query('select * from public.studio_authors()')).rejects.toThrow();
});
