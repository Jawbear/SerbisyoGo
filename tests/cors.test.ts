import test from 'node:test';
import assert from 'node:assert/strict';
import { corsHeaders } from '../supabase/functions/_shared/cors.ts';

test('file deletion preflight permits DELETE only for configured origins', () => {
  const request = new Request('https://api.example.test/functions/v1/files', {
    method: 'OPTIONS', headers: { origin: 'https://app.example.test', 'access-control-request-method': 'DELETE' }
  });
  const headers = corsHeaders(request, ' https://app.example.test, https://admin.example.test ');
  assert.equal(headers['Access-Control-Allow-Origin'], 'https://app.example.test');
  assert.ok(headers['Access-Control-Allow-Methods'].split(', ').includes('DELETE'));
  assert.equal(headers.Vary, 'Origin');
  assert.throws(() => corsHeaders(request, 'https://other.example.test'), /Origin is not allowed/);
  assert.throws(() => corsHeaders(request, ''), /Origin is not allowed/);
  assert.equal(corsHeaders(new Request(request.url), 'https://app.example.test')['Access-Control-Allow-Origin'], 'https://app.example.test');
});
