import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
const db = new PGlite();
const ids = { writer:'00000000-0000-0000-0000-000000000011', editor:'00000000-0000-0000-0000-000000000012', publisher:'00000000-0000-0000-0000-000000000013', admin:'00000000-0000-0000-0000-000000000014', stranger:'00000000-0000-0000-0000-000000000015' };
type Actor = keyof typeof ids;
const payload = (slug='test-report') => ({schemaVersion:1,title:'Test-only reporting fixture',summary:'This exists only in an isolated test database.',byline:'Test writer',section:'news',slug,blocks:[{type:'paragraph',text:'Test evidence.'}],sources:[{label:'Test source',url:'https://example.test/evidence',note:'Supports the test claim.'}],privateNotes:'CONFIDENTIAL_TEST_MARKER',changeKind:'initial',correctionNote:''});
async function as(actor: Actor | 'anon', aal='aal2') {
 await db.exec('reset role');
 if(actor==='anon'){await db.exec("select set_config('request.jwt.claims','{}',false); set role anon");return;}
 const id=ids[actor];await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({sub:id,session_id:id,aal})]);await db.exec('set role authenticated');
}
async function command(id:string|null,version:number|null,action:string,p:unknown={}) {return (await db.query<{result:{id:string;version:number;path?:string}}>('select public.studio_command($1,$2,$3,$4::jsonb) as result',[id,version,action,JSON.stringify(p)])).rows[0].result;}
async function publicRead(path:string|null=null){return (await db.query<{result:any[]}>('select public.public_articles($1,0) as result',[path])).rows[0].result;}
beforeAll(async()=>{
 await db.exec(`create role anon; create role authenticated; create schema auth; grant usage on schema auth to authenticated;
 create table auth.users(id uuid primary key,email_confirmed_at timestamptz,banned_until timestamptz);
 create table auth.sessions(id uuid primary key,user_id uuid references auth.users(id));
 create table auth.mfa_factors(id uuid primary key,user_id uuid references auth.users(id),status text);
 create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
 create function auth.uid() returns uuid language sql stable as $$select (auth.jwt()->>'sub')::uuid$$;`);
 for(const file of ['20260917132534_foundation_identity.sql','20260917132641_restrict_platform_trigger_execution.sql','20260917184133_studio_editorial_core.sql'])await db.exec(readFileSync(new URL('../supabase/migrations/'+file,import.meta.url),'utf8'));
 for(const [role,id] of Object.entries(ids)){
  await db.query('insert into auth.users values($1,now(),null)',[id]);await db.query('insert into auth.sessions values($1,$1)',[id]);
  await db.query("insert into private.role_grants values($1,$2,now())",[id,role==='stranger'?'writer':role]);
  if(['publisher','admin'].includes(role))await db.query("insert into auth.mfa_factors values($1,$1,'verified')",[id]);
 }
},30000);
afterAll(async()=>db.close());
describe('Studio publishing authorization and history',()=>{
 it('keeps drafts private, blocks another writer and direct private table writes',async()=>{
  await as('writer');const a=await command(null,null,'create',payload());
  await expect(db.exec('select * from private.articles')).rejects.toThrow();
  await as('stranger');await expect(db.query('select public.studio_read($1,0)',[a.id])).rejects.toThrow('STUDIO_FORBIDDEN');
  await expect(command(a.id,1,'save',payload())).rejects.toThrow('STUDIO_FORBIDDEN');
  await as('anon');expect(await publicRead()).toEqual([]);await expect(command(a.id,1,'publish')).rejects.toThrow();
 });
 it('requires sources, another editor, publisher MFA, and exact approved version',async()=>{
  await as('writer');const p=payload('workflow');const a=await command(null,null,'create',{...p,sources:[]});
  await expect(command(a.id,1,'submit')).rejects.toThrow('STUDIO_INVALID');
  await command(a.id,1,'save',p);await command(a.id,2,'submit');
  await expect(command(a.id,3,'publish')).rejects.toThrow('STUDIO_FORBIDDEN');
  await as('editor');await command(a.id,3,'request_changes',{reason:'Explain the source context.'});
  await as('writer');await command(a.id,4,'save',p);await command(a.id,5,'submit');
  await as('editor');await command(a.id,6,'approve');
  await as('publisher','aal1');await expect(command(a.id,7,'publish')).rejects.toThrow('STUDIO_FORBIDDEN');
  await as('publisher');await expect(command(a.id,6,'publish')).rejects.toThrow('STUDIO_CONFLICT');
  const live=await command(a.id,7,'publish');expect(live.path).toBe('/news/workflow');
  await expect(command(a.id,7,'publish')).rejects.toThrow('STUDIO_CONFLICT');
  await as('anon');const published=await publicRead('/news/workflow');expect(published[0].title).toBe(p.title);expect(JSON.stringify(published)).not.toContain('CONFIDENTIAL_TEST_MARKER');
  await as('writer');await command(a.id,8,'save',{...p,title:'Unreviewed change',slug:'changed-slug',changeKind:'correction',correctionNote:'Corrected the test-only statement.'});
  await as('anon');expect((await publicRead('/news/workflow'))[0].title).toBe(p.title);expect(await publicRead('/news/changed-slug')).toEqual([]);
  await as('writer');await command(a.id,9,'submit');await as('editor');await command(a.id,10,'approve');await as('publisher');await command(a.id,11,'publish');
  await as('anon');expect((await publicRead('/news/workflow'))[0].title).toBe('Unreviewed change');
  await as('publisher');await command(a.id,12,'withdraw',{reason:'This test article has been withdrawn.'});await as('anon');const withdrawn=(await publicRead('/news/workflow'))[0];expect(withdrawn.withdrawn).toBe(true);expect(withdrawn.blocks).toEqual([]);expect(withdrawn.sources).toEqual([]);
 });
 it('prevents self approval and audits explicit Admin override without bypassing validation',async()=>{
  await as('admin');const a=await command(null,null,'create',payload('override'));await command(a.id,1,'submit');
  await expect(command(a.id,2,'approve')).rejects.toThrow('STUDIO_SELF_APPROVAL');
  await expect(command(a.id,2,'override_publish',{reason:'short'})).rejects.toThrow('STUDIO_INVALID');
  await command(a.id,2,'override_publish',{reason:'Test emergency authorization for isolated fixture.'});
  const detail=(await db.query<{result:any}>('select public.studio_read($1,0) as result',[a.id])).rows[0].result;
  expect(detail.events[0].action).toBe('override_publish');expect(detail.events[0].message).toContain('Test emergency');
 });
 it('rejects unverified staff and unsafe structured links even through direct RPC',async()=>{
  await as('writer');await expect(command(null,null,'create',{...payload('unsafe'),blocks:[{type:'link',text:'Unsafe',url:'javascript:alert(1)'}]})).rejects.toThrow('STUDIO_INVALID');
  await db.exec('reset role');await db.query('update auth.users set email_confirmed_at=null where id=$1',[ids.writer]);await as('writer');await expect(command(null,null,'create',payload('unverified'))).rejects.toThrow('STUDIO_FORBIDDEN');
  await db.exec('reset role');await db.query('update auth.users set email_confirmed_at=now() where id=$1',[ids.writer]);
 });
});

