import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
const db = new PGlite(), user = '10000000-0000-4000-8000-000000000001', other = '10000000-0000-4000-8000-000000000002';
async function asUser(id = user, editor = false) { await db.exec('reset role'); await db.query("select set_config('request.uid',$1,false),set_config('request.editor',$2,false)", [id, String(editor)]); await db.exec('set role authenticated'); }
beforeAll(async () => {
    await db.exec(`
 create role anon;create role authenticated;
 create schema auth;create schema private;create schema storage;
 create table auth.users(id uuid primary key);
 insert into auth.users values ('${user}'),('${other}');
 create table public.profiles(user_id uuid primary key references auth.users(id),created_at timestamptz default now());
 insert into public.profiles(user_id) select id from auth.users;
 create table public.creator_profiles(user_id uuid primary key references auth.users(id),handle text,avatar_url text);
 insert into public.creator_profiles values ('${user}','first_user',null);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.uid',true),'')::uuid$$;
 create function private.current_access() returns jsonb language sql stable as $$select jsonb_build_object('active',true,'verified',true,'mfa_required',false,'aal','aal1')$$;
 create function private.has_capability(text) returns boolean language sql stable as $$select coalesce(current_setting('request.editor',true),'false')='true'$$;
 grant usage on schema auth,private,storage to authenticated,anon;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
 alter table storage.objects enable row level security;grant select,insert,update,delete on storage.objects to authenticated;
 create policy broad_existing_upload on storage.objects for insert to authenticated with check(true);
 create policy broad_existing_read on storage.objects for select to authenticated using(true);
 create policy broad_existing_update on storage.objects for update to authenticated using(true) with check(true);
 create function storage.foldername(text) returns text[] language sql immutable as $$select string_to_array($1,'/')$$;
 `);
    await db.exec(readFileSync('supabase/migrations/20261028145547_lab_ecosystem_expansion.sql', 'utf8'));
}, 30000);
afterAll(async () => { await db.close(); });
describe('Lab database boundaries', () => {
    let poll: string;
    it('preserves existing profile keys, mirrors identity and creates constrained public avatars', async () => { await db.exec('reset role'); const profile = await db.query<{
        id: string;
        user_id: string;
        username: string;
    }>('select id,user_id,username from profiles where user_id=$1', [user]); expect(profile.rows[0]).toEqual({ id: user, user_id: user, username: 'first_user' }); const bucket = await db.query<{
        public: boolean;
        file_size_limit: number;
    }>('select public,file_size_limit from storage.buckets'); expect(bucket.rows[0].public).toBe(true); expect(Number(bucket.rows[0].file_size_limit)).toBe(2097152); });
    it('allows only staff to create polls', async () => { await asUser(); await expect(db.query("select lab_create_poll('Choose a hinge',array['Teardrop','Flat'],now()+interval '1 day')")).rejects.toThrow(); await asUser(user, true); const result = await db.query<{
        id: string;
    }>("select lab_create_poll('Choose a hinge',array['Teardrop','Flat'],now()+interval '1 day') id"); poll = result.rows[0].id; });
    it('hides live percentages until voting and locks each user once', async () => { await db.exec('reset role;set role anon'); const hidden = await db.query<{
        data: Array<{
            percentages: unknown;
            total: number;
        }>;
    }>('select lab_vault() data'); expect(hidden.rows[0].data[0].percentages).toBeNull(); await asUser(); await db.query('select lab_lock_prediction($1,$2)', [poll, 'Teardrop']); await expect(db.query('select lab_lock_prediction($1,$2)', [poll, 'Flat'])).rejects.toThrow(); const visible = await db.query<{
        data: Array<{
            percentages: number[];
        }>;
    }>('select lab_vault() data'); expect(visible.rows[0].data[0].percentages).toEqual([100, 0]); await asUser(other); const blind = await db.query<{
        data: Array<{
            percentages: unknown;
        }>;
    }>('select lab_vault() data'); expect(blind.rows[0].data[0].percentages).toBeNull(); expect((await db.query('select * from concept_predictions')).rows).toHaveLength(0); });
    it('rejects vote tampering, arbitrary scores and badge assignment', async () => { await asUser(); await expect(db.query("update concept_predictions set score_awarded=1")).rejects.toThrow(); await expect(db.query("insert into user_badges(user_id,badge_name) values ($1,'Industry Oracle')", [user])).rejects.toThrow(); await expect(db.query('select lab_resolve_poll($1,$2,$3)', [poll, 'Teardrop', 'https://example.com/source'])).rejects.toThrow(); });
    it('enforces closed polls and awards the badge at 10 correct resolutions only', async () => {
        await asUser(user, true);
        await expect(db.query('select lab_resolve_poll($1,$2,$3)', [poll, 'Teardrop', 'https://example.com/source'])).rejects.toThrow();
        await db.exec('reset role');
        await db.query("update concept_polls set closes_at=now()-interval '1 second' where id=$1", [poll]);
        await asUser();
        await expect(db.query('select lab_lock_prediction($1,$2)', [poll, 'Flat'])).rejects.toThrow();
        await asUser(user, true);
        await db.query('select lab_resolve_poll($1,$2,$3)', [poll, 'Teardrop', 'https://example.com/source']);
        await expect(db.query('select lab_resolve_poll($1,$2,$3)', [poll, 'Flat', 'https://example.com/source'])).rejects.toThrow();
        for (let i = 0; i < 9; i++) {
            await db.exec('reset role');
            const r = await db.query<{
                id: string;
            }>("insert into concept_polls(prediction_topic,forks,closes_at) values ('Threshold poll',array['Yes','No'],now()-interval '1 second') returning id");
            await db.query("insert into concept_predictions(user_id,prediction_topic,selected_fork) values($1,$2,'Yes')", [user, r.rows[0].id]);
            await asUser(user, true);
            await db.query('select lab_resolve_poll($1,$2,$3)', [r.rows[0].id, 'Yes', 'https://example.com/source']);
            if (i < 8)
                expect((await db.query('select * from user_badges')).rows).toHaveLength(0);
        }
        expect((await db.query('select * from user_badges')).rows).toHaveLength(1);
    });
    it('scopes avatar storage paths to their owners', async () => { await asUser(); await db.query("insert into storage.objects(bucket_id,name) values('avatars',$1)", [user + '/photo.png']); await expect(db.query("insert into storage.objects(bucket_id,name) values('avatars',$1)", [other + '/photo.png'])).rejects.toThrow(); await expect(db.query('select lab_sync_profile($1)', ['https://ehldokmrgahrlcoyidjy.supabase.co/storage/v1/object/public/avatars/' + other + '/photo.png'])).rejects.toThrow(); await db.query('select lab_sync_profile($1)', ['https://ehldokmrgahrlcoyidjy.supabase.co/storage/v1/object/public/avatars/' + user + '/photo.png']); });
});
