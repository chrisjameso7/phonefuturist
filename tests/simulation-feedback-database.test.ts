import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
} from 'vitest';

const db = new PGlite();

const member =
  '00000000-0000-0000-0000-000000000011';
const session =
  '10000000-0000-0000-0000-000000000011';

async function authenticate(aal = 'aal1') {
  await db.exec('reset role');
  await db.query(
    "select set_config('request.jwt.claims', $1, false)",
    [
      JSON.stringify({
        sub: member,
        session_id: session,
        aal,
      }),
    ],
  );
  await db.exec('set role authenticated');
}

beforeAll(async () => {
  await db.exec(`
    create role anon;
    create role authenticated;

    create schema auth;
    grant usage on schema auth to authenticated;

    create table auth.users(
      id uuid primary key,
      email_confirmed_at timestamptz,
      banned_until timestamptz
    );

    create table auth.sessions(
      id uuid primary key,
      user_id uuid references auth.users(id)
    );

    create table auth.mfa_factors(
      id uuid primary key,
      user_id uuid references auth.users(id),
      status text
    );

    create function auth.jwt()
    returns jsonb
    language sql
    stable
    as $$
      select coalesce(
        nullif(
          current_setting(
            'request.jwt.claims',
            true
          ),
          ''
        ),
        '{}'
      )::jsonb
    $$;

    create function auth.uid()
    returns uuid
    language sql
    stable
    as $$
      select (auth.jwt()->>'sub')::uuid
    $$;
  `);

  await db.exec(
    readFileSync(
      new URL(
        '../supabase/migrations/20260917132534_foundation_identity.sql',
        import.meta.url,
      ),
      'utf8',
    ),
  );

  await db.query(
    'insert into auth.users(id, email_confirmed_at) values ($1, now())',
    [member],
  );

  await db.query(
    'insert into auth.sessions(id, user_id) values ($1, $2)',
    [session, member],
  );

  await db.exec(
    readFileSync(
      new URL(
        '../supabase/migrations/20261010094500_simulator_beta_feedback.sql',
        import.meta.url,
      ),
      'utf8',
    ),
  );
}, 30000);

afterAll(async () => {
  await db.close();
});

describe('simulator feedback RLS', () => {
  it('lets anonymous beta users submit but not enumerate reports', async () => {
    await db.exec('reset role; set role anon');

    await db.query(
      `
        insert into public.simulator_feedback(
          id,
          reference,
          category,
          message,
          simulator_mode,
          simulation_snapshot
        )
        values(
          $1,
          'PF-BETA-AAAAAAAA',
          'broken',
          'Something broke.',
          'advanced',
          '{"batteryMah":5700}'::jsonb
        )
      `,
      [
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      ],
    );

    await expect(
      db.query(
        'select * from public.simulator_feedback',
      ),
    ).rejects.toThrow();
  });

  it('lets signed-in users submit their own report but not read the table', async () => {
    await authenticate();

    await db.query(
      `
        insert into public.simulator_feedback(
          id,
          reference,
          user_id,
          category,
          message,
          simulator_mode,
          simulation_snapshot
        )
        values(
          $1,
          'PF-BETA-BBBBBBBB',
          $2,
          'wrong-result',
          'Charging estimate looks wrong.',
          'simple',
          '{"wiredChargingWatts":60}'::jsonb
        )
      `,
      [
        'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        member,
      ],
    );

    expect(
      (
        await db.query(
          'select * from public.simulator_feedback',
        )
      ).rows,
    ).toEqual([]);
  });

  it('lets verified editorial staff read and triage reports', async () => {
    await db.exec('reset role');

    await db.query(
      "insert into private.role_grants(user_id, role) values ($1, 'editor')",
      [member],
    );

    await authenticate();

    const before = await db.query<{
      reference: string;
      status: string;
    }>(
      `
        select reference, status
        from public.simulator_feedback
        order by reference
      `,
    );

    expect(before.rows).toHaveLength(2);

    await db.query(
      `
        update public.simulator_feedback
        set status = 'reviewing'
        where reference = 'PF-BETA-BBBBBBBB'
      `,
    );

    const after = await db.query<{
      status: string;
    }>(
      `
        select status
        from public.simulator_feedback
        where reference = 'PF-BETA-BBBBBBBB'
      `,
    );

    expect(after.rows[0].status).toBe(
      'reviewing',
    );
  });
});
