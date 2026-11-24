import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { deploymentProblems, isPublishableKey, publicHttpsOrigin } from '../scripts/deployment-readiness.mjs';

test('deployment rejects local origins, malformed keys and server-role keys', () => {
  for (const value of ['http://app.example.org', 'https://localhost', 'https://127.0.0.1', 'https://10.1.2.3', 'https://app.test', 'https://user:password@app.example.org', 'https://app.example.org/path']) assert.equal(publicHttpsOrigin(value), false, value);
  assert.equal(publicHttpsOrigin('https://app.example.org'), true);
  assert.equal(isPublishableKey('sb_publishable_test'), true);
  for (const role of ['anon', 'service_role']) {
    const key = `header.${Buffer.from(JSON.stringify({ role })).toString('base64url')}.signature`;
    assert.equal(isPublishableKey(key), role === 'anon');
  }
  for (const key of ['', 'garbage', 'sb_secret_private']) assert.equal(isPublishableKey(key), false);
});

test('deployment check fails for a missing build and missing configuration', () => {
  const root = mkdtempSync(join(tmpdir(), 'serbisyogo-preflight-'));
  try {
    const problems = deploymentProblems(root, {}, true);
    assert.ok(problems.some(value => value.includes('NEXT_PUBLIC_SITE_URL')));
    assert.ok(problems.some(value => value.includes('Missing exported route')));
    assert.ok(problems.some(value => value.includes('headers')));
    assert.ok(problems.some(value => value.includes('Email template')));
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('export validation checks the public values actually delivered to browsers', () => {
  const root = mkdtempSync(join(tmpdir(), 'serbisyogo-export-'));
  const env = {
    NEXT_PUBLIC_SUPABASE_URL: 'https://backend.example.org',
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_localtest',
    NEXT_PUBLIC_SITE_URL: 'https://web.example.org',
  };
  try {
    const chunks = join(root, 'out', '_next', 'static', 'chunks');
    mkdirSync(chunks, {recursive:true});
    const values = JSON.stringify(Object.values(env));
    writeFileSync(join(root, 'out', 'index.html'), values);
    writeFileSync(join(chunks, 'app.js'), JSON.stringify([env.NEXT_PUBLIC_SITE_URL, env.NEXT_PUBLIC_SUPABASE_URL]));
    const bindingProblems = () => deploymentProblems(root, env, true).filter(problem => problem.startsWith('Exported client JavaScript'));
    assert.equal(bindingProblems().length, 1);
    assert.match(bindingProblems()[0], /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
    writeFileSync(join(chunks, 'app.js'), values);
    assert.deepEqual(bindingProblems(), []);
  } finally {
    rmSync(root, {recursive:true, force:true});
  }
});
