import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// Actual PostgreSQL RLS execution with a minimal Auth schema fixture, not a substitute
// for hosted Supabase/PostgREST/MFA integration acceptance.
const db = new PGlite();
const member = '00000000-0000-0000-0000-000000000001';
const other = '00000000-0000-0000-0000-000000000002';
const session = '10000000-0000-0000-0000-000000000001';
async function authenticate(aal = 'aal1') {
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claims', $1, false)", [JSON.stringify({ sub: member, session_id: session, aal, user_metadata: { role: 'admin' } })]);
  await db.exec('set role authenticated');
}
async function access() { return (await db.query<{ value: { active: boolean; verified: boolean; roles: string[]; aal: string; mfa_required: boolean } }>('select public.foundation_access() as value')).rows[0].value; }
beforeAll(async () => {
  await db.exec(`
    create role anon; create role authenticated;
    create schema auth; grant usage on schema auth to authenticated;
    create table auth.users(id uuid primary key, email_confirmed_at timestamptz, banned_until timestamptz);
    create table auth.sessions(id uuid primary key, user_id uuid references auth.users(id));
    create table auth.mfa_factors(id uuid primary key, user_id uuid references auth.users(id), status text);
    create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
    create function auth.uid() returns uuid language sql stable as $$ select (auth.jwt()->>'sub')::uuid $$;
  `);
  await db.exec(readFileSync(new URL('../supabase/migrations/20260917132534_foundation_identity.sql', import.meta.url), 'utf8'));
  await db.exec(readFileSync(new URL('../supabase/migrations/20260917132641_restrict_platform_trigger_execution.sql', import.meta.url), 'utf8'));
  await db.query('insert into auth.users(id, email_confirmed_at) values ($1, now()), ($2, now())', [member, other]);
  await db.query('insert into auth.sessions(id, user_id) values ($1, $2)', [session, member]);
}, 30000);
afterAll(async () => { await db.close(); });
describe('database authorization', () => {
  it('ignores forged metadata and does not expose other profiles', async () => {
    await authenticate(); expect((await access()).roles).toEqual([]);
    const profiles = await db.query<{ user_id: string }>('select * from public.profiles');
    expect(profiles.rows.map(r => r.user_id)).toEqual([member]);
  });
  it('denies direct role escalation, profile inserts and private reads', async () => {
    await authenticate();
    await expect(db.query('insert into private.role_grants(user_id, role) values ($1, $2)', [member, 'admin'])).rejects.toThrow();
    await expect(db.query('insert into public.profiles(user_id) values ($1)', [other])).rejects.toThrow();
    await expect(db.query('select * from private.accounts')).rejects.toThrow();
  });
  it('denies anonymous access to access RPC', async () => {
    await db.exec('reset role; set role anon');
    await expect(db.query('select public.foundation_access()')).rejects.toThrow();
  });
  it('requires verified email and MFA for privileged capabilities', async () => {
    await db.exec('reset role');
    await db.query("insert into private.role_grants(user_id, role) values ($1, 'admin')", [member]);
    await authenticate(); expect((await access()).mfa_required).toBe(true);
    expect((await db.query<{ allowed: boolean }>("select private.has_capability('admin') as allowed")).rows[0].allowed).toBe(false);
    await db.exec('reset role');
    await db.query("insert into auth.mfa_factors values ('20000000-0000-0000-0000-000000000001', $1, 'verified')", [member]);
    await authenticate('aal2');
    expect((await db.query<{ allowed: boolean }>("select private.has_capability('admin') as allowed")).rows[0].allowed).toBe(true);
    await db.exec('reset role'); await db.query('update auth.users set email_confirmed_at = null where id = $1', [member]);
    await authenticate('aal2');
    expect((await db.query<{ allowed: boolean }>("select private.has_capability('admin') as allowed")).rows[0].allowed).toBe(false);
  });
  it('immediately denies suspended accounts and revoked sessions', async () => {
    await db.exec('reset role'); await db.query("update private.accounts set status = 'suspended' where user_id = $1", [member]);
    await authenticate('aal2'); expect((await access()).active).toBe(false);
    expect((await db.query('select * from public.profiles')).rows).toEqual([]);
    await db.exec('reset role'); await db.query("update private.accounts set status = 'active' where user_id = $1", [member]);
    await db.query('delete from auth.sessions where id = $1', [session]);
    await authenticate('aal2'); expect((await access()).active).toBe(false);
  });
  it('bootstraps only a verified active target and audits the grant once', async () => {
    await db.exec('reset role');
    const script = readFileSync(new URL('../supabase/bootstrap-admin.sql', import.meta.url), 'utf8')
      .replace('REPLACE_WITH_CONFIRMED_AUTH_USER_UUID', member);
    await db.query('delete from private.role_grants where user_id = $1', [member]);
    await expect(db.exec(script)).rejects.toThrow('Bootstrap requires');
    await db.query('update auth.users set email_confirmed_at = now() where id = $1', [member]);
    await db.query("update private.accounts set status = 'suspended' where user_id = $1", [member]);
    await expect(db.exec(script)).rejects.toThrow('Bootstrap requires');
    await db.query("update private.accounts set status = 'active' where user_id = $1", [member]);
    await db.exec(script); await db.exec(script);
    expect((await db.query("select role from private.role_grants where user_id = $1", [member])).rows).toEqual([{ role: 'admin' }]);
    expect((await db.query("select action from private.access_audit where subject_id = $1", [member])).rows).toEqual([{ action: 'admin_bootstrap' }]);
  });
});
