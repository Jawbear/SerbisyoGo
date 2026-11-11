import test from 'node:test';
import assert from 'node:assert/strict';
import { verificationEmailLink } from './local-inbox.ts';

const inbox = 'http://127.0.0.1:54324';
const backend = 'http://127.0.0.1:54321';
const link = `${backend}/auth/v1/verify?token=test-token&type=signup`;

test('Mailpit lookup selects the intended recipient and decodes the confirmation link', async () => {
  const fetcher: typeof fetch = async input => {
    const url = new URL(String(input));
    assert.equal(url.pathname, '/view/latest.html');
    assert.equal(url.searchParams.get('query'), 'to:registration@example.test');
    return new Response(`<a href="${link.replaceAll('&', '&amp;')}">Verify</a>`);
  };
  assert.equal(await verificationEmailLink(inbox, 'registration@example.test', backend, fetcher), link);
});

test('older Inbucket responses remain supported and an empty inbox can be polled', async () => {
  const fetcher: typeof fetch = async input => {
    const path = new URL(String(input)).pathname;
    if (path.startsWith('/view/')) return new Response('', { status: 404 });
    if (path === '/api/v1/mailbox/registration') return Response.json([{ id: 'message-1' }]);
    assert.equal(path, '/api/v1/mailbox/registration/message-1');
    return Response.json({ body: { html: `<a href="${link}">Verify</a>` } });
  };
  assert.equal(await verificationEmailLink(inbox, 'registration@example.test', backend, fetcher), link);
  assert.equal(await verificationEmailLink(inbox, 'registration@example.test', backend, async () => new Response('', { status: 404 })), null);
});

test('email checks refuse hosted endpoints before making a request', async () => {
  const fetcher: typeof fetch = async () => { throw new Error('Unexpected request'); };
  await assert.rejects(verificationEmailLink('https://mail.example.com', 'user@example.test', backend, fetcher), /local test endpoints/);
  await assert.rejects(verificationEmailLink(inbox, 'user@example.test', 'https://backend.example.com', fetcher), /local test endpoints/);
});

test('confirmation links cannot send the test browser to another authentication service', async () => {
  await assert.rejects(verificationEmailLink(inbox, 'user@example.test', backend, async () => new Response('<a href="https://other.example.com/auth/v1/verify?token=test">Verify</a>')), /outside the isolated/);
});
