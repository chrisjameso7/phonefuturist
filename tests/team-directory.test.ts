import {PGlite} from '@electric-sql/pglite';
import {beforeAll,afterAll,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';

const db=new PGlite();
const admin='00000000-0000-4000-8000-000000000001';
const writer='00000000-0000-4000-8000-000000000002';
async function actor(id:string|null,aal='aal2'){
 await db.exec('reset role');
 await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify(id?{sub:id,session_id:id,aal}:{})]);
 await db.exec(id?'set role authenticated':'set role anon');
}
beforeAll(async()=>{
 await db.exec(`create role anon; create role authenticated; create schema auth; grant usage on schema auth to authenticated;
 create table auth.users(id uuid primary key,email_confirmed_at timestamptz,banned_until timestamptz);
 create table auth.sessions(id uuid primary key,user_id uuid);
 create table auth.mfa_factors(id uuid primary key,user_id uuid,status text);
 create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
 create function auth.uid() returns uuid language sql stable as $$select (auth.jwt()->>'sub')::uuid$$;`);
 await db.exec(readFileSync(new URL('../supabase/migrations/20260917132534_foundation_identity.sql',import.meta.url),'utf8'));
 await db.exec(readFileSync(new URL('../supabase/migrations/20260917184133_studio_editorial_core.sql',import.meta.url),'utf8'));
 // Existing creator identity relation is the sole dependency used by this migration.
 await db.exec('create table public.creator_profiles(user_id uuid primary key references auth.users(id));');
 await db.exec(readFileSync(new URL('../supabase/migrations/20261104073910_studio_team_directory.sql',import.meta.url),'utf8'));
 for(const [id,role]of [[admin,'admin'],[writer,'writer']]){
  await db.query('insert into auth.users values($1,now(),null)',[id]);
  await db.query('insert into auth.sessions values($1,$1)',[id]);
  await db.query('insert into private.role_grants(user_id,role) values($1,$2)',[id,role]);
  await db.query('insert into public.creator_profiles values($1)',[id]);
 }
 await db.query("insert into auth.mfa_factors values($1,$1,'verified')",[admin]);
},30000);
afterAll(async()=>db.close());

it('restricts management to authenticated admins with the required assurance',async()=>{
 await actor(writer);
 await expect(db.query("insert into public.team_members(slug,name,title) values('writer-test','Writer','Writer')")).rejects.toThrow();
 await actor(admin,'aal1');
 await expect(db.query("insert into public.team_members(slug,name,title) values('admin-test','Admin','Admin')")).rejects.toThrow();
 await actor(null);
 await expect(db.query("insert into public.team_members(slug,name,title) values('anonymous-test','Reader','Reader')")).rejects.toThrow();
});

it('keeps drafts private, validates public links and detects stale updates',async()=>{
 await actor(admin);
 const member=(await db.query<{id:string;version:number}>("insert into public.team_members(slug,name,title,social_links,extra_details) values('team-writer','Test Writer','Writer',$1,$2) returning id,version",[
  JSON.stringify([{label:'Website',url:'https://example.test/author'}]),
  JSON.stringify([{label:'Languages',value:'English'}])
 ])).rows[0];
 expect(member.version).toBe(1);
 await actor(null);
 expect((await db.query('select * from public.team_members')).rows).toHaveLength(0);
 expect((await db.query<{articles:unknown[]}>("select public.team_articles('team-writer') articles")).rows[0].articles).toEqual([]);
 await actor(admin);
 await expect(db.query("update public.team_members set social_links='[{\"label\":\"Bad\",\"url\":\"javascript:alert(1)\"}]' where id=$1",[member.id])).rejects.toThrow('Invalid social link');
 await db.query('update public.team_members set published=true,user_id=$2 where id=$1 and version=1',[member.id,writer]);
 expect((await db.query('update public.team_members set name=$2 where id=$1 and version=1 returning id',[member.id,'Stale writer'])).rows).toHaveLength(0);
 await actor(writer);
 expect((await db.query("update public.team_members set name='Unauthorized' returning id")).rows).toHaveLength(0);
 await actor(null);
 const published=(await db.query<{name:string;version:number}>('select name,version from public.team_members')).rows[0];
 expect(published).toEqual({name:'Test Writer',version:2});
});

it('shows only public articles belonging to the linked original author',async()=>{
 await db.exec('reset role');
 const article=(await db.query<{id:string}>("insert into private.articles(creator_id,canonical_path,published_at) values($1,'/news/team-fixture',now()) returning id",[writer])).rows[0];
 await db.query('insert into private.article_revisions(article_id,revision,created_by,payload) values($1,1,$2,$3)',[article.id,writer,JSON.stringify({title:'Published team article',section:'news',summary:'A public summary.',privateNotes:'SECRET_TEAM_MARKER'})]);
 await db.query('update private.articles set public_revision=1 where id=$1',[article.id]);
 await actor(null);
 const first=(await db.query<{articles:any[]}>("select public.team_articles('team-writer',0) articles")).rows[0].articles;
 expect(first).toHaveLength(1);
 expect(first[0].title).toBe('Published team article');
 expect(JSON.stringify(first)).not.toContain('SECRET_TEAM_MARKER');
 expect((await db.query<{articles:any[]}>("select public.team_articles('team-writer',30) articles")).rows[0].articles).toEqual([]);
 await db.exec('reset role');
 await db.query('update private.articles set withdrawn=true where id=$1',[article.id]);
 await actor(null);
 expect((await db.query<{articles:any[]}>("select public.team_articles('team-writer') articles")).rows[0].articles).toEqual([]);
});
