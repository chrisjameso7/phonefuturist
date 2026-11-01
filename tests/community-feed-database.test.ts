import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import {beforeAll,afterAll,it,expect} from 'vitest';
const db=new PGlite();
const member='00000000-0000-0000-0000-000000000011';
const third='00000000-0000-0000-0000-000000000013';
const build='20000000-0000-4000-8000-000000000001';
const privateBuild='20000000-0000-4000-8000-000000000002';
let post:string;
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
 await db.exec(`create table public.user_badges(user_id uuid,badge_name text);alter table public.user_badges enable row level security;grant select on public.user_badges to anon,authenticated;create policy read_badges on public.user_badges for select using(true);`);
 await db.exec(migration('20261031201211_community_build_feed.sql'));
 await db.query('insert into auth.users(id,email_confirmed_at) values ($1,now())',[third]);
 await db.query("insert into public.creator_profiles(user_id,handle,display_name) values ($1,'third','Third')",[third]);
 await db.query("insert into auth.sessions(id,user_id) values ($1,$1),($2,$2),($3,$3)",[member,other,third]);
 await db.query("insert into public.simulations(id,owner_id,name,device_key,visibility,configuration_source) values ($1,$3,'Public','device','public','custom'),($2,$3,'Private','device','private','custom')",[build,privateBuild,member]);
},30000);
afterAll(async()=>{await db.close();});

async function asUser(id:string){await db.exec('reset role');await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({sub:id,session_id:id,aal:'aal1'})]);await db.exec('set role authenticated');}
it('only lets the owner post a public build and never accepts author or timestamp forgery',async()=>{
 await asUser(other);
 await expect(db.query('insert into public.community_posts(author_id,simulation_id) values ($1,$2)',[other,build])).rejects.toThrow();
 await asUser(member);
 await expect(db.query('insert into public.community_posts(author_id,simulation_id) values ($1,$2)',[member,privateBuild])).rejects.toThrow();
 await expect(db.query('insert into public.community_posts(author_id,simulation_id) values ($1,$2)',[other,build])).rejects.toThrow();
 await expect(db.query("insert into public.community_posts(author_id,simulation_id,created_at) values ($1,$2,now()-interval '1 year')",[member,build])).rejects.toThrow();
 post=(await db.query<{id:string}>('insert into public.community_posts(author_id,simulation_id,caption) values ($1,$2,$3) returning id',[member,build,'My build'])).rows[0].id;
});
it('supports likes, replies and follows without impersonation, duplicate counts or self-following',async()=>{
 await asUser(other);
 await db.query('insert into public.community_likes(post_id,user_id) values ($1,$2)',[post,other]);
 await expect(db.query('insert into public.community_likes(post_id,user_id) values ($1,$2)',[post,other])).rejects.toThrow();
 await expect(db.query('insert into public.community_likes(post_id,user_id) values ($1,$2)',[post,member])).rejects.toThrow();
 await db.query('insert into public.community_replies(post_id,author_id,body) values ($1,$2,$3)',[post,other,'What about cooling?']);
 await expect(db.query('insert into public.community_replies(post_id,author_id,body) values ($1,$2,$3)',[post,member,'Fake author'])).rejects.toThrow();
 await db.query('insert into public.community_follows(follower_id,following_id) values ($1,$2)',[other,member]);
 await expect(db.query('insert into public.community_follows(follower_id,following_id) values ($1,$1)',[other])).rejects.toThrow();
 await expect(db.query('insert into public.community_follows(follower_id,following_id) values ($1,$2)',[member,other])).rejects.toThrow();
 const people=await db.query<{value:any}>('select public.community_people(array[$1::uuid]) as value',[member]);
 expect(people.rows[0].value[0]).toMatchObject({followers:1,following:0,followed:true});
 const feed=await db.query<{value:any}>('select public.community_feed() as value');expect(feed.rows[0].value[0]).toMatchObject({likes:1,liked:true,replies:1});
});
it('denies anonymous writes and other users deleting content or mutating timestamps',async()=>{
 await db.exec('reset role;set role anon');
 expect((await db.query<{value:any}>('select public.community_feed() as value')).rows[0].value).toHaveLength(1);
 await expect(db.query('insert into public.community_posts(author_id,simulation_id) values ($1,$2)',[member,build])).rejects.toThrow();
 await asUser(third);
 expect((await db.query('delete from public.community_posts where id=$1 returning id',[post])).rows).toHaveLength(0);
 expect((await db.query('delete from public.community_replies returning id')).rows).toHaveLength(0);
 await expect(db.query("update public.community_posts set caption='edited' where id=$1",[post])).rejects.toThrow();
});
it('hides the entire conversation and counts when its build becomes private',async()=>{
 await db.exec('reset role');await db.query("update public.simulations set visibility='private' where id=$1",[build]);
 await asUser(other);
 expect((await db.query<{value:any}>('select public.community_feed() as value')).rows[0].value).toHaveLength(0);
 expect((await db.query('select * from public.community_replies')).rows).toHaveLength(0);
 expect((await db.query('select * from public.community_likes')).rows).toHaveLength(0);
 await expect(db.query('insert into public.community_replies(post_id,author_id,body) values ($1,$2,$3)',[post,other,'Private leak'])).rejects.toThrow();
 await db.exec('reset role');await db.query("update public.simulations set visibility='public' where id=$1",[build]);
});
it('rejects suspended users and enforces bounded text and reply rate limits',async()=>{
 await db.exec('reset role');await db.query("update private.accounts set status='suspended' where user_id=$1",[third]);await asUser(third);
 await expect(db.query('insert into public.community_follows(follower_id,following_id) values ($1,$2)',[third,member])).rejects.toThrow();
 await asUser(other);
 await expect(db.query('insert into public.community_replies(post_id,author_id,body) values ($1,$2,$3)',[post,other,'x'.repeat(601)])).rejects.toThrow();
 for(let i=0;i<4;i++)await db.query('insert into public.community_replies(post_id,author_id,body) values ($1,$2,$3)',[post,other,'Reply '+i]);
 await expect(db.query('insert into public.community_replies(post_id,author_id,body) values ($1,$2,$3)',[post,other,'Too many'])).rejects.toThrow();
});

it('publishes atomically and rolls back a new public build when its post fails',async()=>{
 await asUser(member);
 const before=(await db.query<{n:number}>('select count(*)::int as n from public.simulations')).rows[0].n;
 await expect(db.query('select public.community_create_post($1,$2::jsonb,null,$3)',['Invalid caption','{}','x'.repeat(1001)])).rejects.toThrow();
 expect((await db.query<{n:number}>('select count(*)::int as n from public.simulations')).rows[0].n).toBe(before);
 await expect(db.query('select public.community_publish($1,$2)',[privateBuild,'x'.repeat(1001)])).rejects.toThrow();
 expect((await db.query<{visibility:string}>('select visibility from public.simulations where id=$1',[privateBuild])).rows[0].visibility).toBe('private');
 await db.query('select public.community_create_post($1,$2::jsonb,null,$3)',['Shared 3D design','{"community_design":{"name":"My concept","width":76}}','Titanium concept']);
 expect((await db.query<{n:number}>('select count(*)::int as n from public.simulations')).rows[0].n).toBe(before+1);
});
