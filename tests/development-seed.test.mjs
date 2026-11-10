import test from 'node:test';
import assert from 'node:assert/strict';
import { developmentTarget, fixtureId } from '../scripts/seed-development.mjs';

test('development seed cannot target hosted projects without exact explicit confirmation', () => {
  const project = 'https://qkopbbxmeqqzomrawltf.supabase.co';
  assert.throws(() => developmentTarget(project));
  assert.throws(() => developmentTarget(project, 'another-project'));
  assert.equal(developmentTarget(project, 'qkopbbxmeqqzomrawltf'), project);
  for (const unsafe of [
    'http://qkopbbxmeqqzomrawltf.supabase.co',
    'https://qkopbbxmeqqzomrawltf.supabase.co.evil.example',
    'https://user:password@qkopbbxmeqqzomrawltf.supabase.co',
    `${project}/rest/v1/`, `${project}?redirect=elsewhere`, `${project}#fragment`,
    'file://localhost/private'
  ]) assert.throws(() => developmentTarget(unsafe, 'qkopbbxmeqqzomrawltf'));
  assert.equal(developmentTarget('http://127.0.0.1:54321'), 'http://127.0.0.1:54321');
});

test('fixture identity is stable for reruns and isolated across entities and projects', () => {
  const first = fixtureId('https://first.supabase.co', 'booking1');
  assert.match(first, /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-8[a-f0-9]{3}-[a-f0-9]{12}$/);
  assert.equal(first, fixtureId('https://first.supabase.co', 'booking1'));
  assert.notEqual(first, fixtureId('https://first.supabase.co', 'booking2'));
  assert.notEqual(first, fixtureId('https://second.supabase.co', 'booking1'));
});
