import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
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
