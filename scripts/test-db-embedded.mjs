// Disposable PostgreSQL SQL/RLS tests without Docker. Supabase system-table
// shapes are emulated below; Auth HTTP, Storage HTTP and Edge runtimes still
// require the isolated Supabase workflow. No environment or hosted URL is read.
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { btree_gist } from '@electric-sql/pglite/contrib/btree_gist';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { pgtap } from '@electric-sql/pglite-pgtap';

const root = fileURLToPath(new URL('../', import.meta.url));
const sql = async path => (await readFile(path, 'utf8')).replace(/^\uFEFF/, '');
const db = await PGlite.create({ extensions: { btree_gist, pgcrypto, pgtap } });
let failures = 0;
let assertions = 0;
try {
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin bypassrls;
    create schema extensions;
    create schema auth;
    create schema storage;
    grant usage on schema public,extensions,auth,storage to anon,authenticated,service_role;
    set search_path=public,extensions;
    create extension pgtap with schema extensions;
    create table auth.users (
      id uuid primary key, email text, raw_user_meta_data jsonb not null default '{}',
      raw_app_meta_data jsonb not null default '{}', created_at timestamptz default now(),
      updated_at timestamptz default now(), deleted_at timestamptz,
      email_confirmed_at timestamptz, last_sign_in_at timestamptz
    );
    create function auth.uid() returns uuid language sql stable as $$
      select coalesce(nullif(current_setting('request.jwt.claim.sub',true),''),
        nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid
    $$;
    create table storage.buckets (
      id text primary key, name text not null, public boolean default false,
      file_size_limit bigint, allowed_mime_types text[]
    );
    create table storage.objects (
      id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id),
      name text not null, owner uuid, owner_id text
    );
    alter table storage.objects enable row level security;
    grant select on storage.objects to anon,authenticated;
    grant all on storage.buckets,storage.objects to service_role;
    create publication supabase_realtime;
  `);
  const migrations = (await readdir(join(root, 'supabase/migrations'))).filter(name => name.endsWith('.sql')).sort();
  for (const name of migrations) {
    await db.exec(await sql(join(root, 'supabase/migrations', name)));
    console.log(`MIGRATION ${name}`);
  }
  await db.exec(await sql(join(root, 'supabase/seed.sql')));
  const available = (await readdir(join(root, 'supabase/tests'))).filter(name => name.endsWith('.test.sql')).sort();
  const requested = process.argv.slice(2);
  if (requested.some(name => !available.includes(name))) throw new Error('Pass SQL test filenames from supabase/tests only.');
  for (const name of requested.length ? requested : available) {
    console.log(`TEST ${name}`);
    try {
      const results = await db.exec(await sql(join(root, 'supabase/tests', name)));
      for (const result of results) for (const row of result.rows) for (const value of Object.values(row)) {
        if (typeof value !== 'string') continue;
        for (const line of value.split('\n')) {
          if (/^(not ok|ok) \d+/.test(line)) assertions++;
          if (/^(not ok|# Looks like|Bail out!)/.test(line)) failures++;
          if (/^(not ok|ok|#|\d+\.\.)/.test(line)) console.log(line);
        }
      }
    } catch (error) {
      failures++;
      console.error(`FAIL ${name}: ${error.message}`);
      await db.exec('rollback; reset role;');
    }
  }
  if (!assertions) throw new Error('No pgTAP assertions executed.');
  console.log(`Embedded PostgreSQL: ${assertions} assertions, ${failures} failure markers. Supabase HTTP/runtime checks remain separate.`);
  if (failures) process.exitCode = 1;
} catch (error) {
  console.error(`Embedded database tests failed: ${error.message}`);
  process.exitCode = 1;
} finally { await db.close(); }
