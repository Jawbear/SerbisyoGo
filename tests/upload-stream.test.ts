import test from 'node:test';
import assert from 'node:assert/strict';
import { limitedFile } from '../supabase/functions/_shared/upload.ts';

test('bounded multipart parsing preserves file bytes and metadata', async () => {
  const form = new FormData();
  form.set('kind', 'verification');
  form.set('verification_category', 'gov_id');
  form.set('file', new File([new Uint8Array([137, 80, 78, 71])], 'pixel.png', { type: 'image/png' }));
  const parsed = await limitedFile(new Request('https://local.example/upload', { method: 'POST', body: form }), 1024);
  assert.equal(parsed.get('verification_category'), 'gov_id');
  const file = parsed.get('file') as File;
  assert.equal(file.name, 'pixel.png');
  assert.deepEqual(new Uint8Array(await file.arrayBuffer()), new Uint8Array([137, 80, 78, 71]));
});

test('oversized declared or chunked bodies are rejected and cancelled', async () => {
  await assert.rejects(limitedFile(new Request('https://local.example/upload', { method: 'POST', headers: { 'content-length': '2097152' }, body: 'x' }), 1), /size limit/);
  let cancelled = false;
  const body = new ReadableStream({ pull(controller) { controller.enqueue(new Uint8Array(65536)); }, cancel() { cancelled = true; } });
  const init: RequestInit & { duplex: 'half' } = { method: 'POST', body, duplex: 'half', headers: { 'content-type': 'multipart/form-data; boundary=test' } };
  await assert.rejects(limitedFile(new Request('https://local.example/upload', init), 1));
  assert.equal(cancelled, true);
});
