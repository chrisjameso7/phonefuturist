import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const db = new PGlite();
const member = '00000000-0000-0000-0000-000000000011';
const other = '00000000-0000-0000-0000-000000000012';
const session = '10000000-0000-0000-0000-000000000011';
const publicId = '20000000-0000-0000-0000-000000000011';
const unlistedId = '20000000-0000-0000-0000-000000000012';
const privateId = '20000000-0000-0000-0000-000000000013';

beforeAll(async () => {
  await db.exec(`
    create role anon; create role authenticated;
    create schema auth; grant usage on schema auth to authenticated;
    create table auth.users(id uuid primary key, email_confirmed_at timestamptz, banned_until timestamptz);
    create table auth.sessions(id uuid primary key, user_id uuid references auth.users(id));
    create table auth.mfa_factors(id uuid primary key, user_id uuid references auth.users(id), status text);
    create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(auth.jwt()->>'sub','')::uuid $$;
  `);
  await db.exec(readFileSync(new URL('../supabase/migrations/20260917132534_foundation_identity.sql', import.meta.url), 'utf8'));
  await db.exec(readFileSync(new URL('../supabase/migrations/20261006221000_interactive_leaks_community.sql', import.meta.url), 'utf8'));
  await db.query('insert into auth.users(id,email_confirmed_at) values ($1,now()),($2,now())', [member, other]);
  await db.query('insert into auth.sessions(id,user_id) values ($1,$2)', [session, member]);
  await db.query(
    `insert into public.simulations(id,owner_id,name,device_key,visibility,configuration_source,state)
     values
       ($1,$4,'Public build','device','public','custom','{}'),
       ($2,$4,'Unlisted build','device','unlisted','custom','{}'),
       ($3,$4,'Private build','device','private','custom','{}')`,
    [publicId, unlistedId, privateId, other],
  );
}, 30000);

afterAll(async () => { await db.close(); });

describe('Interactive Leaks sharing authorization', () => {
  it('does not enumerate unlisted or private simulations anonymously', async () => {
    await db.exec('reset role; set role anon');
    const rows = await db.query<{ id: string }>('select id from public.simulations order by id');
    expect(rows.rows.map(row => row.id)).toEqual([publicId]);
  });

  it('allows possession-link lookup for unlisted but not private simulations', async () => {
    await db.exec('reset role; set role anon');
    const unlisted = await db.query<{ value: any }>('select public.shared_simulation($1) as value', [unlistedId]);
    const hidden = await db.query<{ value: any }>('select public.shared_simulation($1) as value', [privateId]);
    expect(unlisted.rows[0].value.name).toBe('Unlisted build');
    expect(hidden.rows[0].value).toBeNull();
  });

  it('keeps authenticated table reads owner-scoped beyond public rows', async () => {
    await db.exec('reset role');
    await db.query("select set_config('request.jwt.claims', $1, false)", [JSON.stringify({ sub: member, session_id: session, aal: 'aal1' })]);
    await db.exec('set role authenticated');
    const rows = await db.query<{ id: string }>('select id from public.simulations order by id');
    expect(rows.rows.map(row => row.id)).toEqual([publicId]);
  });
});
