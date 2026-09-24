import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
const db=new PGlite();
const ids={writer:'00000000-0000-0000-0000-000000000011',editor:'00000000-0000-0000-0000-000000000012',publisher:'00000000-0000-0000-0000-000000000013',admin:'00000000-0000-0000-0000-000000000014',stranger:'00000000-0000-0000-0000-000000000015',reader:'00000000-0000-0000-0000-000000000016'};
type Actor=keyof typeof ids;
const payload=(slug='test-report')=>({schemaVersion:1,title:'Test-only reporting fixture',summary:'Isolated database fixture.',byline:'Test writer',section:'news',slug,blocks:[{type:'paragraph',text:'Test evidence.'}],sources:[],privateNotes:'CONFIDENTIAL_TEST_MARKER',changeKind:'initial',correctionNote:''});
async function as(actor:Actor|'anon',aal='aal2') {
 await db.exec('reset role');
 if(actor==='anon'){await db.exec("select set_config('request.jwt.claims','{}',false); set role anon");return;}
 const id=ids[actor];await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({sub:id,session_id:id,aal})]);await db.exec('set role authenticated');
}
async function command(id:string|null,version:number|null,action:string,p:unknown={}){return (await db.query<{result:{id:string;version:number;path?:string}}>('select public.studio_command($1,$2,$3,$4::jsonb) result',[id,version,action,JSON.stringify(p)])).rows[0].result;}
async function publicRead(path:string|null=null){return (await db.query<{result:any[]}>('select public.public_articles($1,0) result',[path])).rows[0].result;}
beforeAll(async()=>{
 await db.exec(`create role anon; create role authenticated; create schema auth; grant usage on schema auth to authenticated;
 create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,banned_until timestamptz);
 create table auth.sessions(id uuid primary key,user_id uuid references auth.users(id));
 create table auth.mfa_factors(id uuid primary key,user_id uuid references auth.users(id),status text);
 create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
 create function auth.uid() returns uuid language sql stable as $$select (auth.jwt()->>'sub')::uuid$$;
 create schema storage; grant usage on schema storage to anon,authenticated;
 create table storage.objects(id integer generated always as identity,bucket_id text,name text,owner_id text);
 alter table storage.objects enable row level security;
 grant select,insert,update,delete on storage.objects to anon,authenticated;
 grant usage on sequence storage.objects_id_seq to anon,authenticated;
 -- Deliberately broad pre-existing policies: restrictive new policies must contain these.
 create policy legacy_upload on storage.objects for insert to authenticated with check(true);
 create policy legacy_read on storage.objects for select to public using(true);
 create policy legacy_update on storage.objects for update to authenticated using(true) with check(true);
 create policy legacy_delete on storage.objects for delete to authenticated using(true);`);
 for(const file of ['20260917132534_foundation_identity.sql','20260917132641_restrict_platform_trigger_execution.sql','20260917184133_studio_editorial_core.sql','20260918031640_fix_studio_list_alias.sql','20260918084405_privileged_mfa_exceptions.sql','20260923040000_studio_longform_optional_sources.sql','20260923143615_editorial_integrity_review.sql','20260924110530_simplify_publishing_and_studio_access.sql'])await db.exec(readFileSync(new URL('../supabase/migrations/'+file,import.meta.url),'utf8'));
 for(const [role,id] of Object.entries(ids)){
  await db.query("insert into auth.users values($1,$2,now(),null)",[id,id+'@example.test']);await db.query('insert into auth.sessions values($1,$1)',[id]);
  if(role!=='reader')await db.query('insert into private.role_grants values($1,$2,now())',[id,role==='stranger'?'writer':role]);
  if(['publisher','admin'].includes(role))await db.query("insert into auth.mfa_factors values($1,$1,'verified')",[id]);
 }
 await db.exec(readFileSync(new URL('../supabase/migrations/20260924111314_public_article_card_images.sql',import.meta.url),'utf8'));
},30000);
afterAll(async()=>db.close());
describe('current Studio publishing policy and historical integrity',()=>{
 it('atomically publishes without optional fields and rolls back failed publication',async()=>{
  await as('writer','aal1');
  const p={...payload(''),summary:'',byline:'',blocks:[{type:'image',url:'https://example.test/photo.png',text:''}]};
  const a=await command(null,null,'save_publish',p);expect(a.path).toMatch(/^\/news\/test-only-reporting-fixture-/);
  await as('stranger');await expect(command(a.id,2,'save_publish',p)).rejects.toThrow('STUDIO_FORBIDDEN');
  await as('writer');await expect(command(a.id,2,'save_publish',{...p,blocks:[]})).rejects.toThrow('Add article content');
  const current=(await db.query<any>('select public.studio_read($1,0) result',[a.id])).rows[0].result;
  expect(current.version).toBe(2);expect(current.revisions).toHaveLength(1);
  await command(a.id,2,'save_publish',{...p,title:'A revised headline'});
  await as('anon');expect((await publicRead(a.path!))[0].title).toBe('A revised headline');
 });
 it('only lets the primary Admin grant and revoke audited editorial roles',async()=>{
  await db.exec('reset role');await db.query('insert into private.access_policy values(true,$1)',[ids.admin]);
  await as('writer');await expect(db.query('select public.studio_access()')).rejects.toThrow('STUDIO_FORBIDDEN');
  await as('admin');
  await db.query('select public.studio_access($1,$2,false)',[ids.reader+'@example.test','publisher']);
  await expect(db.query('select public.studio_access($1,$2,false)',[ids.reader+'@example.test','admin'])).rejects.toThrow('Choose Writer');
  await as('reader','aal1');await command(null,null,'create',payload('new-publisher'));
  await expect(db.query('select public.studio_access()')).rejects.toThrow('STUDIO_FORBIDDEN');
  await as('admin');await db.query('select public.studio_access($1,$2,true)',[ids.reader+'@example.test','publisher']);
  await as('reader','aal1');await expect(command(null,null,'create',payload('revoked'))).rejects.toThrow('STUDIO_FORBIDDEN');
  await db.exec('reset role');expect((await db.query('select * from private.access_audit where subject_id=$1',[ids.reader])).rows).toHaveLength(2);
 });
 it('keeps drafts private and denies every cross-writer command',async()=>{
  await as('admin');expect(Array.isArray((await db.query<{result:any}>('select public.studio_read(null,0) result')).rows[0].result)).toBe(true);
  await as('writer');const a=await command(null,null,'create',payload());
  await expect(db.exec('select * from private.articles')).rejects.toThrow();
  await as('stranger');await expect(db.query('select public.studio_read($1,0)',[a.id])).rejects.toThrow('STUDIO_FORBIDDEN');
  for(const action of ['save','publish','withdraw','submit','approve','request_changes'])await expect(command(a.id,1,action,payload())).rejects.toThrow('STUDIO_FORBIDDEN');
  await as('anon');expect(await publicRead('/news/test-report')).toEqual([]);await expect(command(a.id,1,'publish')).rejects.toThrow();
 });
 it('allows direct own publication, immutable updates and persistent public correction history',async()=>{
  await as('writer');const p=payload('direct');const a=await command(null,null,'create',p);
  await command(a.id,1,'publish');await expect(command(a.id,1,'publish')).rejects.toThrow('STUDIO_CONFLICT');
  await as('anon');expect((await publicRead('/news/direct'))[0].title).toBe(p.title);
  expect(JSON.stringify(await publicRead('/news/direct'))).not.toContain('CONFIDENTIAL_TEST_MARKER');
  await as('writer');await command(a.id,2,'save',{...p,title:'Correction',slug:'different',changeKind:'correction',correctionNote:'Corrected the test evidence.'});
  await as('anon');expect((await publicRead('/news/direct'))[0].title).toBe(p.title);expect(await publicRead('/news/different')).toEqual([]);
  await as('writer');await command(a.id,3,'publish');
  await command(a.id,4,'save',{...p,title:'Later update',changeKind:'update',correctionNote:''});
  await command(a.id,5,'publish');
  await command(a.id,6,'save',{...p,title:'Minor style edit',changeKind:'minor'});await command(a.id,7,'publish');
  await as('anon');const published=(await publicRead('/news/direct'))[0];expect(published.public_notes[0].message).toBe('Corrected the test evidence.');
  await as('writer');await command(a.id,8,'withdraw',{reason:'Withdrawn for a test-only reason.'});
  await as('anon');expect((await publicRead('/news/direct'))[0]).toMatchObject({withdrawn:true,blocks:[],sources:[],public_notes:[]});
  await db.exec('reset role');const events=(await db.query<any>('select actor_id,previous_state,new_state from private.article_events where article_id=$1 and action=$2',[a.id,'publish'])).rows;
  expect(events[1]).toMatchObject({actor_id:ids.writer,previous_state:{public_revision:1},new_state:{public_revision:2}});
  expect((await db.query('select * from private.article_revisions where article_id=$1',[a.id])).rows).toHaveLength(4);
 });
 it('retains optional independent review and permits publication-wide editorial oversight',async()=>{
  await as('writer');const a=await command(null,null,'create',payload('review'));await command(a.id,1,'submit');
  await as('editor');await command(a.id,2,'request_changes',{reason:'Clarify the reporting.'});
  await as('writer');await command(a.id,3,'save',payload('review'));await command(a.id,4,'submit');
  await as('publisher','aal1');await command(a.id,5,'approve');await command(a.id,6,'publish');
  await as('editor');await command(a.id,7,'save',{...payload('review'),changeKind:'minor'});await command(a.id,8,'publish');
  await as('publisher');await command(a.id,9,'save',{...payload('review'),changeKind:'minor',title:'Publisher revision'});
  await command(a.id,10,'publish');
  await as('editor');const own=await command(null,null,'create',payload('self-review'));await command(own.id,1,'submit');
  await expect(command(own.id,2,'approve')).rejects.toThrow('STUDIO_SELF_APPROVAL');
  await command(own.id,2,'publish');
 });
 it('preserves image attribution and rich text in public projection with optional metadata',async()=>{
  await as('writer');const p={...payload('image'),blocks:[{type:'image',url:'https://example.test/image.webp',text:'',alt:'A test device',credit:'Photographer',sourceName:'Original source',sourceUrl:'https://example.test/source',rightsNote:'Used with permission'}, {type:'paragraph',text:'A linked claim',inline:[{text:'A ',bold:true},{text:'linked claim',href:'https://example.test/evidence'}]}]};
  const a=await command(null,null,'create',p);await command(a.id,1,'publish');
  await as('anon');const blocks=(await publicRead('/news/image'))[0].blocks;
  const card=(await publicRead()).find(item=>item.canonical_path==='/news/image');
  expect(card.card_image).toEqual({url:'https://example.test/image.webp',alt:'A test device'});expect(card.blocks).toEqual([]);
  expect(blocks[0]).toMatchObject({alt:'A test device',credit:'Photographer',sourceName:'Original source',sourceUrl:'https://example.test/source',rightsNote:'Used with permission'});
  expect(blocks[1].inline).toEqual(p.blocks[1].inline);
  await as('writer');const bad=await command(null,null,'create',{...payload('bad-image'),blocks:[{type:'image',url:'https://example.test/x.png',text:'',alt:''}]});
  await command(bad.id,1,'publish');
  await expect(command(null,null,'create',{...payload('bad-link'),blocks:[{type:'paragraph',text:'X',inline:[{text:'X',href:'javascript:alert(1)'}]}]})).rejects.toThrow('HTTPS');
 });
 it('denies unverified, banned, reader and AAL1 privileged access',async()=>{
  await as('reader');await expect(command(null,null,'create',payload('reader'))).rejects.toThrow('STUDIO_FORBIDDEN');
  await db.exec('reset role');await db.query('update auth.users set email_confirmed_at=null where id=$1',[ids.writer]);
  await as('writer');await expect(command(null,null,'create',payload('unverified'))).rejects.toThrow('STUDIO_FORBIDDEN');
  await db.exec('reset role');await db.query('update auth.users set email_confirmed_at=now() where id=$1',[ids.writer]);
  await as('admin','aal1');await expect(command(null,null,'create',payload('aal1'))).rejects.toThrow('STUDIO_FORBIDDEN');
 });
 it('prevents reader uploads, forged ownership paths, overwrites/deletes and public listing via direct Storage access',async()=>{
  await as('reader');await expect(db.query("insert into storage.objects(bucket_id,name) values('article-media',$1)",['articles/'+ids.reader+'/x.png'])).rejects.toThrow();
  await as('writer');await expect(db.query("insert into storage.objects(bucket_id,name) values('article-media',$1)",['articles/'+ids.stranger+'/x.png'])).rejects.toThrow();
  await db.query("insert into storage.objects(bucket_id,name) values('article-media',$1)",['articles/'+ids.writer+'/x.png']);
  expect((await db.query("update storage.objects set name='changed' where bucket_id='article-media' returning *")).rows).toEqual([]);
  expect((await db.query("delete from storage.objects where bucket_id='article-media' returning *")).rows).toEqual([]);
  await as('anon');expect((await db.query('select * from storage.objects')).rows).toEqual([]);
  await as('reader');expect((await db.query('select * from storage.objects')).rows).toEqual([]);
  await as('publisher','aal1');await db.query("insert into storage.objects(bucket_id,name) values('article-media',$1)",['articles/'+ids.publisher+'/x.png']);
 });
});
