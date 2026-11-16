import test from 'node:test';
import assert from 'node:assert/strict';
import { limitedFile, limitedBytes } from '../supabase/functions/_shared/upload.ts';
import { publicStorageUrl } from '../supabase/functions/_shared/storage-url.ts';

test('browser Storage URLs preserve signed paths and query using configured origins', () => {
  const signed = 'http://kong:8000/storage/v1/object/sign/private/package.apk?token=signed&download=app.apk';
  assert.equal(publicStorageUrl(signed, 'http://kong:8000', 'http://127.0.0.1:54321'), 'http://127.0.0.1:54321/storage/v1/object/sign/private/package.apk?token=signed&download=app.apk');
  const hosted = 'https://project.supabase.co/storage/v1/object/sign/private/file?token=signed';
  assert.equal(publicStorageUrl(hosted, 'https://project.supabase.co'), hosted);
  assert.throws(() => publicStorageUrl('https://other.example/storage/v1/file', 'http://kong:8000', 'https://public.example'), /Unexpected/);
  assert.throws(() => publicStorageUrl(signed, 'http://kong:8000', 'file:///tmp'), /Invalid/);
});

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

test('raw APK bodies preserve bytes and reject declared and streamed excess', async () => {
  const input = new Uint8Array([80, 75, 3, 4]);
  assert.deepEqual(await limitedBytes(new Request('https://local.example/apk', { method: 'POST', body: input }), 4), input);
  await assert.rejects(limitedBytes(new Request('https://local.example/apk', { method: 'POST', body: input }), 3), /size limit/);
  await assert.rejects(limitedBytes(new Request('https://local.example/apk', { method: 'POST', headers: { 'content-length': '4' }, body: input.subarray(0, 2) }), 4), /Incomplete/);
});

test('oversized declared or chunked bodies are rejected and cancelled', async () => {
  await assert.rejects(limitedFile(new Request('https://local.example/upload', { method: 'POST', headers: { 'content-length': '2097152' }, body: 'x' }), 1), /size limit/);
  let cancelled = false;
  const body = new ReadableStream({ pull(controller) { controller.enqueue(new Uint8Array(65536)); }, cancel() { cancelled = true; } });
  const init: RequestInit & { duplex: 'half' } = { method: 'POST', body, duplex: 'half', headers: { 'content-type': 'multipart/form-data; boundary=test' } };
  await assert.rejects(limitedFile(new Request('https://local.example/upload', init), 1));
  assert.equal(cancelled, true);
});
