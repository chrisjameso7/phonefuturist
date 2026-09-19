import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, expect, it } from 'vitest';
const db = new PGlite();
const james = '8c14cb89-6a24-4545-a52b-09019e4017f0';
const spygo = '8c18ef96-59d2-43b2-81a1-0d9dcc5113ce';
const summer = '584a7868-6854-49ae-8b62-e74518e4040f';
const outsider = '00000000-0000-0000-0000-000000000004';
const ids = [james,spygo,summer,outsider];
async function login(id: string, aal = 'aal1') {
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claims',$1,false)", [JSON.stringify({sub:id,session_id:id,aal,user_metadata:{mfa_exception:true}})]);
  await db.exec('set role authenticated');
}
async function allowed(role = 'admin') { return (await db.query<{ok:boolean}>('select private.has_capability($1) ok',[role])).rows[0].ok; }
const provisioning = readFileSync(new URL('../supabase/provision-approved-admin-exceptions.sql',import.meta.url),'utf8');
beforeAll(async () => {
  await db.exec(`create role anon; create role authenticated; create schema auth; grant usage on schema auth to authenticated;
  create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,banned_until timestamptz);
  create table auth.sessions(id uuid primary key,user_id uuid);
  create table auth.mfa_factors(id uuid primary key,user_id uuid,status text);
  create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
  create function auth.uid() returns uuid language sql stable as $$ select (auth.jwt()->>'sub')::uuid $$;`);
  for (const name of ['20260917132534_foundation_identity','20260917132641_restrict_platform_trigger_execution','20260918084405_privileged_mfa_exceptions']) {
    await db.exec(readFileSync(new URL(`../supabase/migrations/${name}.sql`,import.meta.url),'utf8'));
  }
  for(const id of ids) {
    await db.query('insert into auth.users values($1,$2,now(),null)',[id,`${id}@example.test`]);
    await db.query('insert into auth.sessions values($1,$1)',[id]);
    if(id!==spygo) await db.query("insert into private.role_grants(user_id,role) values($1,'admin')",[id]);
  }
  await db.exec(provisioning);
},30000);
afterAll(async()=>{await db.close();});
it('allows only provisioned admins at AAL1 without forging AAL2; normal admins/publishers still require MFA',async()=>{
  for(const id of [james,spygo,summer]) {
    await login(id); expect(await allowed()).toBe(true);
    const a = (await db.query<{a:{aal:string}}> ('select public.foundation_access() a')).rows[0].a;
    expect(a.aal).toBe('aal1');
  }
  await login(outsider); expect(await allowed()).toBe(false);
  await db.exec('reset role');
  await db.query("insert into private.role_grants(user_id,role) values($1,'publisher')",[outsider]);
  await login(outsider); expect(await allowed('publisher')).toBe(false);
  await db.exec('reset role'); await db.query("insert into auth.mfa_factors values($1,$1,'verified')",[outsider]);
  await login(outsider,'aal2'); expect(await allowed('publisher')).toBe(true);
});
it('cannot grant, reactivate, inspect or revoke exceptions as another user',async()=>{
  await login(summer);
  await expect(db.query('select public.manage_mfa_exceptions()')).rejects.toThrow('Primary administrator');
  await expect(db.query('select * from private.privileged_mfa_exceptions')).rejects.toThrow();
  await expect(db.query('update private.privileged_mfa_exceptions set revoked_at=null')).rejects.toThrow();
  await expect(db.query('insert into private.privileged_mfa_exceptions(user_id,reason,authorized_by) values($1,$2,$1)',[outsider,'Forged exemption'])).rejects.toThrow();
  await db.exec('reset role; set role anon');
  await expect(db.query('select public.manage_mfa_exceptions()')).rejects.toThrow();
});
it('keeps email, account, session and current-role checks for exempt users',async()=>{
  await db.exec('reset role'); await db.query('update auth.users set email_confirmed_at=null where id=$1',[spygo]);
  await login(spygo); expect(await allowed()).toBe(false);
  await db.exec('reset role'); await db.query('update auth.users set email_confirmed_at=now() where id=$1',[spygo]);
  await db.query("update private.accounts set status='suspended' where user_id=$1",[spygo]);
  await login(spygo); expect(await allowed()).toBe(false);
  await db.exec('reset role'); await db.query("update private.accounts set status='active' where user_id=$1",[spygo]);
  await db.query('delete from auth.sessions where user_id=$1',[spygo]);
  await login(spygo); expect(await allowed()).toBe(false);
  await db.exec('reset role'); await db.query('insert into auth.sessions values($1,$1)',[spygo]);
  await db.query("update private.role_grants set role='publisher' where user_id=$1",[spygo]);
  await login(spygo); expect(await allowed()).toBe(false); expect(await allowed('publisher')).toBe(false);
  await db.exec('reset role'); await db.query("update private.role_grants set role='admin' where user_id=$1",[spygo]);
});
it('revokes live, preserves history, and provisioning cannot reactivate or duplicate audit events',async()=>{
  await login(james);
  await db.query('select public.manage_mfa_exceptions($1,$2)',[summer,'Require MFA for this administrator']);
  await db.query('select public.manage_mfa_exceptions($1,$2)',[summer,'Repeated request is idempotent']);
  await login(summer); expect(await allowed()).toBe(false);
  await db.exec('reset role'); await db.exec(provisioning);
  expect((await db.query("select * from private.access_audit where action='mfa_exception_revoked'")).rows).toHaveLength(1);
  expect((await db.query("select * from private.access_audit where action='mfa_exception_granted'")).rows).toHaveLength(3);
  expect((await db.query("select * from private.access_audit where action='admin_granted'")).rows).toHaveLength(1);
  await login(summer); expect(await allowed()).toBe(false);
  await login(james); await db.query('select public.manage_mfa_exceptions($1,$2)',[james,'Primary administrator self revocation']);
  expect(await allowed()).toBe(false);
  await expect(db.query('select public.manage_mfa_exceptions()')).rejects.toThrow('Primary administrator');
});
it('honors expiry without a JWT refresh and uses UUID despite email changes',async()=>{
  await db.exec('reset role'); await db.query('update auth.users set email=$1 where id=$2',['changed@example.test',spygo]);
  await login(spygo); expect(await allowed()).toBe(true);
  await db.exec('reset role'); await db.query("update private.privileged_mfa_exceptions set expires_at=now()-interval '1 second' where user_id=$1",[spygo]);
  await login(spygo); expect(await allowed()).toBe(false);
});

