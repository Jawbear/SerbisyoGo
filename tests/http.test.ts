import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchWithTimeout } from '../src/lib/http.ts';

test('stalled requests abort and report a useful connection error', async t => {
  t.mock.method(globalThis, 'fetch', (_input: RequestInfo | URL, init: RequestInit) => new Promise((_resolve, reject) => {
    init.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
  }));
  await assert.rejects(fetchWithTimeout('https://example.test', {}, 10), /connection took too long/);
});

test('request cancellation preserves caller intent and response status', async t => {
  const controller = new AbortController();
  controller.abort(new Error('Navigation cancelled'));
  t.mock.method(globalThis, 'fetch', async (_input: RequestInfo | URL, init: RequestInit) => {
    if (init.signal?.aborted) throw init.signal.reason;
    return new Response('Unavailable', { status: 503 });
  });
  await assert.rejects(fetchWithTimeout('https://example.test', { signal: controller.signal }), /Navigation cancelled/);
  assert.equal((await fetchWithTimeout('https://example.test')).status, 503);
});
