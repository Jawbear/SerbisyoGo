import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import test from 'node:test';
import { requireApprovedApk } from '../supabase/functions/releases/approval.ts';
import { verifyRelease } from '../.github/scripts/check-release.mjs';

const sha = 'a'.repeat(40);
const env = {
  GITHUB_SHA: sha, REVIEWED_SHA: sha, GITHUB_REF: 'refs/heads/main',
  GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_REPOSITORY: 'Jawbear/SerbisyoGo',
  GITHUB_RUN_ID: '200', ARTIFACT_RUN: '100'
};
const approved = [{state:'approved', environments:[{name:'cloudflare-production'}]}];
const run = {
  path: '.github/workflows/android-apk.yml', event: 'workflow_dispatch',
  head_repository: {full_name:env.GITHUB_REPOSITORY}, head_sha:sha,
  conclusion:'success', status:'completed'
};

test('release approval belongs to the environment, run, and reviewed checkout', () => {
  const check = (inputs, reviews) => verifyRelease('approval', 'cloudflare-production', inputs, sha, path => {
    assert.equal(path, 'runs/200/approvals');
    return reviews;
  });
  check(env, approved);
  for (const override of [{GITHUB_SHA:''}, {REVIEWED_SHA:''}, {REVIEWED_SHA:'b'.repeat(40)},
    {GITHUB_REF:'refs/heads/topic'}, {GITHUB_EVENT_NAME:'push'}]) {
    assert.throws(() => check({...env, ...override}, approved), /commit|SHA/);
  }
  for (const reviews of [[], [{...approved[0], state:'rejected'}],
    [{state:'approved', environments:[{name:'android-production'}]}]]) {
    assert.throws(() => check(env, reviews), /Missing environment approval/);
  }
});

test('reused APKs must come from an earlier successful Android run on the same source', () => {
  const check = (id, record) => verifyRelease('android-run', undefined, {...env, ARTIFACT_RUN:id}, sha, path => {
    assert.equal(path, 'runs/100');
    return record;
  });
  check('100', run);
  for (const id of ['', 'invalid', env.GITHUB_RUN_ID]) assert.throws(() => check(id, run), /run ID/);
  for (const override of [{path:'.github/workflows/other.yml'}, {event:'pull_request'},
    {head_repository:{full_name:'other/repo'}}, {head_sha:'b'.repeat(40)}, {status:'in_progress'}, {conclusion:'failure'}]) {
    assert.throws(() => check('100', {...run, ...override}), /successful Android workflow/);
  }
});

test('local release shortcuts require a stable published version or dry-run', () => {
  for (const [script,args,expected] of [
    ['scripts/deploy-cloudflare.mjs', ['--confirm'], /protected|reviewed/i],
    ['scripts/prepare-apk-push.mjs', [], /published Android version/],
    ['scripts/prepare-apk-push.mjs', ['0.5.8-rc.1'], /published Android version/]
  ]) {
    const result = spawnSync(process.execPath, [script, ...args], {encoding:'utf8'});
    assert.equal(result.status, 1);
    assert.match(result.stderr, expected);
  }
});

test('release upload accepts only the digest selected by the signing owner', () => {
  const digest = '12ab'.repeat(16);
  for (const configured of [undefined, '', 'invalid', '0'.repeat(64)]) {
    assert.throws(() => requireApprovedApk(digest, configured));
  }
  assert.doesNotThrow(() => requireApprovedApk(digest, digest.toUpperCase()));
});
